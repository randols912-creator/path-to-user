import { Component, OnInit } from '@angular/core';
import { RelationService, Status } from 'src/app/services/relation.service';

import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import Connection from 'src/app/model/ProfileRelation';
import Profile from 'src/app/model/Profile';
import Relation from 'src/app/model/Relation';

@Component({
  selector: 'app-relation',
  templateUrl: './relation.component.html',
  styleUrls: ['./relation.component.css'],
})
export class RelationComponent implements OnInit {
  relation: Relation;
  loading: boolean;

  constructor(
    private relationService: RelationService,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.relationService.status.subscribe((status) => {
      if (
        !this.relation &&
        (status == Status.READY || status == Status.PART_FETCHED)
      ) {
        this.prepareRelation();
      }
    });
  }

  private prepareRelation(): void {
    const relation = this.relationService.getRelation(
      this.route.snapshot.params.id
    );

    if (relation && relation.profile_relations) {
      relation.profile_relations.forEach((relation) => {
        const urlParts = relation.url.split('/');
        relation.id = urlParts[urlParts.length - 1];
      });

      this.relation = relation;
    }
  }

  get user(): Profile {
    return this.auth.user;
  }

  get connections(): Array<Connection> {
    return this.relation.profile_relations;
  }
}
