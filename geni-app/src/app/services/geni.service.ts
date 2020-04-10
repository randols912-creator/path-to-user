import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  geniApiUrl,
  geniOauthUrl,
  geniTokenExpiresStorageKey,
  geniTokenStorageKey,
} from '../app.constants';
import Profile from '../model/Profile';

declare var Geni: any;

@Injectable({
  providedIn: 'root',
})
export class GeniService {
  private geni: any;

  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = geniOauthUrl;
  }

  fetchProfile(profile: string, fields?: Array<string>): Observable<Profile> {
    return this.http.jsonp<Profile>(
      `${geniApiUrl}/${profile}${fields ? '?fields=' + fields.join(',') : ''}`,
      'callback'
    );
  }

  fetchProfileByLink(
    link: string,
    fields?: Array<string>
  ): Observable<Profile> {
    return this.http.jsonp<Profile>(
      `${link}${fields ? '?fields=' + fields.join(',') : ''}`,
      'callback'
    );
  }
}

// TODO - remove Geni SDK completely
const tempToken = (): string | null => {
  if (!localStorage.getItem(geniTokenStorageKey)) {
    return null;
  }

  const expDate = new Date(localStorage.getItem(geniTokenExpiresStorageKey));

  if (new Date() > expDate) {
    this.logout();
    return null;
  }

  return localStorage.getItem(geniTokenStorageKey);
};
