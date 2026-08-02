import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment as env } from 'src/environments/environment';
import { GENI_HOST, GENI_TOKEN_HEADER_KEY } from '../app.constants';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (request.method === 'JSONP') {
      if (request.url.startsWith(GENI_HOST)) {
        return next.handle(
          request.clone({
            params: request.params.set('access_token', this.auth.token),
          })
        );
      }
    }

    // All the assets are freely allowed
    if (
      !request.url.startsWith('/assets') &&
      !request.url.startsWith(GENI_HOST) &&
      request.url.startsWith(env.relationsServiceHost)
    ) {
      return next.handle(
        request.clone({
          headers: request.headers.set(GENI_TOKEN_HEADER_KEY, this.auth.token),
        })
      );
    }

    return next.handle(request);
  }
}
