import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ABOUT_PATH, WELCOME_PATH, HOME_PATH } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { SettingsService } from 'src/app/services/settings.service';
import { RelationService, Status as ServiceStatus } from 'src/app/services/relation.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {
  isLoadingStatus: boolean;

  constructor(
    private auth: AuthService,
    private router: Router,
    private settings: SettingsService,
    private relationService: RelationService
  ) {}

  ngOnInit(): void {
    this.relationService.status.subscribe((status) => {
      this.isLoadingStatus = !(status == ServiceStatus.ERROR || status == ServiceStatus.READY)
    });
  }

  logoutHandler(): void {
    this.auth.logout();
    this.router.navigate([`/${WELCOME_PATH}`]);
  }

  switchLocaleHandler(): void {
    this.settings.switchToNextLocale();
  }

  resetConnections(): void {
    this.relationService.reset();
    this.router.navigate([`/${HOME_PATH}`]);
  }

  get isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  get aboutUrl() {
    return `/${ABOUT_PATH}`;
  }

  get locale() {
    return this.settings.getLocale();
  }

  get isLoading() {
    return this.isLoadingStatus;
  }
}
