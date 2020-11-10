import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import {
  RelationService,
  Status as ServiceStatus
} from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';


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
    this.relationService.status.subscribe((status) => {
      switch (status) {
        case ServiceStatus.READY:
          this.status = Status.READY;
          break;
        case ServiceStatus.ERROR:
          this.status = Status.ERROR;
          break;
        default:
          this.status = Status.SEARCHING;
      }
    });
  }

  get user(): Profile {
    return this.auth.user;
  }

  get relations(): Array<Path> {
    return this.relationService.getRelations();
  }

  get loading(): boolean {
    return this.status === Status.SEARCHING;
  }
}

enum Status {
  READY,
  SEARCHING,
  ERROR,
}
