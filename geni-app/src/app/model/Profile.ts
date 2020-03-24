export default interface Profile {
  id?: string;
  url?: string;
  profile_url?: string;
  public?: boolean;
  guid?: string;
  first_name?: string;
  middle_name?: string;
  maiden_name?: string;
  last_name?: string;
  name?: string;
  is_alive?: boolean;
  gender?: Gender;
  created_by?: string;
  big_tree?: boolean;
  claimed?: boolean;
  language?: string;
  mugshot_urls?: object;
  unions?: Array<string>;
  relationship?: string;
  marriage_orders?: object;
  birth_order?: number;
  living?: boolean;
  creator?: string;
  account_type?: string;
  birth?: LivingDetails;
  death?: LivingDetails;
  nicknames?: Array<string>;
  location?: object;
  photo_urls?: PhotoUrls;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
}

interface PhotoUrls {
  large?: string;
  medium?: string;
  small?: string;
  thumb?: string;
  print?: string;
  thumb2?: string;
  original?: string;
  url?: string;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNDEFINED = 'undefined',
}

export interface LivingDetails {
  date: DateDetails;
}

interface DateDetails {
  day: number;
  month: number;
  year: number;
  formatted_date: string;
}
