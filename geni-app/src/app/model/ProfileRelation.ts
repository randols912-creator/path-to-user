import Profile from './Profile';

export default interface Connection {
  name: string;
  relation: string;
  url: string;
  profile?: Profile;
  id?: string;
}
