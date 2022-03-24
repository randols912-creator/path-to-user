import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
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

  birth_country = ['Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan','Belarus','Belgium',
  'Belize','Bolivia','Brazil','Bulgaria','Canada'];

  place_at_museum = [
    'Ground floor',
    'first floor',
    'Second floor',
    'Third floor'];

  profession = [
    { id: 1, profession_name: 'Humanities & Religion' },
    { id: 2, profession_name: 'Science' },
    { id: 3, profession_name: 'Diplomacy' },
    { id: 4, profession_name: 'Law' },
    { id: 5, profession_name: 'Economics' },
    { id: 6, profession_name: 'The Holocaust' },
    { id: 7, profession_name: 'Press & Media' },
    { id: 8, profession_name: 'Military' },
    { id: 9, profession_name: 'Literature & Poetry' },
    { id: 10, profession_name: 'Plastic Art' },
    { id: 11, profession_name: 'Classical Music' },
    { id: 12, profession_name: 'Popular Music' },
    { id: 13, profession_name: 'Architecture' },
    { id: 14, profession_name: 'Theatre' },
    { id: 15, profession_name: 'Cinema & Television' },
    { id: 16, profession_name: 'Photography & Comics' },
    { id: 17, profession_name: 'Humor' },
    { id: 18, profession_name: 'Sports' },
    { id: 19, profession_name: 'Other' }];

  constructor(private settingsService: SettingsService) { }

  ngOnInit(): void {
    this.filterForm = new FormGroup({
      filterOrder: new FormControl(this.settingsService.getSortOrder()),
      country: new FormControl(this.settingsService.getSortOrder())
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.filterOrder);
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.country);
      console.log(value.country)
    });

  }

  onchange1() {
    console.log('change ==> ', this.filterForm.value)
  }

  onchange() {
    console.log('change ==> ', this.filterForm.value)
  }

  categoryColor(category: Theme): string {
    return getColor(category);
  }

}
