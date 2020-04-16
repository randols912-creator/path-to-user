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
    'Number of connections',
    'Alphabetical order',
    'Museum Theme',
    'Countries',
  ];

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.sortForm = new FormGroup({
      sortOrder: new FormControl(this.settingsService.getSortOrder()),
    });

    this.sortForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.sortOrder);
    });
  }
}
