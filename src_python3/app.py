import sys
import os
from multiprocessing import Process, Queue, cpu_count, Value
import logging
import datetime

from flask import Flask, send_file, request, redirect, session, jsonify
from flask_cors import CORS
from flask_dotenv import DotEnv
from flask_sqlalchemy import SQLAlchemy

import models
from geni_client import GeniClient
from operator import and_

app = Flask(__name__, static_folder='templates/')
env = DotEnv(app)
env.eval({
    'SQLALCHEMY_ENGINE_OPTIONS': dict
})
CORS(app)

db = SQLAlchemy(app)
logger = app.logger
geni_client = GeniClient()
GENI_ACCESS_TOKEN_HEADER_KEY = 'Geni-access-token'


@app.route('/')
def root_endpoint():
    """Handle the index page"""
    return send_file('templates/index.html')

profile_cache = dict()

@app.route('/path-to-project', methods=["GET"])
def path_to_project_endpoint_get():
    token = request.headers.get(GENI_ACCESS_TOKEN_HEADER_KEY)
    geni_tokens = {'access_token': token}
    if token in profile_cache:
        user_profile_info =  profile_cache[token]
    else:
        user_profile_info, _ = geni_client.get_profile_details(geni_tokens)
        profile_cache[token] = user_profile_info
    offset = int(request.args.get('offset', 0))
    limit = int(request.args.get('limit', 50))

    response: dict = get_user_relations(
        user_profile_info,
        offset,
        limit)
    num_profiles = count_profiles()
    # Workers are busy if counted found relations are less than total profiles count or there are pending profiles
    response['workers_busy'] =  ( count_user_relations(user_profile_info, connected_only=False) < num_profiles
                  or count_user_relations(user_profile_info, connected_only=False, relation ='pending') > 0
                  or offset + len(response['targets']) < num_profiles
     )
    logging.info(f"Querying ready connections for {user_profile_info['focus']}"
                 f", workers_busy: {response['workers_busy']}"
                 f", ready relations: {len(response['targets'])}"
                 f", pending: {count_user_relations(user_profile_info, connected_only=False, relation ='pending')}"
                 f", relations: {count_user_relations(user_profile_info, connected_only=False)}"
                 f", profiles: {count_profiles()}")

    return jsonify(response)

def path_has_timedout(user_profile_info):
    TIMEOUT_SECS = 60
    user: models.GeniProfiles = db.session.query(models.GeniProfiles).filter(
        models.GeniProfiles.profile_id == user_profile_info['focus']['id'].split('-')[-1]
    ).first()
    last_relation = db.session.query(models.ProfileToProfile).filter(models.ProfileToProfile.source_id==user.id)\
        .order_by(models.ProfileToProfile.updated_on.desc()).first()
    if not last_relation: return False
    return bool((datetime.datetime.now() - last_relation.updated_on).seconds > TIMEOUT_SECS)

@app.route('/path-to-project', methods=["POST"])
def path_to_project_endpoint_post():
    geni_tokens = {'access_token': request.headers.get(GENI_ACCESS_TOKEN_HEADER_KEY)}

    user_profile_info, _ = geni_client.get_profile_details(geni_tokens)
    source_id = user_profile_info['focus']['id'].split('-')[-1]

    logging.info(f"Initalizing search for user profile {source_id}")
    etalon_target_profiles = {
        record.profile_id: record.id
        for record in db.session.query(models.GeniProfiles).filter_by(is_user=False).all()
    }

    if count_user_relations(user_profile_info) == 0:
        for profile_id,id in etalon_target_profiles.items():
            queue.put({
                'source_id': user_profile_info['focus']['id'].split('-')[-1],
                'geni_token': geni_tokens,
                'target_profile': (profile_id, id)
            })
            logging.info(f"Queuing {source_id} -> {id} search")
    else:
      logging.info(f"User profile search {source_id} has already been running")

    return jsonify({'result': 'Done'})

@app.route('/relations-count', methods=["GET"])
def get_relations_count():
    user: models.GeniProfiles = db.session.query(models.GeniProfiles).filter(
        models.GeniProfiles.profile_id == request.args.get('userId').split('-')[1]
    ).first()

    return {
        'relations_count':
        db.session.query(models.ProfileToProfile).filter(
            and_(
                models.ProfileToProfile.source_id == user.id,
                models.ProfileToProfile.step_count > 0
            )
        ).count()
    }

@app.route('/profiles-count', methods=['GET'])
def profiles_count():
    return {'profiles_count': count_profiles()}

def count_profiles():
    return db.session.query(models.GeniProfiles).filter(models.GeniProfiles.is_user==False).count()

@app.route('/init-profiles', methods=['POST'])
def init_profiles_():
    init_profiles(
        {'access_token': request.headers.get(GENI_ACCESS_TOKEN_HEADER_KEY)}
    )
    return {'profiles_count': count_profiles()}

def count_user_relations(user_profile_info, connected_only=True,relation=None):
    user: models.GeniProfiles = db.session.query(models.GeniProfiles).filter(
        models.GeniProfiles.profile_id == user_profile_info['focus']['id'].split('-')[-1]
    ).first()
    query = db.session.query(models.ProfileToProfile).filter(models.ProfileToProfile.source_id==user.id)
    if connected_only:
        query = query.filter(models.ProfileToProfile.step_count > 0)
    if relation:
        query = query.filter(models.ProfileToProfile.profiles_relationship == relation)
    relations_count = query.count()
    return relations_count


def get_user_relations(user_profile_info, offset=0, limit=50):
    response = {
        'source': {},
        'targets': []
    }
    user_obj = db.session.query(models.GeniProfiles).filter_by(
        profile_id=user_profile_info['focus']['id'].split('-')[-1]
    ).first()

    if user_obj:
        response['source'].update({
            'geni_id': user_obj.profile_id,
            'name': user_obj.profile_name,
            'profile_link': user_obj.profile_details_link
        })
        relations = db.session.query(models.ProfileToProfile).filter(
            and_(
                models.ProfileToProfile.source_id == user_obj.id,
                models.ProfileToProfile.step_count > 0
            )
        ).offset(offset).limit(limit).all()

        for relation_obj in relations:
            rel = db.session.query(models.GeniProfiles).filter_by(id=relation_obj.target_id).first()
            response['targets'].append({
                'id': f'profile-{rel.profile_id}',
                'step_count': relation_obj.step_count,
                'joint_url': relation_obj.joint_url,
                'profiles_relationship': relation_obj.profiles_relationship,
                'profile_name': rel.profile_name,
                'profile_link': rel.profile_details_link,
                'profile_relations': relation_obj.profile_relations,
                'profile': rel.profile
            })

    return response


def init_profiles(token):
    target_profiles, token = geni_client.get_target_profiles(token)

    for target in target_profiles:
        exists_target = db.session.query(models.GeniProfiles).filter_by(
            profile_id=target['id'].split('-')[-1]
        ).first()

        if not exists_target:
            target_profile = models.GeniProfiles()
            target_profile.profile_id = target['id'].split('-')[-1]
            target_profile.profile_name = target['name']
            target_profile.profile_details_link = target['url']
            target_profile.is_user = False
            target_profile.profile = target

            # TODO
            # profile_details: dict = geni_client.geni_api_call(target['url'], token)[0]
            # [profile_details.pop(k) for k in ['api_errors', 'internal_errors', 'is_success']]
            # target_profile.profile_details = profile_details

            db.session.add(target_profile)

    db.session.commit()


def geni_worker(number):
    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)
    logging.info(f"Starting watchdog {number}")
    # print to main stdout
    sys.stdout.flush()

    db.engine.dispose()
    db.engine.connect()

    source_info = None
    geni_token = None
    done_profiles = 0
    while True:
        task = queue.get()
        
        session = db.create_scoped_session()

        if not geni_token:
            source_info, geni_token = geni_client.get_profile_details(task['geni_token'])
        next_target_profile = {}
        target_profile = task['target_profile']
        source_profile_id = task['source_id']

        status, geni_token = geni_client.get_geni_path_to(
            source_profile_id,
            target_profile[0],
            task['geni_token']
        )
        logging.info("[{}] Status for {} -> {}".format(os.getpid(), target_profile[0], status.get('status')))
        if status.get('status') == 'done':
            done_profiles += 1
            save_profiles_relations(status, target_profile, session)

        elif status.get('status') == 'not found':
            done_profiles += 1
            not_found = (
                source_profile_id,
                target_profile[0],
                source_info,
                'not found'
            )
            save_profiles_relations(
                status, target_profile, session, not_found_param=not_found
            )

        elif status.get('status') == 'pending' or status['is_success'] == False:
            next_target_profile = target_profile
            pending = (
                source_profile_id,
                target_profile[0],
                source_info,
                'pending'
            )
            save_profiles_relations(
                status, target_profile, session, not_found_param=pending
            )

        else:
            # Unexpected status
            logging.error(f"Unexpected status: {status.get('status')}")

        if next_target_profile:
            queue.put({
                'target_profile': next_target_profile,
                'source_id': task['source_id'],
                'geni_token': task['geni_token']
            })

        session.close()


def save_profiles_relations(status, target_profile, session, not_found_param=None):
    if not_found_param:
        source_profile_id = not_found_param[0]
        target_profile_id = not_found_param[1]
        source_name = not_found_param[2]['focus']['name']
        source_link = 'https://www.geni.com/api/' + not_found_param[2]['focus']['id']

    else:
        # Example of user link -> 'https://www.geni.com/api/profile-34747685358'
        source_profile_id = status['relations'][0]['url'].split('-')[-1]
        target_profile_id = status['relations'][-1]['url'].split('-')[-1]

    source = session.query(models.GeniProfiles).filter_by(
        profile_id=source_profile_id
    ).first()
    target = session.query(models.GeniProfiles).filter_by(
        profile_id=target_profile_id
    ).first()

    if not source:
        source = models.GeniProfiles()
        source.profile_name = source_name if not_found_param else status['relations'][0]['name']
        source.profile_details_link = source_link if not_found_param else status['relations'][0]['url']
        source.profile_id = source_profile_id
        session.add(source)
        session.commit()

    profile2profile = session.query(models.ProfileToProfile).filter_by(
        source_id=source.id,
        target_id=target.id
    ).first()

    add_flag = False
    if not profile2profile:
        profile2profile = models.ProfileToProfile()
        add_flag = True

    profile2profile.source_id = source.id
    profile2profile.joint_url = '' if not_found_param else status['url']
    profile2profile.step_count = 0 if not_found_param else status['step_count']
    profile2profile.profiles_relationship = not_found_param[3] if not_found_param else status['relationship']
    profile2profile.target_id = target_profile[1]
    profile2profile.profile_relations = status['relations'] if 'relations' in status else None

    if add_flag:
        session.add(profile2profile)

    session.commit()


if __name__ == '__main__':
    from gevent.pywsgi import WSGIServer

    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)
    import multiprocessing_logging

    multiprocessing_logging.install_mp_handler()
    queue = Queue()
    process_quantity = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    quantity = process_quantity if process_quantity else cpu_count()*2+1

    for counter in range(quantity):
        Process(
            target=geni_worker,
            kwargs={'number': counter},
            name=str(counter)
        ).start()

    http_server = WSGIServer(('', int(app.config.get('PORT'))), app)
    http_server.serve_forever()

