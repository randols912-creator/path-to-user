import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { APP_SETTINGE_STORAGE_KEY, HOME_PATH, MENU_PATH, SETTINGS_PATH } from 'src/app/app.constants';
import { SettingsService } from 'src/app/services/settings.service';
import { SettingsAction } from '../../pages/settings/settings.component';
import { RelationSortOrder } from 'src/app/pipes/relations-sort-by.pipe';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.css'],
})
export class TitleBarComponent {
  @Input() showTitle = true;
  @Input() showMenu = true;
  @Input() showGoBack = false;
  @Input() showGoToAllResultsText = false;
  @Input() showGoToAllResultsButton = false;
  @Input() showSettings = false;
  @Input() showP2P = false;
  @Input() showMenuHome = false;

  public sort = JSON.parse(localStorage.getItem(APP_SETTINGE_STORAGE_KEY))
  @Input() settingsAction: SettingsAction;

  @Output() toggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private location: Location,
    private router: Router,
    private settingsService: SettingsService
  ) {}

  get settingsUrl() {
    return `/${SETTINGS_PATH}`;
  }

  goBackHandler(): void {
    if (window.history.length > 2) {
      this.location.back();
    } else {
      this.goToAllResults();
    }
  }

  gotoMenuHandler(): void {
    this.router.navigate([`/${MENU_PATH}`]);
  }

  goToAllResults(): void {
    this.router.navigate([`/${HOME_PATH}`]);
  }

  getAppliedFilterCount() {
    let count = 0;
    let filters = this.settingsService.getFilterOrder();

    if(filters?.gender) {
      count += 1
    }

    if(filters?.fromYear && filters?.toYear) {
      count += 1
    }

    if(filters?.country?.length) {
      count += 1
    }

    if(filters?.museum?.length) {
      count += 1
    }

    if(filters?.profession?.length) {
      count += 1
    }

    return count
  }

  isDefaultSort() {
    return this.sort.sort == RelationSortOrder.CONNECTIONS;
  }

}
