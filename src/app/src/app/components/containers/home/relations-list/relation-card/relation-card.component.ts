import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { RELATION_PATH } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { Gender, LivingDetails } from 'src/app/model/Profile';
import { getColor, Theme } from 'src/app/model/Theme';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-relation-card',
  templateUrl: './relation-card.component.html',
  styleUrls: ['./relation-card.component.css'],
})
export class RelationCardComponent implements AfterViewInit {
  @Input() relation: Path;
  collapsed = true;
  relationPath: string = RELATION_PATH;
  @ViewChild('relationCard') relationCardRef: ElementRef;

  constructor(private settings: SettingsService, private i18n: I18nService) {}

  ngAfterViewInit() {
    setTimeout(
      () => this.relationCardRef.nativeElement.classList.add('visible'),
      250
    );
  }

  collapseFullnameHandler(): void {
    this.collapsed = !this.collapsed;
  }

  get gender(): Gender {
    return this.relation.target_profile?.gender || Gender.UNDEFINED;
  }

  get relationImgUlr(): string {
    return this.relation.target_profile?.photo_urls?.medium;
  }

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.relation.target_profile,
      this.settings.getLocale()
    );
  }

  get livingDates(): string {
    let birthYear = '';
    let deathYear = '';

    if (this.relation.target_profile.birth?.date) {
      const birth: LivingDetails = this.relation.target_profile.birth;
      birthYear = `${birth.date.year}`;
    }

    if (this.relation.target_profile.death?.date) {
      const death: LivingDetails = this.relation.target_profile.death;
      deathYear = ` - ${death.date.year}`;
    }

    return `${birthYear}${deathYear}`;
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }
}
