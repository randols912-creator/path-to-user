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

  get relationImgUlr(): string {
    const { medium } = this.relation.profile.photo_urls;
    return medium;
  }

  get relationFullname(): string {
    const { first_name, middle_name, last_name } = this.relation.profile;
    const full_name = `${first_name} ${middle_name} ${last_name}`;

    return this.relation.profile_name;
  }

  get livingDates(): string {
    const birth: LivingDetails = this.relation.profile.birth;

    return `${birth.date.year}`;
  }
}
