import { Component, Input, OnInit } from '@angular/core';
import Path from 'src/app/model/Path';
import { RelationSortOrder } from 'src/app/pipes/relations-sort-by.pipe';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-relations-list',
  templateUrl: './relations-list.component.html',
  styleUrls: ['./relations-list.component.css'],
})
export class RelationsListComponent implements OnInit {
  @Input() relations: Array<Path>;

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {}

  get sortOrder(): RelationSortOrder {
    return this.settingsService.getSortOrder();
  }
}
