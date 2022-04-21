import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HOME_PATH } from 'src/app/app.constants';
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
  serachData: any;
  serachForm: FormGroup;
  constructor(private settingsService: SettingsService, private router: Router) {
  }

  ngOnInit(): void {
    this.serachData = this.settingsService.getSerachOrder();
    this.serachForm = new FormGroup({
      searchText: new FormControl(this.serachData ? this.serachData : '')
    });
    if (this.serachData) {
      this.users_name = this.relations;
    }
  }

  get serachOrder() {
    return this.settingsService.getSerachOrder();
  }
  ckangecolor(event: any) {
    document.getElementById('img_serach').style.background = 'transparent linear-gradient(263deg, #ffdba7 0%, #ff9e1e 100%) 0% 0% no-repeat padding-box'
  }

  searchRelation(event) {
    this.users_name = []
    if (event.target.value) {
      this.serachData = event.target.value;
      this.users_name = this.relations;
      this.settingsService.setSerachOrder(this.serachData);
    } else {
      this.serachData = event.target.value;
      this.settingsService.setSerachOrder(this.serachData);
      this.users_name = [];
    }
  }

  goToAllResults() {
    this.router.navigate([`/${HOME_PATH}`]);
  }
}
