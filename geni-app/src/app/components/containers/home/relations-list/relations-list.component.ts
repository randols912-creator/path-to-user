import { Component, Input, OnInit } from '@angular/core';
import Relation from 'src/app/model/Relation';
import { RelationSortOrder } from 'src/app/pipes/relations-sort-by.pipe';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-relations-list',
  templateUrl: './relations-list.component.html',
  styleUrls: ['./relations-list.component.css'],
})
export class RelationsListComponent implements OnInit {
  @Input() relations: Array<Relation>;

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {}

  get sortOrder(): RelationSortOrder {
    return this.settingsService.getSortOrder();
  }
}
