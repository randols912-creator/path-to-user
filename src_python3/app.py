import json
import time
from rq import Queue

from flask import Flask, send_file, request, redirect, session, jsonify
from flask_sqlalchemy import SQLAlchemy

from geni_client import GeniClient


app = Flask(__name__)

db = SQLAlchemy(app)
logger = app.logger
geni_client = GeniClient()

# Q = Queue("p2u_default", connection=CONN)
# PQ = Queue("p2u_high", connection=CONN)


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
    code = request.args.get('code')
    token_response = geni_client.get_new_token(code)
    set_tokens(token_response)
    session['current_step'] = 0

    return send_file('templates/index.html')


@app.route('/path-to-project', methods=["GET", "PUT"])
def path_to_project_endpoint():
    if request.method == "PUT":
        return 'PUT'

    elif request.method == "GET":
        return 'GET'


@app.before_first_request
def before_first_request_func():
    # Import placed here because of auto create database
    import models
    # TODO FIX ISSUE WITH DB INIT
    class TopProfiles(db.Model):
        __tablename__ = 'geni_top_profiles'
        profileId = db.Column(db.Integer, primary_key=True)
        profileLink = db.Column(db.String(255))
        steps = db.Column(db.Integer)

    class GeniProfile(db.Model):
        __tablename__ = 'geni_profiles'
        gid = db.Column(db.Integer, primary_key=True)
        profileId = db.Column(db.String(255))
        profileName = db.Column(db.String(255))
        profileLink = db.Column(db.String(255))
        step = db.Column(db.Integer)
        profiles = db.Column(db.Integer)

    class GeniJob(db.Model):
        __tablename__ = 'geni_job'
        jid = db.Column(db.Integer, primary_key=True)
        profileId = db.Column(db.String(255))
        guid = db.Column(db.String(255))
        apiKey = db.Column(db.String(255))
        step = db.Column(db.Integer)
        email = db.Column(db.String(255))
        dbSave = db.Column(db.String(255))
        status = db.Column(db.Integer)
    db.create_all()
    db.session.commit()


@app.route('/getPath2Projects')
def get_path_to_projects():
    """Call the Path2User functionality of Geni for list based on a project"""
    email = request.args.get('email')
    other_id = request.args.get('otherId')
    project_id = request.args.get('project_id')
    source_profile_id = request.args.get('sourceProfile')
    print(session['access_token'])

    session['access_token'], session['refresh_token'], project_name, project_url, guids = geni_client.get_geni_project_guids(
        session['access_token'],
        session['refresh_token'],
        project_id
    )
    print(session['access_token'])
    if len(guids) > 0:
        print(guids)
        if source_profile_id is not None and len(source_profile_id) > 2:
            return handleSet(email, False, source_profile_id,
                guids, project_name, project_url,True
            )

        else:
            return handleSet(email, True, other_id, guids,
                project_name, project_url, True
            )
    else:
        print('SEND MAIL')
        # data['subject'] = "Project " + project_id + " was empty."
        # data['status'] = 'Empty project'
        # data['error'] = {}
        # data['error']['message'] = "Could not process empty project."
        # sendErrorEmail(email, data)


def set_tokens(token_response_text):
    """Save the OAuth tokens into the session object"""
    token_response = json.loads(token_response_text)
    session['access_token'] = token_response['access_token']
    session['refresh_token'] = token_response['refresh_token']
    session['tokenExpiration'] = token_response['expires_in']
    logger.info('set_tokens access_token: %s', session['access_token'])


def create_single_path_background_job(params):
    """Builds job to run one path on a worker"""
    continue_flag = True
    set_data = {}

    while continue_flag:
        set_data = geni_client.get_geni_path_to(
            params['access_token'],
            params['refresh_token'],
            params['other_id'], params['guid']
        )

        if (not set_data.get('status')
            or (set_data.get('status') and str(set_data['status']) != 'pending')):
            continue_flag = False

        else:
            time.sleep(10)
    params['access_token'], params['refresh_token'], target_text = geni_client.get_other_profile(
        params['access_token'],
        params['refresh_token'],
        params['guid']
    )
    profile_data = json.loads(target_text)

    set_data['target_name'] = profile_data['name']
    set_data['target_url'] = profile_data['profile_url']

    if (str(set_data['status']) != 'not found'
        and str(set_data['status']) != 'done'):

        set_data['source_id'] = params['other_id']
        set_data['target_id'] = params['guid']
        set_data['step_count'] = 1000
        sendErrorEmail(params['email'], set_data)

    elif (str(set_data['status']) == 'not found'):
        set_data['source_id'] = params['other_id']
        set_data['target_id'] = params['guid']
        set_data['step_count'] = 1000

    if (not set_data.get('step_count')):
        set_data['step_count'] = 1000

    return set_data

def create_sets_background_job(params):
    """Builds long running job for sets"""
    data = {}
    data['source_id'] = params['other_id']
    params['access_token'], params['refresh_token'], source_obj = geni_client.get_other_profile(
        params['access_token'],
        params['refresh_token'],
        params['other_id']
    )

    if source_obj:
        profile_data = json.loads(source_obj)

    else:
        profile_data = {}

    data['source_name'] = profile_data.get('name', '(unknown)')
    data['source_url'] = profile_data.get('profile_url', '')
    data['set_data'] = []
    guids = params['guids']
    jobs = []
    for guid in guids:
        params['guid'] = guid
        job = PQ.enqueue_call(func=create_single_path_background_job, args=(params,), timeout=6000)
        jobs.append(job)

    continue_flag = True
    retry_count = 0
    last_not_finished_count = 0
    job_count = len(jobs)

    # TODO handle error cases like not found paths, etc below
    while continue_flag and retry_count < 360:
        not_finished_count = 0

        for job in jobs:
            if not (job.get_status() == None or job.is_failed or job.is_finished):
                logger.debug('Not failed or finished status: %s', job.get_status())
                not_finished_count = not_finished_count + 1

        if (not_finished_count > 0):
            time.sleep(10)

            if (not_finished_count != job_count and last_not_finished_count == not_finished_count):
                retry_count = retry_count + 1

            else:
                last_not_finished_count = not_finished_count
                retry_count = 0

        else:
            continue_flag = False

    for job in jobs:
        data['set_data'].append(job.result)

    # check whether to sort results
    if (params['sort_by_steps']):
        try:
            data['set_data'] = sorted(data['set_data'], key=itemgetter('step_count'))

        except Exception as err:
            logger.error('Could not sort data: %s', err)

    data['set_name'] = params.get('set_name', 'Unknown project')
    data['set_url'] = params['set_url']
    # send results of this set
    sendSetsEmail(params['email'], data)


def handleSet(email, my_flag, other_id, guids, set_name, set_url, sort_by_steps):
    # handle case where we are implicit
    if my_flag:
        session['access_token'], session['refresh_token'], profile_obj = geni_client.get_profile_details(
            session['access_token'],
            session['refresh_token']
        )
        profile_id = profile_obj['guid']

    else:
        #Other profiles
        session['access_token'], session['refresh_token'], profile_data_text = geni_client.get_other_profile(
            session['access_token'],
            session['refresh_token'],
            other_id
        )
        profile_data = json.loads(profile_data_text)
        check_id = profile_data.get('id')

        if check_id == None:
            data = {}
            data['backgroundMessage'] = 'This profile access is denied.'

            return jsonify(data)

        profile_id = profile_data['guid']

    data = {}

    try:
        params = {}
        params['access_token'] = session['access_token']
        params['refresh_token'] = session['refresh_token']
        params['email'] = email
        params['other_id'] = profile_id
        params['set_name'] = set_name
        params['set_url'] = set_url
        params['guids'] = guids
        params['sort_by_steps'] = sort_by_steps
        Q.enqueue_call(func=create_sets_background_job, args=(params,), timeout=604800)
        data = {}
        data['backgroundMessage'] = 'Background Job started. You will receive an e-mail with the results when they are ready. Make sure to check your SPAM folder. The process can take several minutes or more, so please be patient.'

        return jsonify(data)

    except Exception as err:
        logger.exception('handle_sets error: %s', err)

    return jsonify(data)


def setup_app(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///geni_database.db'
    app.config['SESSION_TYPE'] = 'redis'
    app.config['SECRET_KEY'] = '#MyC00lp@sswoRdl@budil@bud@'

setup_app(app)


if __name__ == '__main__':
    app.run(port=5050)
