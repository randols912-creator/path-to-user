import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { appSettingsStorageKey } from '../app.constants';
import { RelationSortOrder } from '../pipes/relations-sort-by.pipe';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settings: Settings;

  constructor(private translate: TranslateService) {
    if (!localStorage.getItem(appSettingsStorageKey)) {
      this.initSettings();
    } else {
      this.settings = this.restoreSettings();
    }

    translate.use(this.settings.locale);
  }

  private initSettings() {
    this.settings = { sort: RelationSortOrder.DEFAULT, locale: Locale.EN };
    this.saveSettings();
  }

  private restoreSettings() {
    return JSON.parse(localStorage.getItem(appSettingsStorageKey));
  }

  private saveSettings() {
    return localStorage.setItem(
      appSettingsStorageKey,
      JSON.stringify(this.settings)
    );
  }

  getSortOrder(): RelationSortOrder {
    return this.settings.sort;
  }

  setSortOrder(orderKey: RelationSortOrder) {
    this.settings.sort = orderKey;
    this.saveSettings();
  }

  getLocale(): Locale {
    return this.settings.locale;
  }

  setLocale(locale: Locale): void {
    this.settings.locale = locale;
    this.translate.use(this.settings.locale);
    this.saveSettings();
  }

  getNextLocale(): Locale {
    const entries = Object.entries(Locale);
    const currentLcIdx = entries.findIndex(
      ([, v]) => this.settings.locale === v
    );
    return Locale[
      entries[(entries.length + currentLcIdx + 1) % entries.length][0]
    ];
  }

  switchToNextLocale(): void {
    this.setLocale(this.getNextLocale());
  }
}

export interface Settings {
  sort: number;
  locale: Locale;
}

export enum Locale {
  EN = 'en',
  HE = 'he',
}
