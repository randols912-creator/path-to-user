export interface RelationsResponse {
  source: UserProfile;
  targets: Relation[];
}

export interface UserProfile {
  geni_id: string;
  name: string;
  profile_link: string;
}

export interface ProfileRelation {
  name: string;
  relation: string;
  url: string;
}

export interface Relation {
  id: string;
  joint_url: string;
  profile_name: string;
  profile_link: string;
  profiles_relationship: string;
  step_count: number;
  profile_relations: ProfileRelation[];
  details?: any;
}
