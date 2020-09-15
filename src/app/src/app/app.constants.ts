import { environment as env } from 'src/environments/environment';

export const geniClientId = 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt';

export const geniHost = 'https://www.geni.com';
export const geniOauthUrl = `${geniHost}/platform/oauth/authorize?client_id=${geniClientId}&redirect_uri=${env.host}&response_type=token&display=mobile`;
export const geniApiUrl = `${geniHost}/api`;
export const currentUserProfilePath = 'profile';

export const geniTokenStorageKey = 'gn-token';
export const geniTokenExpiresStorageKey = 'gn-token-exp';
export const currentUserProfileStorageKey = 'gn-user';
export const appSettingsStorageKey = 'app-settings';

export const fetchRelationsUrl = `${env.relationsServiceHost}/path-to-project`;
export const getRelationsCountUrl = `${env.relationsServiceHost}/relations-count`;
export const geniTokenHeaderKey = 'geni-access-token';
export const millisBetweenBackendCalls = 1000;

export const homePath = '';
export const welcomePath = 'welcome';
export const menuPath = 'menu';
export const relationPath = 'relation';
export const profilePath = 'profile';
export const settingsPath = 'settings';

export const homeUrl = `/${homePath}`;
export const welcomeUrl = `/${welcomePath}`;
export const menuUrl = `/${menuPath}`;
export const profileUrl = `/${profilePath}`;
export const settingsUrl = `/${settingsPath}`;

export const termsOfUseUrl = 'https://www.bh.org.il/terms-of-use';

export const welcomePhotos = [
  'assets/img/photos/0.jpg',
  'assets/img/photos/1.jpg',
  'assets/img/photos/2.jpg',
  'assets/img/photos/3.jpg',
  'assets/img/photos/4.jpg',
  'assets/img/photos/5.jpg',
  'assets/img/photos/6.jpg',
  'assets/img/photos/7.jpg',
  'assets/img/photos/8.jpg',
  'assets/img/photos/9.jpg',
  'assets/img/photos/10.jpg',
];
