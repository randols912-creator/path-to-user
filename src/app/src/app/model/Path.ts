import { Theme } from './Theme';
import Profile from './Profile';
import Connection from './ProfileRelation';
import { Locale } from './Locale';

export default interface Path {
  source_id: string;
  target_id: string;
  step_count: number;
  target_profile: Profile;
  relations: Connection[];
  bh_theme: Theme;
  bh_floor: number;
  bh_location: BHLocation;
  bh_url: string;
}

export interface PathDetailsResponse {
  path: {
    relationship: string;
    relations: Connection[];
  };
}

export interface BHLocation {
  coordinates: string;
  floor: string;
  name: { [key in Locale]: string };
}
