import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { welcomeUrl } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {
  constructor(
    private location: Location,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  goToPreviousLocation(): void {
    this.location.back();
  }

  logoutHandler(realy: boolean): void {
    console.log('clicked');

    if (realy) {
      this.auth.logout();
      this.router.navigate([welcomeUrl]);
    }
  }
}
