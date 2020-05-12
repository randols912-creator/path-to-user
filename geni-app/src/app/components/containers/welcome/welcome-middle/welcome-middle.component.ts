import { Component } from '@angular/core';
import { welcomePhotos } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-welcome-middle',
  templateUrl: './welcome-middle.component.html',
  styleUrls: ['./welcome-middle.component.css'],
})
export class WelcomeMiddleComponent {
  photos = welcomePhotos;

  constructor(private authService: AuthService) {}

  loginHandler(): void {
    this.authService.login();
  }
}
