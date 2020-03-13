import Profile from './Profile';

export default interface Relation {
  id: string;
  joint_url: string;
  profile_link: string;
  profile_name: string;
  profile_relations: Array<any>;
  profiles_relationship: string;
  step_count: number;
  profile?: Profile;
}
