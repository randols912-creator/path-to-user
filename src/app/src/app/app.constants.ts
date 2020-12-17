import { environment as env } from 'src/environments/environment';

export const GENI_CLIENT_ID = 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt';

export const GENI_HOST = 'https://www.geni.com';
export const GENI_OAUTH_URL = `${GENI_HOST}/platform/oauth/authorize?client_id=${GENI_CLIENT_ID}&redirect_uri=${env.host}&response_type=token&display=mobile`;
export const GENI_API_URL = `${GENI_HOST}/api`;
export const CURRENT_USER_PROFILE_PATH = 'profile';

export const GENI_TOKEN_STORAGE_KEY = 'gn-token';
export const GENI_TOKEN_EXPIRES_STORAGE_KEY = 'gn-token-exp';
export const CURRENT_USER_PROFILE_STORAGE_KEY = 'gn-user';
export const APP_SETTINGE_STORAGE_KEY = 'app-settings';

export const FETCH_PATHS_URL = `${env.relationsServiceHost}/api/v1/paths/personalities`;
export const PATHS_COUNT_URL = `${env.relationsServiceHost}/api/v1/paths/personalities/count`;
export const PROFILES_COUNT_URL = `${env.relationsServiceHost}/api/v1/profiles/count`;
export const PATH_DETAILS_URL = `${env.relationsServiceHost}/api/v1/paths`;
export const GENI_TOKEN_HEADER_KEY = 'authorization';
export const MILLIS_BETWEEN_API_CALLS = 1000;
export const QUADRANT_COUNT = 40;

export const HOME_PATH = '';
export const WELCOME_PATH = 'welcome';
export const MENU_PATH = 'menu';
export const ABOUT_PATH = 'about';
export const RELATION_PATH = 'relation';
export const PROFILE_PATH = 'profile';
export const SETTINGS_PATH = 'settings';
export const MAP_PATH = 'map';

export const INITIAL_RELATIONS_LIMIT = 25;
export const RELATION_SCROLL_THRESHOLD_PCT = 50;
export const RELATION_LIMIT_STEP = 25;

export const termsOfUseUrl = 'https://www.bh.org.il/terms-of-use';

export const welcomePhotos = [
  'assets/img/photos/einstein.jpg',
  'assets/img/photos/lazarus.jpg',
  'assets/img/photos/herzl.jpg',
  'assets/img/photos/0.jpg',
  'assets/img/photos/1.jpg',
  'assets/img/photos/2.jpg',
  'assets/img/photos/3.jpg',
  'assets/img/photos/4.jpg',
  'assets/img/photos/5.jpg',
  'assets/img/photos/6.jpg',
  'assets/img/photos/7.jpg',
  'assets/img/photos/9.jpg',
];
