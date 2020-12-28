import Profile, { Gender } from './Profile';

export default interface Connection {
  name: string;
  relation: string;
  url: string;
  target_profile?: Profile;
  id?: string;
  gender?: Gender;
  direct?: boolean;
  stepCount?: number;
}
