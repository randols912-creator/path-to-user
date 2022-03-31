import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Path from 'src/app/model/Path';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  @Input() relations: Array<Path>;

  users_name: any[] = [];
  searchText: string;
  constructor(private settings: SettingsService) {
  }

  ngOnInit(): void {
  }

  ckangecolor(event: any) {
    document.getElementById('img_serach').style.background = 'transparent linear-gradient(263deg, #ffdba7 0%, #ff9e1e 100%) 0% 0% no-repeat padding-box'
  }

  searchRelation(event) {
    if (event.target.value) {
      this.users_name = this.relations;
    } else {
      this.users_name = [];
    }
  }
}
