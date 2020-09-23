import { Component, Input, OnInit } from '@angular/core';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { profileUrl } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { Gender, LivingDetails } from 'src/app/model/Profile';
import Connection from 'src/app/model/ProfileRelation';
import { GeniService } from 'src/app/services/geni.service';

@Component({
  selector: 'app-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css'],
})
export class ConnectionComponent implements OnInit {
  @Input() connection: Connection;
  @Input() step_count?: number = 0;
  @Input() relatedConnection?: Connection;
  @Input() direct?: boolean = false;
  @Input() isFinalIndirectConnection?: boolean = false;
  @Input() drawArrowDown?: boolean = true;
  profileUrl = profileUrl;

  faAngleDown = faAngleDown;
  faAngleUp = faAngleUp;

  expanded: boolean = false;

  constructor(private auth: AuthService, private geni: GeniService) {}

  ngOnInit(): void {
    if (this.direct) {
      this.toggleExpandedHandler();
    }
  }

  toggleExpandedHandler(): void {
    if (this.connection.profile) {
      this.expanded = !this.expanded;
    } else {
      if (!this.expanded) {
        this.geni
          .fetchProfileByLink(this.connection.url, [
            'gender',
            'name',
            'photo_urls',
            'birth',
            'death',
          ])
          .subscribe((profile) => {
            this.connection.profile = profile;
            this.expanded = !this.expanded;
          });
      }
    }
  }

  get relationImgUlr(): string {
    return this.connection.profile?.photo_urls?.medium;
  }

  get relation(): string {
    if (this.relatedConnection?.url === this.auth.user.url) {
      return `your ${this.connection.relation}`;
    } else {
      return (
        `${this.gender === Gender.MALE ? 'his' : 'her'} ${
          this.connection.relation
        }` || Gender.UNDEFINED
      );
    }
  }

  get gender(): Gender {
    return this.connection.profile?.gender || this.connection.gender;
  }

  get livingDates(): string {
    let birthYear = '',
      deathYear = '';

    if (this.connection.profile) {
      if (this.connection.profile.birth) {
        const birth: LivingDetails = this.connection.profile.birth;
        birthYear = `${birth.date.year}`;
      }

      if (this.connection.profile.death) {
        const death: LivingDetails = this.connection.profile.death;
        deathYear = `${death.date.year}`;
      }
    }

    return `${birthYear}${deathYear ? ' - ' + deathYear : ''}`;
  }
}
