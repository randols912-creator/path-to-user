import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ABOUT_PATH, APP_SETTINGE_STORAGE_KEY, HOME_PATH, MENU_PATH, SETTINGS_PATH, WELCOME_PATH } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import Path from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import { ModalService } from 'src/app/services/modal.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';
import { SettingsAction } from '../../pages/settings/settings.component';
import { P2pModalComponent } from '../p2p-modal/p2p-modal.component';

@Component({
  selector: 'app-title-bar-desktop',
  templateUrl: './title-bar-desktop.component.html',
  styleUrls: ['./title-bar-desktop.component.css']
})
export class TitleBarDesktopComponent implements OnInit {

  homePageForm: FormGroup;
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
  conutryselcted: any[] = [];
  selectedItemsList = [];
  filters: any = {}

  public sort = JSON.parse(localStorage.getItem(APP_SETTINGE_STORAGE_KEY))
  @Input() settingsAction: SettingsAction;

  @Output() toggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private location: Location,
    private router: Router,
    private relationService: RelationService,
    private auth: AuthService,
    private settingsService: SettingsService
  ) { }
  ngOnInit(): void {
    this.countryData = [];
    this.filters = this.settingsService.getFilterOrder();
    this.homePageForm = new FormGroup({
      country: new FormControl([]),
    });
  }


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

  get user(): Profile {
    return this.auth.user;
  }
  
  get relations(): Array<Path> {
    return this.relationService.getRelations();
  }

  get isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  get resultln() {
    return this.relations.length
  }
  get aboutUrl() {
    return `/${ABOUT_PATH}`;
  }

  logoutHandler(): void {
    this.auth.logout();
    this.router.navigate([`/${WELCOME_PATH}`]);
  }

  onChange() {
    this.relationsData = this.relations
    let result = this.relationsData.reduce((res, pro) => {
      if (!res[pro.target_profile.birth?.location?.country]) {
        res[pro.target_profile.birth?.location?.country] = pro;
      } else if (Number(res[pro.target_profile.birth?.location?.country].cost) < Number(pro?.cost)) {
        res[pro.target_profile.birth?.location?.country] = pro;
      }
      return res;
    }, {});
    for (const property in result) {
      let countryExist = this.countryData.find((country) => country.countryName === property);
      let alreadyChecked = false;
      if (this.filters?.country?.length > 0) {
        let exist = this.filters.country.find((country) => country === property)
        if (exist) {
          alreadyChecked = true;
        }
      }
      if (!countryExist) {
        this.countryData.push({
          countryName: property,
          checkedcountry: alreadyChecked
        })
      }
    }
  }

  onchangecountry(event, i,name) {
    this.countryData.forEach((element, index) => {
      if(index === i) {
        element['checkedcountry'] = event.target.checked
        this.countryData[index] = element;
      }
    })

    if(event.target.checked) {
      this.filters.country.push(name)
    } else {
      let index = this.filters.country.indexOf(name)
      if(index > -1) {
        this.filters.country.splice(index, 1);
      }
    }
    this.settingsService.setFilterOrder(this.filters);
  }
}
