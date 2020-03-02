import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  geniConf,
  geniTokenExpiresStorageKey,
  geniTokenStorageKey,
} from '../app.constants';

declare var Geni: any;

@Injectable({
  providedIn: 'root',
})
export class GeniService {
  private geni: any;

  constructor() {
    this.geni = Geni.init({
      ...geniConf,
      access_token: this.token,
    });
  }

  login(): Observable<void> {
    return new Observable(observer => {
      this.geni.connect(resp => {
        if (resp.status === GeniStatus.AUTHORIZED) {
          this.setToken(resp);
          observer.next();
        }
      });
    });
  }

  logout(): Observable<void> {
    return new Observable(observer => {
      this.geni.disconnect();
      this.setToken(null);
      observer.next();
    });
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

  private setToken(geniAuthResp: any | null) {
    if (geniAuthResp) {
      const expDate = new Date(
        new Date().getTime() + +geniAuthResp.expires_in * 1000 // Seconds until the token will expire
      );
      localStorage.setItem(geniTokenStorageKey, geniAuthResp.access_token);
      localStorage.setItem(geniTokenExpiresStorageKey, expDate.toString());
    } else {
      localStorage.clear();
    }
  }
}

enum GeniStatus {
  AUTHORIZED = 'authorized',
}
