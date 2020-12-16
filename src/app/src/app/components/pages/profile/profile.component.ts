import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { GeniService } from 'src/app/services/geni.service';
import { RelationService } from 'src/app/services/relation.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: Profile;
  relation: Path;

  constructor(
    private geni: GeniService,
    private relations: RelationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.fetchProfile();
  }

  fetchProfile() {
    this.geni
      .fetchProfiles(
        [this.route.snapshot.params.id],
        [
          'id',
          'name',
          'names',
          'first_name',
          'last_name',
          'photo_urls',
          'birth',
          'about_me',
          'detail_strings',
          'profile_url',
        ]
      )
      .subscribe(({ results: [profile], error }) => {
        if (!error) {
          this.profile = profile;
          const relation = this.relations.getRelation(this.profile.id);
          if (relation) {
            this.relation = relation;
          } else {
            this.relations.fetchSingle(this.profile.id).subscribe((r) => {
              this.relation = r;
            });
          }
        } else {
          setTimeout(() => this.fetchProfile(), 500);
        }
      });
  }
}
