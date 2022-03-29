import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { faSlash } from '@fortawesome/free-solid-svg-icons';
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
  birth_country = [
    { name: 'Afghanistan', isChecked: false },
    { name: 'Albania', isChecked: false },
    { name: 'Algeria', isChecked: false },
    { name: 'Angola', isChecked: false },
    { name: 'Argentina', isChecked: false },
    { name: 'Armenia', isChecked: false },
    { name: 'Australia', isChecked: false },
    { name: 'Austria', isChecked: false },
    { name: 'Azerbaijan', isChecked: false },
    { name: 'Belarus', isChecked: false },
    { name: 'Belgium', isChecked: false },
    { name: 'Belize', isChecked: false },
    { name: 'Brazil', isChecked: false },
    { name: 'Bulgaria', isChecked: false },
    { name: 'Canada', isChecked: false }];

  place_at_museum = [
    { place_museum_name: 'Ground floor', isChecked: false },
    { place_museum_name: 'first floor', isChecked: false },
    { place_museum_name: 'Second floor', isChecked: false },
    { place_museum_name: 'Third floor', isChecked: false }];

  professions = [
    { isChecked: false, profession_name: 'Humanities & Religion' },
    { isChecked: false, profession_name: 'Science' },
    { isChecked: false, profession_name: 'Diplomacy' },
    { isChecked: false, profession_name: 'Law' },
    { isChecked: false, profession_name: 'Economics' },
    { isChecked: false, profession_name: 'The Holocaust' },
    { isChecked: false, profession_name: 'Press & Media' },
    { isChecked: false, profession_name: 'Military' },
    { isChecked: false, profession_name: 'Literature & Poetry' },
    { isChecked: false, profession_name: 'Plastic Art' },
    { isChecked: false, profession_name: 'Classical Music' },
    { isChecked: false, profession_name: 'Popular Music' },
    { isChecked: false, profession_name: 'Architecture' },
    { isChecked: false, profession_name: 'Theatre' },
    { isChecked: false, profession_name: 'Cinema & Television' },
    { isChecked: false, profession_name: 'Photography & Comics' },
    { isChecked: false, profession_name: 'Humor' },
    { isChecked: false, profession_name: 'Sports' },
    { isChecked: false, profession_name: 'Other' }];
  country: any;
  museum: any;
  profession_name: any;

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

  onchangecountry() {
    this.fetchSelectedItems();
    this.country = this.birth_country.filter((item) => item.isChecked)
    if (this.country.length > 0) {
      this.isCheckedcountry = true;
    } else {
      this.isCheckedcountry = false;
    }
  }

  clearcountry(){
    this.fetchSelectedItems();

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

  onchangeprofession() {
    this.fetchSelectedItems();
    this.profession_name = this.professions.filter((item) => item.isChecked);
    if (this.profession_name.length > 0) {
      this.isCheckrdprofession = true;
    } else {
      this.isCheckrdprofession = false;
    }
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }

  fetchSelectedItems() {
    if (this.filterForm.value.country) {
      this.selectedItemsList = this.birth_country.filter((value, index) => {
        console.log(value.isChecked)
        return value.isChecked
      });
    } else if (this.filterForm.value.museum) {
      this.selectedmuseumList = this.place_at_museum.filter((value, index) => {
        return value.isChecked
      });
    } else if (this.filterForm.value.profession_name) {
      this.selectedprofessionsList = this.professions.filter((value, index) => {
        return value.isChecked
      });
    }
  }
}
