import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HOME_PATH } from 'src/app/app.constants';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  action: SettingsAction;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const self = this;
    this.route.params.subscribe((p) => {
      self.action = p.action;
    });
  }

  goToAllResults(): void {
    this.router.navigate([`/${HOME_PATH}`]);
  }
}

export enum SettingsAction {
  FILTER = 'filter',
  SORT = 'sort',
  SEARCH = 'search',
}
