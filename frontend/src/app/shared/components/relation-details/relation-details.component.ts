import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as jsonpath from 'jsonpath';

@Component({
  selector: 'app-relation-details',
  templateUrl: './relation-details.component.html',
  styleUrls: ['./relation-details.component.css'],
})
export class RelationDetailsComponent implements OnInit {
  dataElementsToShow = [
    { path: 'first_name', title: 'First name' },
    { path: 'middle_name', title: 'Middle name' },
    { path: 'last_name', title: 'Last name' },
    { path: 'gender', title: 'Gender' },
    { path: 'birth.date.formatted_date', title: 'Birth date' },
    { path: 'birth.location.formatted_location', title: 'Birth place' },
    { path: 'death.date.formatted_date', title: 'Death date' },
    { path: 'death.location.formatted_location', title: 'Death place' },
  ];

  constructor(
    public dialogRef: MatDialogRef<RelationDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {}

  extractValue(path: string): string {
    return unescape(jsonpath.value(this.data, path));
  }

  openProfile(): void {
    window.open(this.data.profile_url, '_blank');
  }
}
