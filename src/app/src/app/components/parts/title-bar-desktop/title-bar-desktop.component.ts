import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ABOUT_PATH, APP_SETTINGE_STORAGE_KEY, HOME_PATH, MENU_PATH, SETTINGS_PATH, WELCOME_PATH } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import Path from 'src/app/model/Path';
import { ModalService } from 'src/app/services/modal.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsAction } from '../../pages/settings/settings.component';
import { P2pModalComponent } from '../p2p-modal/p2p-modal.component';

@Component({
  selector: 'app-title-bar-desktop',
  templateUrl: './title-bar-desktop.component.html',
  styleUrls: ['./title-bar-desktop.component.css']
})
export class TitleBarDesktopComponent {

  @Input() showTitle = true;
  @Input() showMenu = true;
  @Input() showGoBack = false;
  @Input() showGoToAllResultsText = false;
  @Input() showGoToAllResultsButton = false;
  @Input() showSettings = false;
  @Input() showP2P = false;
  @Input() showMenuHome = false;
  relationsData: any[] = [];
  countryData: any[] = [];
  conutryselcted:any[]=[];
  selectedItemsList = [];
  
  public sort = JSON.parse(localStorage.getItem(APP_SETTINGE_STORAGE_KEY))
  @Input() settingsAction: SettingsAction;

  @Output() toggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private location: Location,
    private router: Router,
    private relationService: RelationService,
    private auth: AuthService,
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

  get relations(): Array<Path> {
    return this.relationService.getRelations();
  }

  get isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  get resultln(){
    return this.relations.length
  }
  get aboutUrl() {
    return `/${ABOUT_PATH}`;
  }

  logoutHandler(): void {
    this.auth.logout();
    this.router.navigate([`/${WELCOME_PATH}`]);
  }
  
  onChange(){
    this.relationsData = this.relations
    let result = this.relationsData.reduce((res, pro) => {
      if (!res[pro.target_profile.birth?.location?.country]) {
        res[pro.target_profile.birth?.location?.country] = pro;
      } else if (Number(res[pro.target_profile.birth?.location?.country].cost) < Number(pro?.cost)) {
        res[pro.target_profile.birth?.location?.country] = pro;
      }
      return res;
    }, {});
    this.countryData = Object.values(result)
    this.countryData.map(item =>{
      this.conutryselcted.push({country: item.target_profile.birth?.location?.country,checkrd:false})
    })

    this.fetchSelectedItems();
  }

  fetchSelectedItems(){
    this.selectedItemsList = this.countryData.filter((value, index) => {
      return value.checkrd
    });
  }
}
