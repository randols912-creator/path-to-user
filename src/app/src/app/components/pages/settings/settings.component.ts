import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HOME_PATH } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { RelationService } from 'src/app/services/relation.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  action: SettingsAction;

  constructor(private router: Router, private route: ActivatedRoute,private relationService: RelationService) {}

  ngOnInit(): void {
    const self = this;
    this.route.params.subscribe((p) => {
      self.action = p.action;
    });
  }

  goToAllResults(): void {
    this.router.navigate([`/${HOME_PATH}`]);
  }

  get relations(): Array<Path> {
    let results = this.relationService.getRelations();
    return results
  }
}

export enum SettingsAction {
  FILTER = 'filter',
  SORT = 'sort',
  SEARCH = 'search',
}
