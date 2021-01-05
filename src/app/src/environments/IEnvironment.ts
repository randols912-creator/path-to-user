export default interface Environment {
  name?: string;
  production: boolean;
  host: string;
  relationsServiceHost: string;
  socketioUrl: string;
}
