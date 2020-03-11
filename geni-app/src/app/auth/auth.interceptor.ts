import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  geniHost,
  geniTokenHeaderKey,
  relationsServiceHost,
} from '../app.constants';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (request.method === 'JSONP') {
      if (request.url.startsWith(geniHost)) {
        return next.handle(
          request.clone({
            params: request.params.set('access_token', this.auth.token),
          })
        );
      }
    }

    if (request.url.startsWith(relationsServiceHost)) {
      return next.handle(
        request.clone({
          headers: request.headers.set(geniTokenHeaderKey, this.auth.token),
        })
      );
    }

    return next.handle(request);
  }
}
