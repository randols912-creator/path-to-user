const PROXY_CONFIG = [
  {
    context: ['/path-to-project'],
    target: 'http://localhost:5050',
    secure: false,
    logLevel: 'debug',
  },
];

module.exports = PROXY_CONFIG;
