import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { routeChangeAnimation } from './app-route-change-animation';
import { Locale } from './model/Locale';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [routeChangeAnimation],
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    translate.setDefaultLang(Locale.EN);
  }

  getRouteAnimationState(outlet: RouterOutlet) {
    return (
      outlet &&
      outlet.activatedRouteData &&
      outlet.activatedRouteData['animation']
    );
  }
}
