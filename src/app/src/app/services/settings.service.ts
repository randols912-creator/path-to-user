import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { APP_SETTINGE_STORAGE_KEY } from '../app.constants';
import { Locale } from '../model/Locale';
import { RelationSortOrder } from '../pipes/relations-sort-by.pipe';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private settings: Settings;

  constructor(private translate: TranslateService) {
    if (!localStorage.getItem(APP_SETTINGE_STORAGE_KEY)) {
      this.initSettings();
    } else {
      this.settings = this.restoreSettings();
    }

    translate.use(this.settings.locale);
  }

  private initSettings() {
    this.settings = { sort: RelationSortOrder.DEFAULT,
                      locale: Locale.EN,
                      p2p: true,
                      serachlist: '',
                      filter: {
                        gender:'',
                        fromYear: '',
                        toYear: '',
                        country: [],
                        museum: [],
                        profession: []
                      } };
    this.saveSettings();
  }

  private restoreSettings() {
    return JSON.parse(localStorage.getItem(APP_SETTINGE_STORAGE_KEY));
  }

  private saveSettings() {
    return localStorage.setItem(
      APP_SETTINGE_STORAGE_KEY,
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

  getFilterOrder() {
    return this.settings.filter;
  }

  setFilterOrder(filter) {
    this.settings.filter = filter;
    this.saveSettings();
  }

  getSerachOrder() {
    return this.settings.serachlist;
  }

  setSerachOrder(serach) {
    this.settings.serachlist = serach;
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

  get isHebrewLocale() {
    return this.getLocale() === Locale.HE;
  }

  setP2p(value: boolean) {
    this.settings.p2p = value;
    this.saveSettings();
  }

  getP2p(): boolean {
    return this.settings.p2p;
  }
}

export interface Settings {
  sort: number;
  locale: Locale;
  p2p: boolean;
  filter: any;
  serachlist: any;
}

export interface Filters {
  gender: string;
  fromYear: number;
  toYear: number;
  country: Array<string>;
  museum: Array<number>;
  profession: Array<string>;
}

