import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
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
  male_femaleOptions = [
    'Male',
    'Female',
  ];

  profession = [
    {
      id: 1,
      'lable': 'fname'
    },
    {
      id: 2,
      'lable': 'lname'
    },
    {
      id: 3,
      'lable': 'name'
    }
  ]

  constructor(private settingsService: SettingsService) { }

  ngOnInit(): void {
    this.filterForm = new FormGroup({
      filterOrder: new FormControl(this.settingsService.getSortOrder()),
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.filterOrder);
    });
  }

  onchange() {
    console.log('change ==> ', this.filterForm.value.filterOrder)
  }

}
