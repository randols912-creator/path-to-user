import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  currentUserProfilePath,
  currentUserProfileStorageKey,
  geniTokenExpiresStorageKey,
  geniTokenStorageKey,
} from '../app.constants';
import Profile from '../model/Profile';
import { GeniService } from '../services/geni.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private router: Router, private geni: GeniService) {}

  /**
   * Navigates to Geni for Authorization
   */
  login(): void {
    this.geni.login();
  }

  storeTokenAndFetchUserDetails(
    access_token: string,
    expires_in: string
  ): void {
    this.setToken(access_token, expires_in);
    this.geni.fetchProfile(currentUserProfilePath).subscribe(profile => {
      localStorage.setItem(
        currentUserProfileStorageKey,
        JSON.stringify(profile)
      );
    });
  }

  logout(): void {
    this.setToken(null);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  get user(): Profile {
    return JSON.parse(localStorage.getItem(currentUserProfileStorageKey));
  }

  get token(): string | null {
    if (!localStorage.getItem(geniTokenStorageKey)) {
      return null;
    }

    const expDate = new Date(localStorage.getItem(geniTokenExpiresStorageKey));

    if (new Date() > expDate) {
      this.logout();
      return null;
    }

    return localStorage.getItem(geniTokenStorageKey);
  }

  private setToken(access_token: string | null, expires_in?: string) {
    if (access_token) {
      const expDate = new Date(
        new Date().getTime() + +expires_in * 1000 // Seconds until the token will expire
      );
      localStorage.setItem(geniTokenStorageKey, access_token);
      localStorage.setItem(geniTokenExpiresStorageKey, expDate.toString());
    } else {
      localStorage.clear();
    }
  }
}
