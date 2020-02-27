import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import consts from './../../constants';

@Component({
  selector: 'app-welcome-page',
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.css'],
})
export class WelcomePageComponent {
  constructor(private auth: AuthService, private router: Router) {}

  onAuthorize() {
    this.auth.login().subscribe(() => {
      this.router.navigate([consts.homeURL]);
    });
  }
}
