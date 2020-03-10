import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { menuUrl } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import Profile from 'src/app/model/Profile';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {}

  gotoMenuHandler(): void {
    this.router.navigate([menuUrl]);
  }

  get user(): Profile {
    return this.auth.user;
  }
}
