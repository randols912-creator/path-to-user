import { Component } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  constructor(private settings: SettingsService) {}

  async share() {
    try {
      await window.navigator['share']({
        title: 'Geni App | Museum of the Jewish People',
        text:
          'Wouldn�t it be great to know if you have a family connection to famous Jewish people like Albert Einstein, Theodor Herzl or Barbra Streisand?',
        url: window.location.href,
      });
    } catch (err) {
      console.log(err);
      alert('Native sharing not supported.');
    }

    if (window.navigator) {
    } else {
      alert('Sharing not supported');
    }
  }

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
