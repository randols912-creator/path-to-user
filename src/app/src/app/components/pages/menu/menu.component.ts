import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ABOUT_PATH, WELCOME_PATH } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
    private settings: SettingsService
  ) {}

  ngOnInit(): void {}

  logoutHandler(): void {
    this.auth.logout();
    this.router.navigate([`/${WELCOME_PATH}`]);
  }

  switchLocaleHandler(): void {
    this.settings.switchToNextLocale();
  }

  get isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  get aboutUrl() {
    return `/${ABOUT_PATH}`;
  }
}
