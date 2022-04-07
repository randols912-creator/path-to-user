import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { faSlash } from '@fortawesome/free-solid-svg-icons';
import Path from 'src/app/model/Path';
import { getColor, Theme } from 'src/app/model/Theme';
import { SettingsService } from 'src/app/services/settings.service';
// import { AccordionModule } from 'ngx-bootstrap/accordion';

@Component({
  selector: 'app-filters',
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class FiltersComponent implements OnInit {

  @Input() relations: Array<Path>;
  filterForm: FormGroup;
  oneAtATime = true;
  male_femaleOptions = ['Male', 'Female',];
  selectedItemsList = [];
  selectedmuseumList = [];
  ischeckedradio: boolean = false;
  isCheckedcountry: boolean = false;
  isCheckedmuseum: boolean = false;
  isCheckrdprofession: boolean = false;
  selectedprofessionsList = [];
  relationsData: any[] = [];
  place_at_museum = [
    { place_museum_name: 'Ground floor', isChecked: false },
    { place_museum_name: 'first floor', isChecked: false },
    { place_museum_name: 'Second floor', isChecked: false },
    { place_museum_name: 'Third floor', isChecked: false }];

  country: any;
  museum: any;
  professionname: any;
  selectedLenght: any;
  female: number;
  male: number;
  proData: any[] = [];
  countryData: any[] = [];
  arryvaluePro: any[];
  arryvaluecountry: any
  first: any;
  second: number;
  third: number;
  ground: number;
  birth: any[] = [];
  dataof: any;
  constructor(private settingsService: SettingsService) { }

  ngOnInit(): void {
    this.filterForm = new FormGroup({
      filterOrder: new FormControl(this.settingsService.getSortOrder()),
      country: new FormControl(this.settingsService.getSortOrder()),
      museum: new FormControl(this.settingsService.getSortOrder()),
      profession_name: new FormControl(this.settingsService.getSortOrder())
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.filterOrder);
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.country);
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.museum);
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.profession_name)
    })
  }

  onchange() {
    if (this.filterForm.value.filterOrder == 0 || this.filterForm.value.filterOrder == 1) {
      this.ischeckedradio = true;
    } else {
      this.ischeckedradio = false;
    }
  }

  clear() {
    this.filterForm.value.filterOrder = '';
    this.ischeckedradio = false;
  }

  onChangeAccordion(event) {
    this.relationsData = this.relations
    if (event.target.outerText === "Sex") {
      this.male = this.relationsData.filter((item: any) => {
        return item.target_profile.gender === 'male'
      }).length
      this.female = this.relationsData.filter((item: any) => {
        return item.target_profile.gender === 'female'
      }).length
    }
    if (event.target.outerText === "Birth country") {
      for (let i = 0; i < this.relationsData.length; i++) {
        this.dataof = this.relationsData[i].target_profile.birth?.location
        this.birth.push(this.dataof)
      }
      this.dataof = this.birth
      let result = this.dataof?.reduce((res, pro) => {
        if (!res[pro?.country]) {
          res[pro?.country] = pro;
        } else if (Number(res[pro?.country].cost) < Number(pro?.cost)) {
          res[pro?.country] = pro;
        }
        return res;
      }, {});
      this.countryData = Object.values(result)
      const newData = this.countryData
      for (let i = 0; i < newData.length; i++) {
        newData[i].checkedcountry = false;
      }
      this.arryvaluecountry = newData
    }

    if (event.target.outerText === "Place at the museum") {
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
    }

    if (event.target.outerText === "Profession") {
      let result = this.relationsData.reduce((res, pro) => {
        if (!res[pro.bh_theme]) {
          res[pro.bh_theme] = pro;
        } else if (Number(res[pro.bh_theme].cost) < Number(pro.cost)) {
          res[pro.bh_theme] = pro;
        }
        return res;
      }, {});
      this.proData = Object.values(result)
      const newData = this.proData
      for (let i = 0; i < newData.length; i++) {
        newData[i].checkedpro = false;
      }
      this.arryvaluePro = newData
    }
    this.fetchSelectedItems();
  }

  onchangecountry() {
    this.fetchSelectedItems();
    this.country = this.countryData.filter((item) => item.checkedcountry)
    if (this.country.length > 0) {
      this.isCheckedcountry = true;
    } else {
      this.isCheckedcountry = false;
    }
  }

  clearcountry() {
    for (let i = 0; i < this.country.length; i++) {
      this.country[i].checkedcountry = false
    }
    this.isCheckedcountry = false;
  }

  onchangemuseum() {
    this.fetchSelectedItems();
    this.museum = this.place_at_museum.filter((item) => item.isChecked);
    if (this.museum.length > 0) {
      this.isCheckedmuseum = true;
    } else {
      this.isCheckedmuseum = false;
    }
  }

  clearmuseum() {
    for (let i = 0; i < this.museum.length; i++) {
      this.museum[i].isChecked = false
    }
    this.isCheckedcountry = false;
  }
  onchangeprofession() {
    this.fetchSelectedItems();
    this.professionname = this.arryvaluePro.filter((item) => item.checkedpro);
    if (this.professionname.length > 0) {
      this.isCheckrdprofession = true;
    } else {
      this.isCheckrdprofession = false;
    }
  }

  clearprofession() {
    for (let i = 0; i < this.professionname.length; i++) {
      this.professionname[i].checkedpro = false
    }
    this.isCheckrdprofession = false;
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }

  fetchSelectedItems() {
    if (this.filterForm.value.country) {
      this.selectedItemsList = this.countryData.filter((value, index) => {
        return value.checkedcountry
      });
    } else if (this.filterForm.value.museum) {
      this.selectedmuseumList = this.place_at_museum.filter((value, index) => {
        return value.isChecked
      });
    } else if (this.filterForm.value.professionname) {
      this.selectedprofessionsList = this.arryvaluePro.filter((value, index) => {
        return value.checkedpro
      });
    }
  }
}
