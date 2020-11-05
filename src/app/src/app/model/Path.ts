import { Category } from './Category';
import Profile from './Profile';
import Connection from './ProfileRelation';

export default interface Path {
  source_id: string;
  target_id: string;
  step_count: number;
  target_profile: Profile;
  relations: Connection[];
  bh_theme: Category;
  bh_floor: string | number;
  bh_url: string;
}

export interface PathDetailsResponse {
  path: {
    relationship: string;
    relations: Connection[];
  };
}
