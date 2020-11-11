import { Component, Input } from '@angular/core';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-read-more-footer',
  templateUrl: './read-more-footer.component.html',
  styleUrls: ['./read-more-footer.component.css'],
})
export class ReadMoreFooterComponent {
  @Input() profile: Profile;
  @Input() relation: Path;

  constructor(private settings: SettingsService, private i18n: I18nService) {}

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.profile,
      this.settings.getLocale()
    );
  }
}
