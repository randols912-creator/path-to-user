export const appHost = process.env.host || 'http://localhost:4200';

export const geniClientId = 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt';
export const geniOathRedirectUri = `${appHost}`;
export const geniOauthUrl = `https://www.geni.com/platform/oauth/authorize?client_id=${geniClientId}&redirect_uri=${geniOathRedirectUri}&response_type=token&display=mobile`;

export const geniTokenStorageKey = 'gn-token';
export const geniTokenExpiresStorageKey = 'gn-token-exp';

export const findRelationsUrl = '/path-to-project';
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
