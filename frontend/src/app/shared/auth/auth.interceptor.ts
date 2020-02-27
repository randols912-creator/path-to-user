import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import consts from '../constants';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(
      req.clone({
        headers: req.headers.append(consts.geniTokenHeaderKey, this.auth.token),
      })
    );
  }
}
