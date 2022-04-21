import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
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
import { getColor, Theme } from 'src/app/model/Theme';
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
  stepcountData: any[] = [];
  user_name: any[] = [];
  filters: any = {
    gender: '',
    country: [],
    museum: [],
    profession: [],
    fromYear: '',
    toYear: '',
  }
  proData: any = [];
  sorting: any;
  serachData: any;
  first: any;
  second: number;
  third: number;
  ground: number;
  female: number;
  male: number;

  public sort = JSON.parse(localStorage.getItem(APP_SETTINGE_STORAGE_KEY))
  @Input() settingsAction: SettingsAction;

  @Output() toggleMenu: EventEmitter<void> = new EventEmitter<void>();

  sortOrderOptions = [
    'Alphabetical order: First Name',
    'Alphabetical order: Last Name',
    'Birth Date',
    'Death Date',
    'Number of connections',
  ];

  place_at_museum = [
    { place_museum_name: 'Ground floor', isChecked: false, value: 0 },
    { place_museum_name: 'First floor', isChecked: false, value: 1 },
    { place_museum_name: 'Second floor', isChecked: false, value: 2 },
    { place_museum_name: 'Third floor', isChecked: false, value: 3 }];
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
    this.serachData = this.settingsService.getSerachOrder();
    this.homePageForm = new FormGroup({
      gender: new FormControl(this.filters?.gender ? this.filters?.gender : ''),
      country: new FormControl([]),
      museum: new FormControl([]),
      profession_name: new FormControl([]),
      fromYear: new FormControl(this.filters?.fromYear ? this.filters?.fromYear : ''),
      toYear: new FormControl(this.filters?.toYear ? this.filters?.toYear : ''),
      sortOrder: new FormControl(this.settingsService.getSortOrder()),
      searchText: new FormControl(this.serachData ? this.serachData : '')
    });
    this.homePageForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(Number(this.homePageForm.value.sortOrder));
    });

    if (this.filters && this.filters?.museum?.length) {
      for (var i = 0; i < this.place_at_museum.length; i++) {
        let alreadyChecked = false;
        if (this.filters?.museum?.length) {
          let exist = this.filters?.museum.find((museum) => museum === this.place_at_museum[i].value)
          if (exist >= 0) {
            alreadyChecked = true;
          }
        }
        this.place_at_museum[i].isChecked = alreadyChecked
      }
    }
  }

  onChange(): void {
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

    let themes = this.relationsData.reduce((res, pro) => {
      if (!res[pro.bh_theme]) {
        res[pro.bh_theme] = pro;
      } else if (Number(res[pro.bh_theme].cost) < Number(pro.cost)) {
        res[pro.bh_theme] = pro;
      }
      return res;
    }, {});

    for (const property in themes) {
      let themeExist = this.proData.find((theme) => theme.bh_theme === property);
      let alreadyChecked = false;
      if(this.filters?.profession?.length) {
        let exist = this.filters?.profession.find((profession) => profession === property)
        if(exist) {
          alreadyChecked = true;
        }
      }
      if(!themeExist) {
        this.proData.push({
          bh_theme : property,
          checkedpro : alreadyChecked
        })
      }
    }

    this.ground = this.relationsData.filter((item: any) => {
      return item.bh_floor === 0
    }).length

    this.first = this.relationsData.filter((item: any) => {
      return item.bh_floor === 1
    }).length

    this.second = this.relationsData.filter((item: any) => {
      return item.bh_floor === 2
    }).length

    this.third = this.relationsData.filter((item: any) => {
      return item.bh_floor === 3
    }).length

    this.male = this.relationsData.filter((item: any) => {
      return item.target_profile.gender === 'male'
    }).length

    this.female = this.relationsData.filter((item: any) => {
      return item.target_profile.gender === 'female'
    }).length

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

  onchangecountry(event, i, name) {
    this.countryData.forEach((element, index) => {
      if (index === i) {
        element['checkedcountry'] = event.target.checked
        this.countryData[index] = element;
      }
    })

    if (event.target.checked) {
      this.filters.country.push(name)
    } else {
      let index = this.filters.country.indexOf(name)
      if (index > -1) {
        this.filters.country.splice(index, 1);
      }
    }
    this.settingsService.setFilterOrder(this.filters);
  }

  changeGender(gender) {
    this.filters.gender = gender
    this.homePageForm.patchValue({
      gender: gender
    })
    this.settingsService.setFilterOrder(this.filters);
  }

  changeYear(event, field) {
    this.filters[field] = event.target.value
  }

  chnageserch(event) {
    this.serachData = event.target.value;
    this.settingsService.setSerachOrder(this.serachData);
  }

  onchangemuseum(event, i, name) {
    this.place_at_museum.forEach((element, index) => {
      if (index === i) {
        element['isChecked'] = event.target.checked
        this.place_at_museum[index] = element;
      }
    })

    if (event.target.checked) {
      this.filters.museum.push(name)
    } else {
      let index = this.filters.museum.indexOf(name)
      if (index > -1) {
        this.filters.museum.splice(index, 1);
      }
    }
    this.settingsService.setFilterOrder(this.filters);
  }

  onchangeprofession(event, i, name) {
    this.proData.forEach((element, index) => {
      if (index === i) {
        element['checkedpro'] = event.target.checked
        this.proData[index] = element;
      }
    })

    if (event.target.checked) {
      this.filters.profession.push(name)
    } else {
      let index = this.filters.profession.indexOf(name)
      if (index > -1) {
        this.filters.profession.splice(index, 1);
      }
    }
    this.settingsService.setFilterOrder(this.filters);
  }

  clearFilter(key, value) {
    this.filters[key] = value
    this.settingsService.setFilterOrder(this.filters);

    if (key === 'gender') {
      this.homePageForm.patchValue({
        gender: ''
      })
    }
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }
}
