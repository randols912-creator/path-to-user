import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { homePath, welcomePhotos, termsOfUseUrl } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  photos = welcomePhotos;
  agreeToTerms: boolean = false;
  agreeToConnectRelatives: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private settings: SettingsService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate([homePath]);
    }
  }

  loginHandler(): void {
    this.authService.login();
  }

  checkboxCheckHandler({ target: { checked } }, flag: string) {
    this[flag] = checked;
  }

  get termsOfUseUrl() {
    return termsOfUseUrl;
  }
}
