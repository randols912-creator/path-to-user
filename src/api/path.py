import sys, os, time
from sanic.log import logger
from api.geni import GeniClientAsync
from api.profile import ProfileManager
from api.models import CURRENT_TIMESTAMP, paths_table, profiles_table
from sqlalchemy import and_, select, join, func, distinct, delete, true
from databases import Database
import asyncio
from asyncio import Queue, sleep as asyncio_sleep
import datetime
import traceback

# How long we keep re-asking Geni about one profile before writing it off.
#
# Geni's path-to endpoint is ASYNCHRONOUS: it answers `status: pending` and
# computes the path in the background, so the only way to get an answer is to
# ask again later. The old 30s budget was far shorter than Geni often takes,
# so a profile whose path was still being computed got written to the DB as
# step_count=0 - indistinguishable from "definitely not related" - and, because
# the enqueuer skips targets that already have a row, it was never retried.
PENDING_TIMEOUT = int(os.environ.get('PENDING_TIMEOUT', 600))
PATH_FIND_BATCH = int(os.environ.get('PATH_FIND_BATCH', 10))

# Exponential backoff between re-polls of a still-pending profile. The old code
# re-polled roughly twice a second, so a single stuck profile could burn ~60 of
# our rate-limited requests inside its 30s window. Multiply that by a whole
# project and the retries consume the entire quota, first attempts never get
# through, and the run appears to hang. With backoff the same profile costs
# about a dozen requests spread over ten minutes.
PENDING_BACKOFF_BASE = float(os.environ.get('PENDING_BACKOFF_BASE', 5))
PENDING_BACKOFF_MAX = float(os.environ.get('PENDING_BACKOFF_MAX', 60))

# Sleeping re-queue tasks, tracked so a new search can cancel them (otherwise a
# backed-off batch from the PREVIOUS target wakes up after the queues have been
# drained and quietly re-populates them).
_REQUEUE_TASKS = set()


def _backoff_delay(attempts: int) -> float:
    return min(PENDING_BACKOFF_MAX, PENDING_BACKOFF_BASE * (2 ** max(0, attempts - 1)))


def cancel_pending_requeues():
    """Drop any batches that are waiting out a backoff. Returns how many."""
    cancelled = 0
    for t in list(_REQUEUE_TASKS):
        if not t.done():
            t.cancel()
            cancelled += 1
    _REQUEUE_TASKS.clear()
    return cancelled


async def _requeue_after(queue, priority, pending_list, delay, log_prefix):
    """Put a backed-off batch back on the queue WITHOUT holding up a worker.

    The worker used to `await sleep(0.5)` and then re-queue inline, which meant
    the pause was paid by the worker itself - it sat idle instead of picking up
    fresh profiles. Now the wait happens in its own little task and the worker
    goes straight back to work.
    """
    try:
        await asyncio_sleep(delay)
        await queue.put((priority, pending_list))
        logger.info(f"{log_prefix} Re-queued {len(pending_list)} pending tasks "
                    f"after {delay:.1f}s backoff, queue size: {queue.qsize()}")
    except asyncio.CancelledError:
        logger.info(f"{log_prefix} Dropped {len(pending_list)} backed-off tasks (search reset)")
        raise
    finally:
        _REQUEUE_TASKS.discard(asyncio.current_task())

class Task:
    def __init__(self, data: dict, priority: int) -> None:
        self.data = data
        self.priority = priority

    def __lt__(self, other):
        return self.priority < other.priority


class PathManager:
    def __init__(self, database: Database, geni: GeniClientAsync, token: str):
        self.geni = geni
        self.database = database
        self.token = token

        self.profile_mgr = ProfileManager(database, geni, token)
        # self.source_profile, self.token = geni.get_profile_details(token)

    async def find(self, source_id: str, target_id: str):

        # First, save source profile to DB (if not saved yet). TODO: save outside of PathFinder
        # self._save_profile(session, self.source_profile)
        # Call Geni API to find path between source and target profiles
        result, self.token = await self.geni.get_path_to(source_id, target_id, self.token)

        logger.debug("[{}] Status for {} -> {}".format(os.getpid(), target_id, result.get('status')))
        # Save resulted path (or its pending status) to DB
        pending = result.get('status') == 'pending' or result['is_success'] == False
        # Pending can be changed by timeout during save
        pending = await self._save_path(source_id, target_id, result, pending=pending)

        return pending

    # path-to answers with one of: pending | done | overloaded | not found.
    # 'overloaded' arrives as a normal HTTP 200 with no relations, so the old
    # `status == 'pending' or not is_success` test let it straight through and
    # recorded the profile as step_count=0, i.e. "no relation found" - a wrong
    # answer that then stuck, because the enqueuer skips targets that already
    # have a row. Both statuses mean "ask again later".
    UNRESOLVED_STATUSES = ('pending', 'overloaded')

    async def find_batch(self, task_list):
        # Resolve each task's path independently and save it to the DB as
        # soon as ITS OWN Geni call completes, instead of awaiting
        # asyncio.gather() over the whole batch. Previously one slow/stuck
        # profile (now capped by the Geni client's timeout) delayed every
        # other - even already-finished - result in the same batch from
        # ever reaching the database, which made progress look chunky/stalled
        # to the frontend even though most of the batch was actually done.
        u2u_list = []
        pending_list = []

        async def _resolve(task):
            data = task.data
            source_id = data['source_id']
            target_id = data['target_id']
            is_user2user = data.get('is_user2user', False)
            pending_ts = data.get('pending_ts')
            token = data.get('token')
            try:
                result, _ = await self.geni.get_path_to(source_id, target_id, token)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception(f"[{os.getpid()}] Exception resolving {source_id} -> {target_id}")
                result = {'is_success': False, 'retryable': True,
                          'internal_errors': ['exception in get_path_to']}
            return task, source_id, target_id, is_user2user, pending_ts, result

        for coro in asyncio.as_completed([_resolve(task) for task in task_list]):
            task, source_id, target_id, is_user2user, pending_ts, result = await coro
            geni_status = result.get('status')
            logger.debug("[{}] Status for {} -> {}".format(os.getpid(), target_id, geni_status))

            unresolved = (geni_status in self.UNRESOLVED_STATUSES) \
                or not result.get('is_success') \
                or result.get('retryable', False)
            timed_out = self._is_pending_timeout(pending_ts)

            if unresolved and not timed_out:
                if not task.data.get('pending_ts'):
                    task.data['pending_ts'] = datetime.datetime.now()
                task.data['attempts'] = task.data.get('attempts', 0) + 1
                task.data['not_before'] = time.monotonic() + _backoff_delay(task.data['attempts'])
                pending_list.append(task)
                continue

            if unresolved and timed_out:
                # Record the give-up explicitly instead of letting it look like a
                # clean "no relation" result, so incomplete runs are diagnosable.
                logger.warning(
                    f"[{os.getpid()}] Giving up on {source_id} -> {target_id} after "
                    f"{PENDING_TIMEOUT}s / {task.data.get('attempts', 0)} attempts "
                    f"(last Geni status: {geni_status or result.get('api_errors') or result.get('internal_errors')})")

            # A profile with no path is written as step_count=0, which on its own
            # cannot tell "Geni searched and said `not found`" apart from "we ran
            # out of patience". Those need very different follow-ups - the first
            # is the right answer, the second is unfinished business - so stash
            # the outcome in the (otherwise unused) relations column for
            # zero-step rows. No schema change needed; see /admin/run-status.
            outcome = None
            if not result.get('step_count'):
                outcome = {
                    'outcome': 'gave_up' if unresolved else (geni_status or 'no_path'),
                    'geni_status': geni_status,
                    'attempts': task.data.get('attempts', 0) + (0 if unresolved else 1),
                }

            values = {
                'source_id': source_id,
                'target_id': target_id,
                'is_user2user': is_user2user,
                'url': result.get('url', ''),
                'step_count': result.get('step_count', 0),
                'relationship': result.get('relationship', '')[:250],
                'relations': outcome if outcome is not None else result.get('relations', ''),
                'updated_on': CURRENT_TIMESTAMP,
                'finished_on': CURRENT_TIMESTAMP
            }
            # A retry is replacing a row we previously gave up on - drop the old
            # one first so the pair does not end up with two rows.
            if task.data.get('is_retry'):
                await self.database.execute(
                    delete(paths_table).where(
                        and_(paths_table.c.source_id == source_id,
                             paths_table.c.target_id == target_id)))
            # Written immediately so a fast result is visible to the frontend
            # right away, instead of waiting on the slowest task in the batch.
            await self.database.execute(paths_table.insert().values(values))

            if values['step_count'] > 0 and values['is_user2user']:
                u2u_list.append(values)

        return u2u_list, pending_list


    async def get(self, source_id: str, target_id: str):
        query = paths_table.select().where(
            and_(paths_table.c.source_id == source_id, paths_table.c.target_id == target_id))
        path = await self.database.fetch_one(query=query)
        return path

    @staticmethod
    def _gave_up(path_row) -> bool:
        """Did this row come from running out of patience rather than an answer?"""
        try:
            rel = path_row['relations']
            return isinstance(rel, dict) and rel.get('outcome') == 'gave_up'
        except Exception:
            return False

    async def is_resolved(self, source_id: str, target_id: str):
        """True if we already have a real answer for this pair.

        The enqueuer used to skip ANY target that had a row, which meant a
        profile we'd given up on was never looked at again - not on this run,
        not on the next one. Now a give-up is treated as unfinished business,
        so simply searching again picks up exactly the stragglers.
        """
        path = await self.get(source_id, target_id)
        if not path:
            return False
        return not self._gave_up(path)

    async def outcome_summary(self, source_id: str, user2user=False):
        """Breakdown of how each profile in a run actually ended up."""
        query = paths_table.select().where(
            and_(paths_table.c.source_id == source_id,
                 paths_table.c.is_user2user == user2user))
        rows = await self.database.fetch_all(query=query)
        summary = {'total_rows': len(rows), 'connected': 0,
                   'no_path_found': 0, 'gave_up': 0, 'other': 0}
        for r in rows:
            if (r['step_count'] or 0) > 0:
                summary['connected'] += 1
                continue
            rel = r['relations'] if isinstance(r['relations'], dict) else {}
            oc = rel.get('outcome')
            if oc == 'gave_up':
                summary['gave_up'] += 1
            elif oc in ('not found', 'no_path', 'done'):
                summary['no_path_found'] += 1
            else:
                # Rows written before this bookkeeping existed.
                summary['other'] += 1
        return summary

    async def get_paths(self, source_id: str,
                        offset: int,
                        limit: int,
                        connected_only=True,
                        ready_only=False,
                        target_id=None,
                        user2user=False):
        j = join(profiles_table, paths_table,
                 profiles_table.c.id == paths_table.c.target_id)
        step_count_cond = (paths_table.c.step_count >
                           0) if connected_only else true()
        ready_only_cond = paths_table.c.finished_on != None if ready_only else true()
        target_id_cond = paths_table.c.target_id == target_id if target_id else true()
        query = select(paths_table.c.source_id,
                        paths_table.c.target_id,
                        paths_table.c.url,
                        paths_table.c.step_count,
                        profiles_table.c.bh_theme,
                        profiles_table.c.bh_location,
                        profiles_table.c.bh_floor,
                        profiles_table.c.details.label("target_profile")).select_from(j) \
            .where(
            and_(paths_table.c.source_id == source_id,
                 paths_table.c.is_user2user == user2user,
                 step_count_cond,
                 ready_only_cond,
                 target_id_cond))\
            .order_by(paths_table.c.finished_on).offset(offset)

        if limit:
            query = query.limit(limit)

        paths = await self.database.fetch_all(query=query)
        return paths


    async def count_paths(self, source_id: str, connected_only=True, user2user=False):
        step_count_cond = (paths_table.c.step_count >
                           0) if connected_only else true()
        query = select(func.count(distinct(paths_table.c.target_id))).where(
            and_(paths_table.c.source_id == source_id,
                 paths_table.c.is_user2user == user2user,
                 step_count_cond)
        )
        count = await self.database.fetch_one(query=query)
        return count[0]

    async def clear_paths(self, source_id: str, user2user=False):
        query = delete(paths_table).where(and_(paths_table.c.source_id == source_id,
                                                paths_table.c.is_user2user == user2user))
        return await self.database.execute(query=query)


    async def clear_expired_paths(self):
        # Delete u2p paths after 3 days
        await self._clear_expired_paths(24*3, False)


    async def _clear_expired_paths(self, expired_hours, user2user):

        expired_ts = datetime.datetime.now() - datetime.timedelta(hours=expired_hours)
        query = delete(paths_table).where(and_(paths_table.c.updated_on < expired_ts,
                                                paths_table.c.is_user2user == user2user))
        return await self.database.execute(query=query)


    async def _save_profile(self, profile):
        query = profiles_table.select().where(profiles_table.c.id==profile['id'])
        profile_db = await self.database.fetch_one(query=query)
        if not profile_db:
            query = profiles_table.insert().values({'name': profile['name'],
                                                    'id': profile['id'],
                                                    'url': profile['url']})
            await self.database.execute(query)

    async def _save_path(self, source_id, target_id, result, pending: bool):
        path = await self.get(source_id, target_id)

        values = {
            'source_id': source_id,
            'target_id': target_id,
            'url': result.get('url', ''),
            'step_count': result.get('step_count', 0),
            'relationship': result.get('relationship', ''),
            'relations': result.get('relations', ''),
            'updated_on': CURRENT_TIMESTAMP
        }
        logger.debug("values: ", values)

        # Checking pending timeout
        if path and pending and self._is_pending_timeout(path):
            pending = False

        if not pending:
            values['finished_on'] = CURRENT_TIMESTAMP

        # Insert or update
        if not path:
            values['is_user2user'] = await self.is_user2user(source_id, target_id) # needed only on insert
            query = paths_table.insert().values(values)
        else:
            values['is_user2user'] = path['is_user2user']
            query = paths_table.update().where(paths_table.c.id==path['id']).values(values)
        logger.debug(query)
        await self.database.execute(query)

        # Communicate found user2user connection via the queue to the main task
        if values['step_count'] > 0 and values['is_user2user'] and self.user2user_result_queue:
            await self.user2user_result_queue.put(values)

        return pending

    async def is_user2user(self, source_id, target_id):
        for profile_id in [target_id, source_id]:  # target id is usually personality id, so start with it
            profile = await self.profile_mgr.get(profile_id)
            if not profile.is_user:
                return False
        return True

    @staticmethod
    def _is_pending_timeout(timestamp):
        if not timestamp: return False
        is_pending_timeout = (datetime.datetime.now() - timestamp).total_seconds()  > PENDING_TIMEOUT
        return is_pending_timeout


async def path_finder_async(number, queue, user2user_result_queue, db_url, geni):
    logger.info(f"Starting process: {number}")
    log_prefix = f"W{os.getpid()}:P{number}"
    cycles = 0
    async with Database(db_url) as database:
        while True:
            logger.info(f"{log_prefix} Waiting for the next tasks")
            priority,task_or_list = await queue.get()
            if isinstance(task_or_list, Task):
                task_or_list = [task_or_list]
            logger.info(f"{log_prefix} Received  {len(task_or_list)} tasks, queue size: {queue.qsize()}")

            # since values insertion ordered
            try:
                pm = PathManager(database, geni, None)
                u2u_list,pending_list = await pm.find_batch(task_or_list)
                # Communicate found user2user connection via the queue to the main task
                for u2u in u2u_list:
                    await user2user_result_queue.put(u2u)
            except asyncio.CancelledError:
                queue.task_done()
                raise
            except Exception as e:
                traceback.print_exc(file=sys.stdout)
                # If any exception happened during processing, refer to all batch as 'pending'
                pending_list = task_or_list
                for task in pending_list:
                    if not task.data.get('pending_ts'):
                        task.data['pending_ts'] = datetime.datetime.now()
                    task.data['attempts'] = task.data.get('attempts', 0) + 1
                    task.data['not_before'] = time.monotonic() + _backoff_delay(task.data['attempts'])
                logger.warning(f"{log_prefix} Exception caught, ignoring the whole batch:")
                traceback.print_exc(file=sys.stdout)
                logger.warning(f"{log_prefix} End of Exception caught ====")
            # Notify that processing of the received task is done
            queue.task_done()
            # Re-queue anything still pending, AFTER its backoff has elapsed - but
            # hand the waiting off to a separate task so this worker can pick up
            # fresh profiles in the meantime instead of idling through the pause.
            if pending_list:
                now = time.monotonic()
                delay = max(0.5, min((t.data.get('not_before', now) for t in pending_list),
                                     default=now) - now)
                rq = asyncio.ensure_future(
                    _requeue_after(queue, priority + 10, pending_list, delay, log_prefix))
                _REQUEUE_TASKS.add(rq)
                logger.info(f"{log_prefix} Pending list size: {len(pending_list)}, "
                            f"backing off {delay:.1f}s before retry")
            else:
                await asyncio_sleep(0.1) # wait a bit to let other tasks run

            cycles += len(task_or_list)

            logger.info(
                    f"{log_prefix}, priority: {priority}, source_id: {task_or_list[0].data['source_id']}")
            logger.info(f"{log_prefix} Cycles: {cycles}, Queue size: {queue.qsize()}")

# Clear expired paths reqgularly
async def path_cleaner(db_url, geni):
    # Sleep for a while to avoid database connection problem
    await asyncio_sleep(10) 
    logger.info(f"Starting path cleaner")
    async with Database(db_url) as database:
        while True:
            logger.info("Clear expired paths")
            pm = PathManager(database, geni, None)
            await pm.clear_expired_paths()

            await asyncio_sleep(60*60)  # clean once an hour

