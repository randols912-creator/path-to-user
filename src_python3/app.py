import sys
from multiprocessing import Process, Queue

from flask import Flask, send_file, request, redirect, session
from flask_sqlalchemy import SQLAlchemy

import models
from src_python3.geni_client import GeniClient



app = Flask(__name__)
db = SQLAlchemy(app)
logger = app.logger
geni_client = GeniClient()
target_profiles = [
    '34661590460', '27358493', '34633071750', '34652391369', '34657269318', '34620733063',
    '126952735', '126323188', '34711794524', '118108927', '77925526', '5606444', '34630958982',
    '76580494', '34645275970', '119289731', '34620351137', '34629512587', '26179409', '8660445',
    '34626158006', '2417947', '78451394', '71536218', '34621465282', '34620649340', '34626468381',
    '34662918664', '34633724295', '109047256', '34625700708', '88457824', '34657776542',
    '34643303919', '61190216', '49233056', '34668631501', '34625671545', '72750659', '40180846',
    '115928580', '4170262', '21346643', '13609351', '38838132', '85087105', '10778709', '19897050',
    '74223070', '10099378', '13489064', '112225931', '18356362', '31937597', '6362102', '40075916',
    '113073167', '34662355325', '60466926', '34641636809', '3917300', '8432967', '116730025',
    '20700199', '82108294', '112023168', '34660837306', '61112477', '74306103', '81865726',
    '110801834', '34654749121', '34626021458', '21431155', '57093809', '3560033', '18032534',
    '34621582550', '84052503', '4094322', '34660354651', '34720198331', '34672304535', '4169964',
    '34676411531', '34628777085', '34629401739', '34630803201', '34626618419', '34655412324',
    '11597140', '9863774', '4851757', '34710351976', '54271642', '34664455502', '55342098',
    '14829724', '47975900', '77193155', '13840588', '7182537', '34678693602', '34657631401',
    '34649831227', '9345033', '3367925', '3367909', '41074091', '3599736', '127706557', '2702671',
    '2842427', '4104994', '48702978', '34623118964', '72658220', '73259963', '25086448', '112506699',
    '20700335', '34661852503', '9097877', '75974853', '41381678', '29736694', '34636928598',
    '34722160908', '83338470', '111095433', '34629257483', '34653507146', '34669347698', '94861765',
    '8456114', '9851917', '58403008', '34715054765', '34634163199', '34621195982', '34715401632',
    '44550958', '34661313127', '34659966053', '34721337020', '34623681165', '82518745', '115924431',
    '34653380897', '78981118', '80940062', '40849187', '59257045', '129938371', '34661213344',
    '26214263', '32671945', '34658248711', '44558103', '41614450', '69477878', '34628780059',
    '4128644', '27587340'
]


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


@app.route('/path-to-project', methods=["GET", "PUT"])
def path_to_project_endpoint():
    if request.method == "GET":
        user_profile_info, session['geni_token'] = geni_client.get_profile_details(
            session['geni_token']
        )

        for target_id in target_profiles:
            queue.put({
                'target_id': target_id,
                'source_id': user_profile_info['focus']['id'],
                'geni_token': session['geni_token']
            })
        print(queue.qsize())
        return 'DONE'

    elif request.method == "PUT":
        return 'GET'


@app.before_first_request
def before_first_request_func():
    # Import placed here because of auto-create database
    from models import db_init
    db_init()


def setup_app(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///geni_database.db'
    app.config['SESSION_TYPE'] = 'redis'
    app.config['SECRET_KEY'] = '#MyC00lp@sswoRdl@budil@bud@'

setup_app(app)


def status_watchdog():
    # print to main stdout
    sys.stdout.flush()

    while True:
        task = queue.get()
        status, geni_token = geni_client.get_geni_path_to(
            task['source_id'],
            task['target_id'],
            task['geni_token']
        )

        if status.get('status') == 'done':
            geni_profile = models.GeniProfiles()
            geni_profile2 = models.GeniProfiles()
            geni_profile2profile = models.ProfileToProfile()

            geni_profile.profile_name = status[0]['name']
            geni_profile.profile_details_link = status[0]['url']
            geni_profile2.profile_name = status[1]['name']
            geni_profile2.profile_details_link = status[1]['url']

            db.session.add(geni_profile2)
            db.session.commit()

            geni_profile2profile.step_count = status['step_count']
            geni_profile2profile.geni_profile1_id = geni_profile.id
            geni_profile2profile.geni_profile2_id = geni_profile2.id
            geni_profile2profile.profile_to_profile_link = status['url']
            geni_profile2profile.profile_relationship = status['relationship']

            db.session.add(geni_profile2profile)
            db.session.commit()

        elif status.get('status') == 'not found':
            continue

        elif status.get('status') == 'pending':
            queue.put({
                'target_id': task['target_id'],
                'source_id': task['source_id'],
                'geni_token': task['geni_token']
            })

        else:
            print("Jesus Christ it's Jason Bourne")


if __name__ == '__main__':
    queue = Queue()

    Process(target=app.run, kwargs={'port': 5050}).start()

    for counter in range(int(sys.argv[1])):
        Process(
            target=status_watchdog,
            # kwargs={'number': counter},
            name=str(counter)
        ).start()





"""
{'api_errors': [], 'internal_errors': [], 'is_success': True, 'inlaw_distance': 0,
 'relations': [{'name': 'Super Leha', 'url': 'https://www.geni.com/api/profile-34747685068'},
               {'name': 'Bro Daniel Eisenberg', 'relation': 'brother',
                'url': 'https://www.geni.com/api/profile-34747685358'}], 'relationship': 'brother', 'status': 'done',
 'step_count': 1,
 'url': 'https://www.geni.com/path/Super-Leha+is+related+to+Bro-Daniel?from=6000000115951461848&path_type=blood&to=6000000115952147891'}
 
 
 
source_id = '34747685068'
target_id = '34747685358'
"""