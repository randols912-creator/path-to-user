import sys, os
import logging
from api.geni import GeniClient
from api.models import Path, Profile, CURRENT_TIMESTAMP

class PathFinder:
    def __init__(self, db, geni: GeniClient, token: str):
        self.geni = geni
        self.db = db
        self.token = token
        # self.source_profile, self.token = geni.get_profile_details(token)

    def __call__(self, source_id: str, target_id: str):
        session = self.db.create_scoped_session()

        # First, save source profile to DB (if not saved yet). TODO: save outside of PathFinder
        # self._save_profile(session, self.source_profile)
        # Call Geni API to find path between source and target profiles
        result, self.token = self.geni.get_path_to(source_id, target_id, self.token)

        logging.info("[{}] Status for {} -> {}".format(os.getpid(), target_id, result.get('status')))
        # Save resulted path (or its pending status) to DB
        pending = result.get('status') == 'pending' or result['is_success'] == False
        self._save_path(session, source_id, target_id, result, pending=pending)

        session.close()
        return pending

    def _save_profile(self, session, profile):
        profile_db = session.query(Profile).filter_by(id=self.source_id).first()
        if not profile_db:
            profile_db = Profile()
            profile_db.name = profile['name']
            profile_db.url = profile['url']
            profile_db.id = profile['id']
            session.add(profile_db)
            session.commit()

    def _save_path(self, session, source_id, target_id, result, pending: bool):
        path = session.query(Path).filter_by(source_id=source_id, target_id=target_id).first()

        is_new = False
        if not path:
            path = Path()
            is_new = True

        path.source_id = source_id
        path.target_id = target_id
        path.url = result.get('url', '')
        path.step_count = result.get('step_count', 0)
        path.relationship = result.get('relationship', '')
        path.relations = result.get('relations', '')
        if not pending:
            path.finished_on = CURRENT_TIMESTAMP

        if is_new:
            session.add(path)

def worker(number, queue, db, geni):
    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)
    logging.info(f"Starting watchdog {number}")
    # print to main stdout
    sys.stdout.flush()
    # Reconnect (as we are in a separate process)
    db.engine.dispose()
    db.engine.connect()


    while True:
        task = queue.get()
        # Find path
        pf = PathFinder(db, geni, task['token'])
        pending = pf(task['source_id'], task['target_id'])
        if pending:
            queue.put(task)

