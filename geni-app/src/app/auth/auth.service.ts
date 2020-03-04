import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  geniOauthUrl,
  geniTokenExpiresStorageKey,
  geniTokenStorageKey,
} from '../app.constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private router: Router) {}

  /**
   * Navigates to Geni for Authorization
   */
  geniLogin(): void {
    window.location.href = geniOauthUrl;
  }

  logout(): void {}

  isAuthenticated(): boolean {
    return !!this.token;
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

  setToken(tokenDetails: any | null) {
    if (tokenDetails) {
      const { access_token, expires_in } = tokenDetails;

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
