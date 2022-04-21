import { Theme } from './Theme';
import { Locale } from './Locale';

export default interface Profile {
  birth?: LivingDetails;
  death?: LivingDetails;
  first_name?: string;
  gender?: Gender;
  id?: string;
  last_name?: string;
  maiden_name?: string;
  name?: string;
  names?: { [key in Locale]: NameDetails };
  photo_urls?: PhotoUrls;
  bh_theme?: Theme;
  bh_floor?: number;
  bh_location?: string;
  bh_url?: string;
  url?: string;
  about_me?: string;
  profile_url?: string;
  detail_strings?: { [key in Locale]: { about_me: string } };
  error?: {
    message: string;
    type: string;
  };
}

export interface NameDetails {
  display_name: string;
  first_name: string;
  last_name: string;
  maiden_name: string;
  middle_name: string;
  nicknames: string;
}

interface PhotoUrls {
  large: string;
  medium: string;
  print: string;
  small: string;
  thumb: string;
  thumb2: string;
  original: string;
  url: string;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNDEFINED = 'undefined',
}

export interface LivingDetails {
  date: DateDetails;
  location: PlaceDetails;
}

export interface DateDetails {
  day: number;
  formatted_date: string;
  month: number;
  year: number;
}

export interface PlaceDetails {
  country: string;
  country_code: string;
  formatted_location: string;
  latitude: number;
  longitude: number;
}
