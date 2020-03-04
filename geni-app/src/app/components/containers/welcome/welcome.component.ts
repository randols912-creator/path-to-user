import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { welcomePhotos } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  photos = welcomePhotos;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  loginHandler(): void {
    this.authService.geniLogin();
  }
}
