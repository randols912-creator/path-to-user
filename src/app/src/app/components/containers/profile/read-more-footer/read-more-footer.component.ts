import { Component, Input, OnInit } from '@angular/core';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { I18nService } from 'src/app/services/i18n.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-read-more-footer',
  templateUrl: './read-more-footer.component.html',
  styleUrls: ['./read-more-footer.component.css'],
})
export class ReadMoreFooterComponent implements OnInit {
  @Input() profile: Profile;
  relation: Path;

  constructor(
    private relations: RelationService,
    private settings: SettingsService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    const relation = this.relations.getRelation(this.profile.id);
    if (relation) {
      this.relation = relation;
    } else {
      this.relations.fetchSingle(this.profile.id).subscribe((r) => {
        this.relation = r;
      });
    }
  }

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.profile,
      this.settings.getLocale()
    );
  }
}
