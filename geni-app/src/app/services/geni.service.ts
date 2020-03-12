import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  geniCurrentProfileUrl,
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

  constructor(private http: HttpClient) {
    // const geniConf = {
    //   app_id: geniClientId,
    //   access_token: tempToken(),
    //   logging: true,
    // };
    // this.geni = Geni.init(geniConf);
  }

  login(): void {
    window.location.href = geniOauthUrl;
  }

  fetchCurrentUserProfile(): Observable<Profile> {
    return this.http.jsonp<Profile>(geniCurrentProfileUrl, 'callback');
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
