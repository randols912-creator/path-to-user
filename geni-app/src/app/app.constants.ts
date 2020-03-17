import { environment as env } from 'src/environments/environment';

export const geniClientId = 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt';

export const geniHost = 'https://www.geni.com';
export const geniOauthUrl = `${geniHost}/platform/oauth/authorize?client_id=${geniClientId}&redirect_uri=${env.host}&response_type=token&display=mobile`;
export const geniApiUrl = `${geniHost}/api`;
export const currentUserProfilePath = 'profile';

export const geniTokenStorageKey = 'gn-token';
export const geniTokenExpiresStorageKey = 'gn-token-exp';
export const currentUserProfileStorageKey = 'gn-user';

export const fetchRelationsUrl = `${env.relationsServiceHost}/path-to-project`;
export const geniTokenHeaderKey = 'geni-access-token';
export const millisBetweenBackendCalls = 1000;

export const homePath = '';
export const welcomePath = 'welcome';
export const menuPath = 'menu';

export const homeUrl = `/${homePath}`;
export const welcomeUrl = `/${welcomePath}`;
export const menuUrl = `/${menuPath}`;

export const welcomePhotos = [
  'assets/img/photos/photo_2.png',
  'assets/img/photos/photo_1.png',
  'assets/img/photos/photo_3.png',
  'assets/img/photos/photo_1.png',
  'assets/img/photos/photo_2.png',
];
