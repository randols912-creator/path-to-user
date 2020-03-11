import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { homeUrl, welcomeUrl } from '../app.constants';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    // Trying to obtain auth data from URL
    if (
      !this.authService.isAuthenticated() &&
      'access_token' in next.queryParams &&
      'expires_in' in next.queryParams
    ) {
      const { access_token, expires_in } = next.queryParams;
      this.authService.storeTokenAndFetchUserDetails(access_token, expires_in);
      return this.router.navigate([homeUrl]);
    }

    if (this.authService.isAuthenticated()) {
      return true;
    }

    return this.router.navigate([welcomeUrl]);
  }
}
