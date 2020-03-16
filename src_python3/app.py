import sys
import os
from multiprocessing import Process, Queue, cpu_count, Value
import logging

from flask import Flask, send_file, request, redirect, session, jsonify
from flask_cors import CORS
from flask_dotenv import DotEnv
from flask_sqlalchemy import SQLAlchemy

import models
from geni_client import GeniClient

app = Flask(__name__, static_folder='templates/')
env = DotEnv(app)
CORS(app)

db = SQLAlchemy(app)
logger = app.logger
geni_client = GeniClient()
GENI_ACCESS_TOKEN_HEADER_KEY = 'Geni-access-token'


@app.route('/')
def root_endpoint():
    """Handle the index page"""
    return send_file('templates/index.html')


@app.route('/path-to-project', methods=["GET"])
def path_to_project_endpoint_get():
    geni_tokens = {'access_token': request.headers.get(GENI_ACCESS_TOKEN_HEADER_KEY)}
    user_profile_info, _ = geni_client.get_profile_details(geni_tokens)
    response: dict = get_user_relations(user_profile_info)
    response['workers_busy'] = not queue.empty() or sum([i.value for i in app.config['worker_busy_flags']]) > 0

    return jsonify(response)


@app.route('/path-to-project', methods=["POST"])
def path_to_project_endpoint_post():
    geni_tokens = {'access_token': request.headers.get(GENI_ACCESS_TOKEN_HEADER_KEY)}

    if models.GeniProfiles.query.count() == 0:
        init_profiles(geni_tokens)

    user_profile_info, _ = geni_client.get_profile_details(geni_tokens)
    source_id = user_profile_info['focus']['id'].split('-')[-1]
    sources_list = control_queue.get()

    etalon_target_profiles = {
        record.profile_id: record.id
        for record in models.GeniProfiles.query.filter_by(is_user=False).all()
    }

    if source_id not in sources_list:
        for profile_id,id in etalon_target_profiles.items():
            queue.put({
                'source_id': user_profile_info['focus']['id'].split('-')[-1],
                'geni_token': geni_tokens,
                'init_geni_targets': False,
                'target_profiles': {profile_id: id}
            })
        sources_list.append(source_id)

    control_queue.put(sources_list)

    return jsonify({'result': 'Done'})


def get_user_relations(user_profile_info):
    response = {
        'source': {},
        'targets': []
    }
    user_obj = models.GeniProfiles.query.filter_by(
        profile_id=user_profile_info['focus']['id'].split('-')[-1]
    ).first()

    if user_obj:
        response['source'].update({
            'geni_id': user_obj.profile_id,
            'name': user_obj.profile_name,
            'profile_link': user_obj.profile_details_link
        })
        relations = models.ProfileToProfile.query.filter_by(
            source_profile_id=user_obj.id
        ).all()

        for relation_obj in relations:
            rel = models.GeniProfiles.query.filter_by(id=relation_obj.target_profile_id).first()
            response['targets'].append({
                'id': f'profile-{rel.profile_id}',
                'step_count': relation_obj.step_count,
                'joint_url': relation_obj.joint_url,
                'profiles_relationship': relation_obj.profiles_relationship,
                'profile_name': rel.profile_name,
                'profile_link': rel.profile_details_link,
                'profile_relations': relation_obj.profile_relations
            })

    return response


def init_profiles(token):
    target_profiles, token = geni_client.get_target_profiles(token)

    for target in target_profiles:
        exists_target = models.GeniProfiles.query.filter_by(
            profile_id=target['id'].split('-')[-1]
        ).first()

        if not exists_target:
            target_profile = models.GeniProfiles()
            target_profile.profile_id = target['id'].split('-')[-1]
            target_profile.profile_name = target['name']
            target_profile.profile_details_link = target['url']
            target_profile.is_user = False

            # TODO
            # profile_details: dict = geni_client.geni_api_call(target['url'], token)[0]
            # [profile_details.pop(k) for k in ['api_errors', 'internal_errors', 'is_success']]
            # target_profile.profile_details = profile_details

            db.session.add(target_profile)

    db.session.commit()


def status_watchdog(number, busy_flag):
    # print to main stdout
    sys.stdout.flush()

    #status_watchdog_kicker()
    etalon_target_profiles = {
        record.profile_id: record.id
        for record in models.GeniProfiles.query.filter_by(is_user=False).all()
    }
    source_info = None
    geni_token = None
    done_profiles = 0
    while True:
        task = queue.get()
        busy_flag.value = 1
        if not geni_token:
            source_info, geni_token = geni_client.get_profile_details(task['geni_token'])
        next_target_profiles = {}
        target_profiles = task['target_profiles']
        source_id = task['source_id']
        if not target_profiles:
            target_profiles = etalon_target_profiles.copy()
            target_profiles.pop(source_id, None)

        for target_id in target_profiles:
            status, geni_token = geni_client.get_geni_path_to(
                source_id,
                target_id,
                task['geni_token']
            )
            logging.info("[{}] Status for {} -> {}".format(os.getpid(), target_id, status.get('status')))
            if status.get('status') == 'done':
                done_profiles += 1
                save_profiles_relations(status, target_profiles)

            elif status.get('status') == 'not found':
                done_profiles += 1
                not_found = (
                    source_id,
                    target_id,
                    source_info
                )
                save_profiles_relations(
                    status, target_profiles, not_found_param=not_found
                )

            elif status.get('status') == 'pending' or status['is_success'] == False:
                next_target_profiles.update({
                    target_id: target_profiles[target_id]
                })

            else:
                # Unexpected status
                print("Jesus Christ, it's Jason Bourne.")
                print(status)

        if next_target_profiles:
            queue.put({
                'target_profiles': next_target_profiles,
                'source_id': task['source_id'],
                'geni_token': task['geni_token']
            })

        busy_flag.value = 0


def save_profiles_relations(status, target_profiles, not_found_param=None):
    if not_found_param:
        source_profile_id = not_found_param[0]
        target_profile_id = not_found_param[1]
        source_name = not_found_param[2]['focus']['name']
        source_link = 'https://www.geni.com/api/' + not_found_param[2]['focus']['id']

    else:
        # Example of user link -> 'https://www.geni.com/api/profile-34747685358'
        source_profile_id = status['relations'][0]['url'].split('-')[-1]
        target_profile_id = status['relations'][-1]['url'].split('-')[-1]

    source = models.GeniProfiles.query.filter_by(
        profile_id=source_profile_id
    ).first()

    if not source:
        source = models.GeniProfiles()
        source.profile_name = source_name if not_found_param else status['relations'][0]['name']
        source.profile_details_link = source_link if not_found_param else status['relations'][0]['url']
        source.profile_id = source_profile_id
        db.session.add(source)
        db.session.commit()

    profile2profile = models.ProfileToProfile.query.filter_by(
        source_profile_id=source.id,
        target_profile_id=target_profiles[target_profile_id]
    ).first()

    add_flag = False
    if not profile2profile:
        profile2profile = models.ProfileToProfile()
        add_flag = True

    profile2profile.source_profile_id = source.id
    profile2profile.joint_url = '' if not_found_param else status['url']
    profile2profile.step_count = 0 if not_found_param else status['step_count']
    profile2profile.profiles_relationship = 'not found' if not_found_param else status['relationship']
    profile2profile.target_profile_id = target_profiles[target_profile_id]
    profile2profile.profile_relations = status['relations'] if 'relations' in status else None

    if add_flag:
        db.session.add(profile2profile)

    db.session.commit()


if __name__ == '__main__':
    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)

    queue = Queue()
    control_queue = Queue()
    control_queue.put([])
    process_quantity = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    quantity = process_quantity if process_quantity else cpu_count()

    worker_busy_flags = [Value('i', 0) for i in range(quantity)]
    app.config['worker_busy_flags'] = worker_busy_flags

    Process(target=app.run, kwargs={'port': app.config.get('PORT')}).start()

    for counter in range(quantity):
        Process(
            target=status_watchdog,
            kwargs={'number': counter,
                    'busy_flag': worker_busy_flags[counter]},
            name=str(counter)
        ).start()
