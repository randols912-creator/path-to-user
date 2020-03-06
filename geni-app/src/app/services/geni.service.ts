import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { geniClientId } from '../app.constants';
import { AuthService } from '../auth/auth.service';

declare var Geni: any;

@Injectable({
  providedIn: 'root',
})
export class GeniService {
  private geni: any;

  constructor(private http: HttpClient, private auth: AuthService) {
    const geniConf = {
      app_id: geniClientId,
      access_token: auth.token,
      logging: true,
    };
    this.geni = Geni.init(geniConf);
  }

  getStatus(): void {
    this.geni.api('/profile', resp => {
      console.log(resp);
    });
  }
}
