import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HOME_PATH, RELATION_PATH } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { I18nService } from 'src/app/services/i18n.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

  @Input() relation: Path;
  relationPath: string = RELATION_PATH;
  @ViewChild('relationCard') ref: ElementRef;

  users: any[] = [{ name: 'Yitzhak' }, { name: 'Hasan' }, { name: 'Hasani' }, { name: 'Hasanali' }, { name: 'Ronit' }];
  userFilter: any = { name: '' };

  constructor(private router: Router,private i18n: I18nService,private settings: SettingsService) {
  }

  ngOnInit(): void {
  }

  ckangecolor(event:any){
    document.getElementById('img_serach').style.background= 'transparent linear-gradient(263deg, #ffdba7 0%, #ff9e1e 100%) 0% 0% no-repeat padding-box'
  }

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.relation.target_profile,
      this.settings.getLocale()
    );
  }
}
