import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-sort',
  templateUrl: './sort.component.html',
  styleUrls: ['./sort.component.css'],
})
export class SortComponent implements OnInit {
  sortForm: FormGroup;
  sortOrderOptions = [
    'Alphabetical order: First Name',
    'Alphabetical order: Last Name',
    'Birth Date',
    'Death Date',
    'Number of connections',
  ];
  sortting: any[] = [];

  constructor(private settingsService: SettingsService) { }

  ngOnInit(): void {
    this.sortForm = new FormGroup({
      sortOrder: new FormControl(this.settingsService.getSortOrder()),
    });

    this.sortForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.sortOrder);
    });
  }

  onchange() {
    this.sortting = []
  }
  sortData() {
    let product_1: any = [
      {
        "First_Name": "Yitzhak",
        "Last_Name": "Danziger",
        "Birth_Date": 1907,
        "Death_Date": 1972,
        "Number_of_connections": 25
      },
      {
        "First_Name": "Ronit",
        "Last_Name": "Yashar",
        "Birth_Date": 1964,
        "Death_Date": 2016,
        "Number_of_connections": 19
      }, {
        "First_Name": "Yehuda",
        "Last_Name": "Amichai",
        "Birth_Date": 1924,
        "Death_Date": 2000,
        "Number_of_connections": 20
      }

    ];
    if (this.sortForm.value.sortOrder == 0) {
      this.sortting = product_1.sort((a, b) => a.First_Name > b.First_Name ? 1 : -1)
    } else if (this.sortForm.value.sortOrder == 1) {
      this.sortting = product_1.sort((a, b) => a.Last_Name > b.Last_Name ? 1 : -1)
    } else if (this.sortForm.value.sortOrder == 2) {
      this.sortting = product_1.sort((a, b) => a.Birth_Date - b.Birth_Date);
    } else if (this.sortForm.value.sortOrder == 3) {
      this.sortting = product_1.sort((a, b) => a.Death_Date - b.Death_Date);
    } else if (this.sortForm.value.sortOrder == 4) {
      this.sortting = product_1.sort((a, b) => a.Number_of_connections - b.Number_of_connections);
    }
  }
}
