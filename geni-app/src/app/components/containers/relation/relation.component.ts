import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import Profile from 'src/app/model/Profile';
import Connection from 'src/app/model/ProfileRelation';
import Relation from 'src/app/model/Relation';
import { RelationService } from 'src/app/services/relation.service';

@Component({
  selector: 'app-relation',
  templateUrl: './relation.component.html',
  styleUrls: ['./relation.component.css'],
})
export class RelationComponent implements OnInit {
  relation: Relation;

  constructor(
    private relationService: RelationService,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.relationService
      .getRelation(this.route.snapshot.params.id)
      .subscribe((relation) => {
        relation.profile_relations.forEach((relation) => {
          const urlParts = relation.url.split('/');
          relation.id = urlParts[urlParts.length - 1];
        });
        this.relation = relation;
      });
  }

  get user(): Profile {
    return this.auth.user;
  }

  get connections(): Array<Connection> {
    return this.relation.profile_relations;
  }
}
