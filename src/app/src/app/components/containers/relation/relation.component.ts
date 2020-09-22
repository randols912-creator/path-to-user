import { Component, OnDestroy, OnInit } from '@angular/core';
import { RelationService, Status } from 'src/app/services/relation.service';

import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import Connection from 'src/app/model/ProfileRelation';
import Profile from 'src/app/model/Profile';
import Path, { PathDetailsResponse } from 'src/app/model/Path';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-relation',
  templateUrl: './relation.component.html',
  styleUrls: ['./relation.component.css'],
})
export class RelationComponent implements OnInit, OnDestroy {
  relation: Path;
  connections: Connection[];
  relationship: string;
  loading: boolean;
  relationServiceSub: Subscription;

  constructor(
    private relationService: RelationService,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    let relation = this.relationService.getRelation(
      this.route.snapshot.params.id
    );

    if (relation) {
      this.fetchRelationDetailsAndSetCurrentRelation(relation);
    } else {
      const relationServiceSub = this.relationService.status
        .pipe(filter((status) => status in [Status.READY, Status.PART_FETCHED]))
        .subscribe((status) => {
          relation = this.relationService.getRelation(
            this.route.snapshot.params.id
          );

          if (relation && !this.relation && !this.connections?.length) {
            this.fetchRelationDetailsAndSetCurrentRelation(relation);
          }
        });
    }
  }

  private fetchRelationDetailsAndSetCurrentRelation(relation: Path) {
    this.relationService
      .fetchRelationDetails(relation)
      .subscribe(
        ({ path: { relationship, relations } }: PathDetailsResponse) => {
          relations.forEach((relation) => {
            const urlParts = relation.url.split('/');
            relation.id = urlParts[urlParts.length - 1];
          });

          this.relation = relation;
          this.connections = relations;
          this.relationship = relationship;
        }
      );
  }

  ngOnDestroy(): void {
    this.relationServiceSub?.unsubscribe;
  }

  get user(): Profile {
    return this.auth.user;
  }
}
