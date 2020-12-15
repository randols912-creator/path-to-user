import { Component, Input } from '@angular/core';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

declare var Wiky: any;

@Component({
  selector: 'app-profile-details',
  templateUrl: './profile-details.component.html',
  styleUrls: ['./profile-details.component.css'],
})
export class ProfileDetailsComponent {
  @Input() profile: Profile;
  @Input() relation: Path;

  constructor(private settings: SettingsService, private i18n: I18nService) {}

  get about() {
    return (
      (this.profile?.detail_strings &&
        this.profile?.detail_strings[this.settings.getLocale()]?.about_me) ||
      this.profile?.about_me
    );
  }

  convertMdToHtml(markdown: string): string {
    return Wiky.toHtml(markdown);
  }

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.profile,
      this.settings.getLocale()
    );
  }

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }

  get searchLink() {
    return `https://dbs.anumuseum.org.il/skn/${
      this.isHebrewLocale ? 'he' : 'en'
    }/c6/BH/Search#query=${this.localizedFullname}`;
  }
}
