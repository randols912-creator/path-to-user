import { Location } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { SETTINGS_PATH } from 'src/app/app.constants';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
  @Input() spaceBetween: boolean = true;
  @Input() externalContent: boolean;

  constructor(public location: Location) {}

  ngOnInit(): void {}

  get settingsUrl() {
    return `/${SETTINGS_PATH}`;
  }
}
