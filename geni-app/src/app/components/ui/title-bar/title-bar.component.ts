import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { homeUrl, menuUrl, settingsUrl } from 'src/app/app.constants';
import { SettingsAction } from '../../containers/settings/settings.component';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.css'],
})
export class TitleBarComponent implements OnInit {
  @Input() showTitle: boolean = true;
  @Input() showMenu: boolean = true;
  @Input() showGoBack: boolean = false;
  @Input() showGoToAllResultsText: boolean = false;
  @Input() showGoToAllResultsButton: boolean = false;
  @Input() showSettings: boolean = false;

  @Input() settingsAction: SettingsAction;
  settingsUrl = settingsUrl;

  @Output() onToggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor(public location: Location, private router: Router) {}

  ngOnInit(): void {}

  gotoMenuHandler(): void {
    this.router.navigate([menuUrl]);
  }

  goToAllResults(): void {
    this.router.navigate([homeUrl]);
  }
}
