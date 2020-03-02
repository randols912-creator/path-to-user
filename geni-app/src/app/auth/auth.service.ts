import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GeniService } from '../services/geni.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  auth = false;

  constructor(private geniService: GeniService) {}

  login(): Observable<void> {
    return this.geniService.login();
  }

  logout(): Observable<void> {
    return this.geniService.logout();
  }

  isAuthenticated(): boolean {
    return !!this.geniService.token;
  }
}
