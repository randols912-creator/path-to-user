import { Component, Input, OnInit } from '@angular/core';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { PROFILE_PATH } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import Path from 'src/app/model/Path';
import { Gender, LivingDetails } from 'src/app/model/Profile';
import Connection from 'src/app/model/ProfileRelation';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css'],
})
export class ConnectionComponent implements OnInit {
  @Input() connection: Connection;
  @Input() stepCount = 0;
  @Input() relatedConnection?: Connection;
  @Input() direct = false;
  @Input() drawArrowDown = true;
  @Input() expandable = true;
  @Input() expanded = false;
  @Input() clickable = true;

  faAngleDown = faAngleDown;
  faAngleUp = faAngleUp;

  constructor(
    private auth: AuthService,
    private settings: SettingsService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    if (this.direct) {
      this.toggleExpandedHandler();
    }
  }

  toggleExpandedHandler(): void {
    this.expanded = !this.expanded;
  }

  get localizedFullname(): string {
    return (
      this.i18n.extractProfileFullname(
        this.connection.target_profile,
        this.settings.getLocale()
      ) || this.connection.name
    );
  }

  get relation(): string {
    return this.i18n.translateRelation(
      this.isUser ? 'your' : this.relatedConnection?.gender,
      this.connection.relation
    );
  }

  get profileUrl() {
    return `/${PROFILE_PATH}`;
  }

  get relationImgUlr(): string {
    return this.connection.target_profile?.photo_urls?.medium;
  }

  get isUser(): boolean {
    return this.relatedConnection?.url === this.auth.user.url;
  }

  get gender(): Gender {
    return this.connection.target_profile?.gender || this.connection.gender;
  }

  get livingDates(): string {
    let birthYear = '';
    let deathYear = '';

    if (this.connection.target_profile) {
      if (this.connection.target_profile.birth) {
        const birth: LivingDetails = this.connection.target_profile.birth;
        birthYear = `${birth.date.year}`;
      }

      if (this.connection.target_profile.death) {
        const death: LivingDetails = this.connection.target_profile.death;
        deathYear = `${death.date.year}`;
      }
    }

    return `${birthYear}${deathYear ? ' - ' + deathYear : ''}`;
  }
}
