import { Component, Input, OnInit } from '@angular/core';
import { relationPath } from 'src/app/app.constants';
import { Category, getColor, getText } from 'src/app/model/Category';
import { Gender, LivingDetails } from 'src/app/model/Profile';
import Path from 'src/app/model/Path';
import { GeniService } from 'src/app/services/geni.service';

const randomCategory = (): Category => {
  return Category[
    Object.keys(Category)[
      Math.floor(Math.random() * (Object.keys(Category).length - 1))
    ]
  ];
};

@Component({
  selector: 'app-relation-card',
  templateUrl: './relation-card.component.html',
  styleUrls: ['./relation-card.component.css'],
})
export class RelationCardComponent implements OnInit {
  @Input() relation: Path;
  collapsed: boolean = true;
  // TODO - real categories?
  categories: Array<Category> = [];
  relationPath: string = relationPath;

  constructor(private geni: GeniService) {}

  ngOnInit(): void {
    this.categories.push(this.relation.bh_theme);
  }

  collapseFullnameHandler(): void {
    this.collapsed = !this.collapsed;
  }

  get gender(): Gender {
    return this.relation.target_profile && this.relation.target_profile.gender
      ? this.relation.target_profile.gender
      : Gender.UNDEFINED;
  }

  get relationImgUlr(): string {
    return (
      this.relation.target_profile &&
      this.relation.target_profile.photo_urls &&
      this.relation.target_profile.photo_urls.medium
    );
  }

  get relationFullname(): string {
    return this.relation.target_profile.name;
  }

  get livingDates(): string {
    let birthYear = '',
      deathYear = '';

    if (
      this.relation.target_profile.birth &&
      this.relation.target_profile.birth.date
    ) {
      const birth: LivingDetails = this.relation.target_profile.birth;
      birthYear = `${birth.date.year}`;
    }

    if (
      this.relation.target_profile.death &&
      this.relation.target_profile.death.date
    ) {
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
