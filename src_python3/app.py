import sys
import time
from multiprocessing import Process, Queue, cpu_count

from flask import Flask, send_file, request, redirect, session, jsonify
from flask_sqlalchemy import SQLAlchemy

import models
from src_python3.geni_client import GeniClient


app = Flask(__name__)
db = SQLAlchemy(app)
logger = app.logger
geni_client = GeniClient()


@app.route('/')
def root_endpoint():
    """Handle the index page"""
    return send_file('templates/login.html')


@app.route('/login')
def login_endpoint():
    """Handle the login page"""
    return redirect(geni_client.build_auth_url())


@app.route('/home')
def home_endpoint():
    """Handle the redirected OAuth session and capture tokens"""
    set_token()
    queue.put({
        'init_geni_targets': True,
        'geni_token': session['geni_token'],
    })
    return send_file('templates/index.html')


def set_token():
    new_token = geni_client.get_token(
        code=request.args.get('code')
    )
    session['geni_token'] = {
        'access_token': new_token['access_token'],
        'refresh_token': new_token['refresh_token'],
        'tokenExpiration': new_token['tokenExpiration']
    }


@app.route('/path-to-project', methods=["GET"])
def path_to_project_endpoint_get():
    user_profile_info, session['geni_token'] = geni_client.get_profile_details(
        session['geni_token']
    )
    response = get_user_relations(user_profile_info)

    return jsonify(response)


@app.route('/path-to-project', methods=["POST"])
def path_to_project_endpoint_post():
    user_profile_info, session['geni_token'] = geni_client.get_profile_details(
        session['geni_token']
    )

    queue.put({
        'source_id': user_profile_info['focus']['id'].split('-')[-1],
        'geni_token': session['geni_token'],
        'init_geni_targets': False,
        'target_profiles': {}
    })

    return jsonify({'result': 'Done'})


@app.before_first_request
def before_first_request_func():
    # Import placed here because of auto-create database
    from models import db_init
    db_init()


def setup_app(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///geni_database.db'
    app.config['SESSION_TYPE'] = 'redis'
    app.config['SECRET_KEY'] = '#MyC00lp@sswoRdl@budil@bud@'


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
            response['targets'].append({
                'step_count': relation_obj.step_count,
                'joint_url': relation_obj.joint_url,
                'profiles_relationship': relation_obj.profiles_relationship,
                'profile_link': (models.GeniProfiles.query.filter_by(
                    id=relation_obj.target_profile_id
                ).first()).profile_details_link
            })

    return response


def status_watchdog_kicker():
    task = queue.get()

    if task['init_geni_targets']:
        target_profiles, token = geni_client.get_target_profiles(task['geni_token'])

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

                db.session.add(target_profile)

        db.session.commit()
        # just for case. Maybe SQLite will be slow guy.
        time.sleep(5.0)

    else:
        queue.put(task)
        # wait while db filling
        time.sleep(120.0)


def status_watchdog(number):
    # print to main stdout
    sys.stdout.flush()

    status_watchdog_kicker()
    etalon_target_profiles = {
        record.profile_id: record.id
        for record in models.GeniProfiles.query.filter_by(is_user=False).all()
    }

    while True:
        task = queue.get()
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

            if status.get('status') == 'done':
                save_profiles_relations(status, target_profiles)

            elif status.get('status') == 'not found':
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


def save_profiles_relations(status, target_profiles, not_found_param=None):
    if not_found_param:
        source_profile_id = not_found_param[0]
        target_profile_id = not_found_param[1]
        source_name = not_found_param[2]['focus']['name']
        source_link = 'https://www.geni.com/api/' + not_found_param[2]['focus']['id']

    else:
        # Example of user link -> 'https://www.geni.com/api/profile-34747685358'
        source_profile_id = status['relations'][0]['url'].split('-')[-1]
        target_profile_id = status['relations'][1]['url'].split('-')[-1]

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

    if add_flag:
        db.session.add(profile2profile)

    db.session.commit()


setup_app(app)


if __name__ == '__main__':
    queue = Queue()
    process_quantity = int(sys.argv[1]) if len(sys.argv) > 1 else 0

    Process(target=app.run, kwargs={'port': 5050}).start()

    for counter in range(process_quantity if process_quantity else cpu_count()):
        Process(
            target=status_watchdog,
            kwargs={'number': counter},
            name=str(counter)
        ).start()
