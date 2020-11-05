import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { RELATION_PATH } from 'src/app/app.constants';
import { Category, getColor, getText } from 'src/app/model/Category';
import Path from 'src/app/model/Path';
import { Gender, LivingDetails } from 'src/app/model/Profile';

@Component({
  selector: 'app-relation-card',
  templateUrl: './relation-card.component.html',
  styleUrls: ['./relation-card.component.css'],
})
export class RelationCardComponent implements AfterViewInit {
  @Input() relation: Path;
  collapsed: boolean = true;
  relationPath: string = RELATION_PATH;
  @ViewChild('relationCard') relationCardRef: ElementRef;

  ngAfterViewInit() {
    setTimeout(
      () => this.relationCardRef.nativeElement.classList.add('visible'),
      500
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

  get relationFullname(): string {
    return this.relation.target_profile?.name;
  }

  get livingDates(): string {
    let birthYear = '',
      deathYear = '';

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

  categoryColor(category: Category): string {
    return getColor(category);
  }

  categoryText(category: Category): string {
    return getText(category);
  }
}
