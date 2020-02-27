import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import consts from '../constants';

declare var Geni: any;

@Injectable({
  providedIn: 'root',
})
export class GeniService {
  private geni: any;

  constructor() {
    const geniConf = {
      ...consts.geniConf,
      access_token: this.token,
    };
    this.geni = Geni.init(geniConf);
  }

  login(): Observable<void> {
    return new Observable(observer => {
      this.geni.connect(resp => {
        if (resp.status === 'authorized') {
          this.setToken(resp);
          observer.next();
        }
      });
    });
  }

  logout(): Observable<void> {
    return new Observable(observer => {
      // Not waiting anything, the following call triggers warn:
      // Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?
      this.geni.disconnect();
      this.setToken(null);
      observer.next();
    });
  }

  getDetails(path: string, cb: any, params = {}) {
    return this.geni.api(path, params, cb);
  }

  get token(): string | null {
    if (!localStorage.getItem(consts.geniTokenStorageKey)) {
      return null;
    }

    const expDate = new Date(
      localStorage.getItem(consts.geniTokenExpiresStorageKey)
    );

    if (new Date() > expDate) {
      this.logout();
      return null;
    }

    return localStorage.getItem(consts.geniTokenStorageKey);
  }

  private setToken(geniAuthResp: any | null) {
    if (geniAuthResp) {
      const expDate = new Date(
        new Date().getTime() + +geniAuthResp.expires_in * 1000 // Seconds until the token will expire
      );
      localStorage.setItem(
        consts.geniTokenStorageKey,
        geniAuthResp.access_token
      );
      localStorage.setItem(
        consts.geniTokenExpiresStorageKey,
        expDate.toString()
      );
    } else {
      localStorage.clear();
    }
  }
}
