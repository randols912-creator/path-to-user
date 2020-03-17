import { Component, Input, OnInit } from '@angular/core';
import { LivingDetails } from 'src/app/model/Profile';
import Relation from 'src/app/model/Relation';
import { GeniService } from 'src/app/services/geni.service';

@Component({
  selector: 'app-relation-card',
  templateUrl: './relation-card.component.html',
  styleUrls: ['./relation-card.component.css'],
})
export class RelationCardComponent implements OnInit {
  @Input() relation: Relation;
  collapsed: boolean = true;

  constructor(private geni: GeniService) {}

  ngOnInit(): void {
    if (!this.relation.profile) {
      this.geni
        .fetchProfileByLink(this.relation.profile_link)
        .subscribe(profile => {
          this.relation.profile = profile;
        });
    }
  }

  collapseFullnameHandler(): void {
    this.collapsed = !this.collapsed;
  }

  get gender(): string {
    return this.relation.profile && this.relation.profile.gender
      ? this.relation.profile.gender
      : '';
  }

  get relationImgUlr(): string {
    return (
      '' &&
      this.relation.profile &&
      this.relation.profile.photo_urls &&
      this.relation.profile.photo_urls.medium
    );
  }

  get relationFullname(): string {
    let full_name: string;

    if (this.relation.profile) {
      const { first_name, middle_name, last_name } = this.relation.profile;
      full_name = `${first_name}${middle_name ? ' ' + middle_name : ''}${
        last_name ? ' ' + last_name : ''
      }`;
    } else {
      full_name = this.relation.profile_name;
    }

    return full_name;
  }

  get livingDates(): string {
    let birthYear = '',
      deathYear = '';

    if (this.relation.profile) {
      if (this.relation.profile.birth) {
        const birth: LivingDetails = this.relation.profile.birth;
        birthYear = `${birth.date.year}`;
      }

      if (this.relation.profile.death) {
        const death: LivingDetails = this.relation.profile.death;
        deathYear = `${death.date.year}`;
      }
    }

    return `${birthYear}${deathYear ? ' - ' + deathYear : ''}`;
  }

  get nicknames(): string {
    return this.relation.profile && this.relation.profile.nicknames
      ? this.relation.profile.nicknames.map(n => `"${n}"`).join(', ')
      : '';
  }
}
