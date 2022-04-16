import { Component, Input, OnChanges, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { faSlash } from '@fortawesome/free-solid-svg-icons';
import { HOME_PATH } from 'src/app/app.constants';
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
export class FiltersComponent implements OnInit, OnChanges {

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
    { place_museum_name: 'Ground floor', isChecked: false, value: 0 },
    { place_museum_name: 'first floor', isChecked: false, value: 1 },
    { place_museum_name: 'Second floor', isChecked: false, value: 2 },
    { place_museum_name: 'Third floor', isChecked: false, value: 3 }];

  country: any = [];
  museum: any;
  professionname: any;
  selectedLenght = 0;
  female: number;
  male: number;
  proData: any[] = [];
  countryData = [];
  arryvaluePro: any[];
  arryvaluecountry: any[];
  first: any;
  second: number;
  third: number;
  ground: number;
  birth: any[] = [];
  dataof: any;

  previousRelationLength = 0;
  currentRelationLength = 0

  testRadio = false;
  filters : any = {
    gender: '',
    country : [],
    museum : [],
    profession : [],
    fromYear : '',
    toYear: '',
  }
  constructor(private settingsService: SettingsService, private router: Router, private fb : FormBuilder) { }

  ngOnInit(): void {
    this.countryData = [];

    this.filters = this.settingsService.getFilterOrder();
    this.filterForm = new FormGroup({
      gender: new FormControl(this.filters?.gender ? this.filters?.gender : ''),
      country: new FormControl([]),
      museum: new FormControl([]),
      profession_name: new FormControl([]),
      fromYear: new FormControl(this.filters?.fromYear ? this.filters?.fromYear : ''),
      toYear: new FormControl(this.filters?.toYear ? this.filters?.toYear : '')
    });
    
    if(this.filters && this.filters?.museum?.length) {
      for(var i= 0; i < this.place_at_museum.length; i++) {
        let alreadyChecked = false;
        if(this.filters?.museum?.length) {
          let exist = this.filters?.museum.find((museum) => museum === this.place_at_museum[i].value)
          if(exist >= 0) {
            alreadyChecked = true;
          }
        }
        this.place_at_museum[i].isChecked = alreadyChecked
      }
    }
  }

  ngOnChanges() {
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
      if(this.filters?.country?.length) {
        let exist = this.filters?.country.find((country) => country === property)
        if(exist) {
          alreadyChecked = true;
        }
      }
      if(!countryExist) {
        this.countryData.push({
          countryName : property,
          checkedcountry : alreadyChecked
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
  }

  goToAllResults() {
    // let selectedCountrys = this.countryData.filter((country) => country.checkedcountry === true).map((obj) => {return obj.countryName});
    // let selectedMuseumFloor = this.place_at_museum.filter((museum) => museum.isChecked === true).map((obj) => {return obj.value});
    // let selectedProfession = this.proData.filter((profession) => profession.checkedpro === true).map((obj) => { return obj.bh_theme});
    // let filter = {
    //   gender : this.filterForm.value.gender,
    //   country : selectedCountrys,
    //   museum : selectedMuseumFloor,
    //   profession : selectedProfession,
    //   fromYear : this.filterForm.value.fromYear,
    //   toYear: this.filterForm.value.toYear,
    // }
    this.settingsService.setFilterOrder(this.filters);
    this.router.navigate([`/${HOME_PATH}`]);
  }
  onchange() {
    if (this.filterForm.value.filterOrder == 0 || this.filterForm.value.filterOrder == 1) {
      this.ischeckedradio = true;
    } else {
      this.ischeckedradio = false;
    }
    this.selectedLenght = 1;
  }

  clear() {
    this.filterForm.value.filterOrder = '';
    this.ischeckedradio = false;
    this.selectedLenght = 0;
  }

  onchangecountry(event, i, name) {
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
  }

  clearCountry() {
    for (let i = 0; i < this.countryData.length; i++) {
      this.countryData[i]['checkedcountry'] = false
    }
  }

  onchangemuseum(event, i, name) {
    this.place_at_museum.forEach((element, index) => {
      if(index === i) {
        element['isChecked'] = event.target.checked
        this.place_at_museum[index] = element;
      }
    })

    if(event.target.checked) {
      this.filters.museum.push(name)
    } else {
      let index = this.filters.museum.indexOf(name)
      if(index > -1) {
        this.filters.museum.splice(index, 1);
      }
    }
  }

  clearMuseum() {
    for (let i = 0; i <this.place_at_museum.length; i++) {
     this.place_at_museum[i].isChecked = false
    }
  }
  onchangeprofession(event, i, name) {
    this.proData.forEach((element, index) => {
      if(index === i) {
        element['checkedpro'] = event.target.checked
        this.proData[index] = element;
      }
    })

    if(event.target.checked) {
      this.filters.profession.push(name)
    } else {
      let index = this.filters.profession.indexOf(name)
      if(index > -1) {
        this.filters.profession.splice(index, 1);
      }
    }
  }

  clearProfession() {
    for (let i = 0; i < this.proData.length; i++) {
      this.proData[i].checkedpro = false;
    }
  }

  changeGender(gender) {
    this.filters.gender = gender
    this.filterForm.patchValue({
      gender: gender
    })
  }

  changeYear(event, field) {
    this.filters[field] = event.target.value
  }

  

  clearAll() {
    this.selectedLenght = 0;
    this.filterForm.value.filterOrder = '';
    this.ischeckedradio = false;
    this.isCheckedcountry = false;
    this.isCheckedmuseum = false;
    this.isCheckrdprofession = false;
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }

  fetchSelectedItems() {
    // if (this.filterForm.value.country) {
    //   this.selectedItemsList = this.countryData.filter((value, index) => {
    //     return value.checkedcountry
    //   });
    // } else if (this.filterForm.value.museum) {
    //   this.selectedmuseumList = this.place_at_museum.filter((value, index) => {
    //     return value.isChecked
    //   });
    // } else if (this.filterForm.value.professionname) {
    //   this.selectedprofessionsList = this.arryvaluePro.filter((value, index) => {
    //     return value.checkedpro
    //   });
    // }
  }

  clearFilter(key, value) {
    this.filters[key] = value
    this.settingsService.setFilterOrder(this.filters);

    if(key === 'gender' || key === 'fromYear' || key === 'toYear') {
      this.filterForm.patchValue({
        gender: ''
      })
    }

    if(key === 'fromYear' || key === 'toYear') {
      this.filterForm.patchValue({
        fromYear: '',
        toYear: ''
      })
    }

    if(key === '') {
      this.clearMuseum();
    }

    if(key === '') {
      this.clearProfession();
    }
    


  }
}
