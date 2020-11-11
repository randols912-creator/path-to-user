import { Component, OnDestroy, OnInit } from '@angular/core';
import { RelationService, Status } from 'src/app/services/relation.service';

import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import Connection from 'src/app/model/ProfileRelation';
import Profile from 'src/app/model/Profile';
import Path, { PathDetailsResponse } from 'src/app/model/Path';
import { filter } from 'rxjs/operators';
import { BehaviorSubject, Subscription } from 'rxjs';

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
    private relations: RelationService,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const relationSubject = new BehaviorSubject(null);
    relationSubject.subscribe((relation) => {
      if (relation) {
        this.relations
          .fetchRelationDetails(relation)
          .subscribe(
            ({ path: { relationship, relations } }: PathDetailsResponse) => {
              relations.forEach((nextRelation) => {
                const urlParts = nextRelation.url.split('/');
                nextRelation.id = urlParts[urlParts.length - 1];
              });

              this.relation = relation;
              this.connections = relations;
              this.relationship = relationship;
            }
          );
      }
    });

    const relation = this.relations.getRelation(this.route.snapshot.params.id);
    if (relation) {
      relationSubject.next(relation);
    } else {
      this.relations
        .fetchSingle(this.route.snapshot.params.id)
        .subscribe((relation) => {
          relationSubject.next(relation);
        });
    }
  }

  ngOnDestroy(): void {
    this.relationServiceSub?.unsubscribe();
  }

  get user(): Profile {
    return this.auth.user;
  }
}
