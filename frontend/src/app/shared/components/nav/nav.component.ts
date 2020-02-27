import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import consts from './../../constants';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css'],
})
export class NavComponent implements OnInit {
  @ViewChild('drawer', { static: false }) sidenav: MatSidenav;

  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.isAuth) {
      this.router.navigate([consts.homeURL]);
    }
  }

  onLogin() {
    this.auth.login().subscribe(() => this.onAuthChange(consts.homeURL));
  }

  onLogout() {
    this.auth.logout().subscribe(() => this.onAuthChange(consts.welcomeURL));
  }

  onAuthChange(route: string) {
    this.router.navigate([route]);
    if (this.sidenav.opened) {
      this.sidenav.close();
    }
  }

  get isAuth(): boolean {
    return this.auth.isAuthenticated();
  }
}
