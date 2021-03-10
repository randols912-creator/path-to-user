import { Component } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  constructor(private settings: SettingsService) {}

  share() {
    try {
      window.navigator['share']({
        title: 'Geni App | Museum of the Jewish People',
        text:
          'The Museum of the Jewish People at Beit Hatfutsot is more than a Museum. This unique global institution tells the ongoing and extraordinary story of the Jewish people.',
        url: window.location.href,
      });
    } catch (err) {
      console.log(err);
    }
  }

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }

  get logoHebrewSuffix() {
    return this.isHebrewLocale ? 'Heb' : 'Eng';
  }
}
