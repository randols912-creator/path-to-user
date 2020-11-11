import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { subscribeOn, tap } from 'rxjs/operators';
import { Locale } from 'src/app/model/Locale';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { GeniService } from 'src/app/services/geni.service';
import { I18nService } from 'src/app/services/i18n.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';

declare var Wiky: any;

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
    private route: ActivatedRoute,
    private settings: SettingsService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.geni
      .fetchProfile(this.route.snapshot.params.id, [
        'id',
        'name',
        'names',
        'first_name',
        'last_name',
        'photo_urls',
        'birth',
        'detail_strings',
        'profile_url',
      ])
      .subscribe((profile) => {
        this.profile = profile;
        const relation = this.relations.getRelation(this.profile.id);
        if (relation) {
          this.relation = relation;
        } else {
          this.relations.fetchSingle(this.profile.id).subscribe((r) => {
            this.relation = r;
          });
        }
      });
  }

  get about() {
    return this.profile?.detail_strings[this.settings.getLocale()]?.about_me;
  }

  convertMdToHtml(markdown: string): string {
    return Wiky.toHtml(markdown);
  }

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.profile,
      this.settings.getLocale()
    );
  }

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
