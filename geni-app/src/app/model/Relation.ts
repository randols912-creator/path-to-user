import Profile from './Profile';
import ProfileRelation from './ProfileRelation';

export default interface Relation {
  id: string;
  joint_url: string;
  profile_link: string;
  profile_name: string;
  profile_relations: Array<ProfileRelation>;
  profiles_relationship: string;
  step_count: number;
  profile?: Profile;
}
