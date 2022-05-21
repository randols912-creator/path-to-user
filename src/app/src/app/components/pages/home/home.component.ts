import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import {
  RelationService,
  Status as ServiceStatus,
} from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  status: Status;
  public getScreenWidth: any;
  sourceText: any;
  targetText: any;
  constructor(
    private auth: AuthService,
    private relationService: RelationService,
    private settingsService: SettingsService
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
    this.getScreenWidth = window.innerWidth;
    let sourceTarget = this.settingsService.getSourceTarget();
    this.sourceText = sourceTarget.sourceId ? sourceTarget.sourceId : "you";
    if (sourceTarget.targetId.startsWith('project')) {
      this.targetText = '(from ' + sourceTarget.targetId + ")"; 
    } else {
      this.targetText = '(' + sourceTarget.targetId + ")"; 
    }

  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.getScreenWidth = window.innerWidth;
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
