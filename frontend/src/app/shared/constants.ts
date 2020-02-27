export default class AppConstants {
  public static get geniConf(): object {
    return {
      app_id: 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt',
      logging: true,
    };
  }

  public static get welcomeURL(): string {
    return '/welcome';
  }

  public static get homeURL(): string {
    return '/';
  }

  public static get geniTokenStorageKey(): string {
    return 'gn-token';
  }

  public static get geniTokenExpiresStorageKey(): string {
    return 'gn-token-exp';
  }

  public static get findRelationsUrl(): string {
    return '/path-to-project';
  }

  public static get geniTokenHeaderKey(): string {
    return 'Geni-access-token';
  }

  public static get millisBetweenBackendCalls(): number {
    return 1000;
  }
}
