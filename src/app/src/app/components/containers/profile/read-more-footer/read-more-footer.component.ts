import { Component, Input, OnInit } from '@angular/core';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { RelationService } from 'src/app/services/relation.service';

@Component({
  selector: 'app-read-more-footer',
  templateUrl: './read-more-footer.component.html',
  styleUrls: ['./read-more-footer.component.css'],
})
export class ReadMoreFooterComponent implements OnInit {
  @Input() profile: Profile;
  relation: Path;

  constructor(private relations: RelationService) {}

  ngOnInit(): void {
    const relation = this.relations.getRelation(this.profile.id);
    if (relation) {
      this.relation = relation;
    } else {
      this.relations.fetchSingle(this.profile.id).subscribe((relation) => {
        this.relation = relation;
      });
    }
  }
}
