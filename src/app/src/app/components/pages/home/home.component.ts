import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { PROFILE_POPUP_PATH } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import {
  RelationService,
  Status as ServiceStatus,
} from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';
import { GeniService } from 'src/app/services/geni.service';

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
  isProjectTarget = false;
  constructor(
    private auth: AuthService,
    private relationService: RelationService,
    private settingsService: SettingsService,
    private geniService: GeniService,
    private router: Router
  ) {}

  // Halt a long-running search but keep the results found so far.
  stopSearch(): void {
    this.relationService.stop();
  }

  // Go back to the picker to choose a different profile or project.
  changeTarget(): void {
    this.router.navigate([`/${PROFILE_POPUP_PATH}`]);
  }

  get stopped(): boolean {
    return this.relationService.wasStopped;
  }

  // "N of TOTAL" for a project (so you can see how many more it's checking),
  // just "N" for a single profile target or before the total is known.
  get foundCount(): string {
    const n = this.relations.length;
    const total = this.relationService.projectTotal;
    return (this.isProjectTarget && total > n) ? `${n} of ${total}` : `${n}`;
  }

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

    this.retrieveNames();
  }

  retrieveNames() {
    // Retrieve source/target names
    let sourceTarget = this.settingsService.getSourceTarget();

    // Retrieve source name from source profile id  
    if (sourceTarget.sourceId) {
      this.sourceText = sourceTarget.sourceId;
      this.geniService.fetchProfiles([sourceTarget.sourceId]).subscribe(({ results: [profile] }) => {
        this.sourceText = profile.name;
      }, console.log);  
    } else {
    // No source id -> the name is "you"
    this.sourceText =  "you";
    }
    // Retrieve target name either from target profile or project id.
    // Prefer the name already captured at selection time; fall back to the id,
    // then refine from the API — but never overwrite with an empty/undefined name
    // (a rate-limited Geni response can come back without one).
    this.targetText = sourceTarget.targetName
      ? `(${sourceTarget.targetName})`
      : '(' + sourceTarget.targetId + ")";
    this.isProjectTarget = String(sourceTarget.targetId || '').startsWith('project');
    if (sourceTarget.targetId.startsWith('project')) {
      this.geniService.projectDetails(sourceTarget.targetId).subscribe(({ project: project }) => {
        if (project && project.name) { this.targetText = `(${project.name})`; }
      }, console.log);
    } else {
      this.geniService.fetchProfiles([sourceTarget.targetId]).subscribe(({ results: [profile] }) => {
        if (profile && profile.name) { this.targetText = `(${profile.name})`; }
      }, console.log);
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
