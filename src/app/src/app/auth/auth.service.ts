import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CURRENT_USER_PROFILE_STORAGE_KEY,
  GENI_TOKEN_EXPIRES_STORAGE_KEY,
  GENI_TOKEN_STORAGE_KEY,
} from '../app.constants';
import Profile from '../model/Profile';
import { GeniService } from '../services/geni.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isAuthenticatedSubj: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(private geni: GeniService) {
    this.isAuthenticatedSubj.next(!!this.token);
  }

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
    this.geni.fetchProfiles().subscribe(({ results: [profile] }) => {
      localStorage.setItem(
        CURRENT_USER_PROFILE_STORAGE_KEY,
        JSON.stringify(profile)
      );
    }, console.log);

    this.isAuthenticatedSubj.next(!!this.token);
  }

  logout(): void {
    this.setToken(null);
    this.isAuthenticatedSubj.next(!!this.token);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubj.value;
  }

  get user(): Profile {
    return JSON.parse(localStorage.getItem(CURRENT_USER_PROFILE_STORAGE_KEY));
  }

  get token(): string | null {
    if (!localStorage.getItem(GENI_TOKEN_STORAGE_KEY)) {
      return null;
    }

    const expDate = new Date(
      localStorage.getItem(GENI_TOKEN_EXPIRES_STORAGE_KEY)
    );

    if (new Date() > expDate) {
      this.logout();
      return null;
    }

    return localStorage.getItem(GENI_TOKEN_STORAGE_KEY);
  }

  private setToken(access_token: string | null, expires_in?: string) {
    if (access_token) {
      const expDate = new Date(
        new Date().getTime() + +expires_in * 1000 // Seconds until the token will expire
      );
      localStorage.setItem(GENI_TOKEN_STORAGE_KEY, access_token);
      localStorage.setItem(GENI_TOKEN_EXPIRES_STORAGE_KEY, expDate.toString());
    } else {
      localStorage.clear();
    }
  }
}
