import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import Profile from 'src/app/model/Profile';
import Relation from 'src/app/model/Relation';
import { RelationService } from 'src/app/services/relation.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  status: Status;

  constructor(
    private auth: AuthService,
    private relationService: RelationService
  ) {}

  ngOnInit(): void {
    if (!this.relations.length) {
      this.status = Status.SEARCHING;
      this.relationService.init().subscribe(
        (isEmptyUserProfile) => {
          if (isEmptyUserProfile) {
            console.log('Source or target profiles are empty');
            this.relationService.setupNewUserProfile();
          } else {
            this.status = Status.READY;
          }
        },
        (reason) => {
          console.error(reason);
          this.status = Status.ERROR;
        }
      );
    }
  }

  get user(): Profile {
    return this.auth.user;
  }

  get relations(): Array<Relation> {
    return this.relationService.getRelations();
  }

  get loading(): boolean {
    return this.status === Status.SEARCHING;
  }
}

enum Status {
  READY = 'All the data successfuly fetched',
  SEARCHING = "We're searching for people connected to you...",
  ERROR = 'Error! See the console',
}
