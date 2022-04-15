import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild
} from '@angular/core';
import { RELATION_PATH } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { Gender, LivingDetails, DateDetails, NameDetails } from 'src/app/model/Profile';
import { getColor, Theme } from 'src/app/model/Theme';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-relations-card-desktop',
  templateUrl: './relations-card-desktop.component.html',
  styleUrls: ['./relations-card-desktop.component.css']
})
export class RelationsCardDesktopComponent implements AfterViewInit{

  @Input() relation: Path;
  relationPath: string = RELATION_PATH;
  @ViewChild('relationCard') ref: ElementRef;

  constructor(private settings: SettingsService, private i18n: I18nService) {}

  ngAfterViewInit() {
    setTimeout(() => this.ref.nativeElement.classList.add('visible'), 250);
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
      if (birth && birth.date) {
        birthYear = `${birth.date.year}`;
      }
    }

    if (this.relation.target_profile.death?.date) {
      const death: LivingDetails = this.relation.target_profile.death;
      if (death && death.date) {
        deathYear = ` - ${death.date.year}`;
      }
    }

    return `${birthYear}${deathYear}`;
  }

  get formatedDate(): string {
    let fdate = '';
    if(this.relation.target_profile.birth?.date?.formatted_date){
      const fDate: DateDetails = this.relation.target_profile.birth?.date
      if(fDate && fDate.formatted_date){
        fdate = `${fDate.formatted_date}`
      }
    }
    return fdate
  }

  get nickName(): string{
    let nickname = '';
    if(this.relation.target_profile.names?.['en-US'].nicknames){
      const nick: NameDetails = this.relation.target_profile.names?.['en-US']
      if(nick && nick.nicknames){
        nickname = `${nick.nicknames}`
      }
    }
    return nickname
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }
}
