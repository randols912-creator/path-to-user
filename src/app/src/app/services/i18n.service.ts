import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Locale } from '../model/Locale';
import Profile, { NameDetails } from '../model/Profile';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  constructor(private translate: TranslateService) {}

  extractProfileFullname(profile: Profile, locale: Locale): string {
    const localizedName: NameDetails = profile?.names && profile?.names[locale];

    if (localizedName) {
      const {
        display_name = '',
        first_name = '',
        last_name = '',
      } = localizedName;
      return (
        display_name ||
        `${first_name}${(first_name ? ' ' : '') + last_name}` ||
        profile?.name
      );
    }

    return profile?.name;
  }

  translateRelation(whos: string, relation: string): string {
    return this.translate.instant(`relation.rel.${relation}`, {
      value: this.translate.instant(`relation.whos.${whos}`),
    });
  }
}
