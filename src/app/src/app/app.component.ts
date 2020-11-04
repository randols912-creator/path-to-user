import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { routeChangeAnimation } from './app-route-change-animation';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [routeChangeAnimation],
})
export class AppComponent {
  constructor(private settings: SettingsService) {};

  getRouteAnimationState(outlet: RouterOutlet) {
    return (
      outlet &&
      outlet.activatedRouteData &&
      outlet.activatedRouteData['animation']
    );
  }
}
