import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { HOME_PATH, MENU_PATH, SETTINGS_PATH } from 'src/app/app.constants';
import { ModalService } from 'src/app/services/modal.service';
import { SettingsAction } from '../../pages/settings/settings.component';
import { P2pModalComponent } from '../p2p-modal/p2p-modal.component';

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

  @Input() settingsAction: SettingsAction;

  @Output() toggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private location: Location,
    private router: Router
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
}
