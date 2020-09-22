import { Category } from './Category';

export default interface Profile {
  birth: LivingDetails;
  death: LivingDetails;
  first_name: string;
  gender: Gender;
  id: string;
  last_name: string;
  maiden_name: string;
  name: string;
  photo_urls: PhotoUrls;
  bh_theme: Category;
  bh_floor: number;
  bh_location: string;
  url: string;
  about_me: string;

  // profile_url?: string;
  // public?: boolean;
  // guid?: string;
  // middle_name?: string;
  // suffix?: string;
  // display_name?: string;
  // is_alive?: boolean;
  // created_by?: string;
  // big_tree?: boolean;
  // claimed?: boolean;
  // language?: string;
  // mugshot_urls?: object;
  // unions?: Array<string>;
  // relationship?: string;
  // marriage_orders?: object;
  // birth_order?: number;
  // living?: boolean;
  // creator?: string;
  // account_type?: string;
  // nicknames?: Array<string>;
  // location?: object;
  // created_at?: string;
  // updated_at?: string;
  // deleted?: boolean;
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
