import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import Path from 'src/app/model/Path';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-profile-popup',
  templateUrl: './profile-popup.component.html',
  styleUrls: ['./profile-popup.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ProfilePopupComponent implements OnInit {

  profileForm: FormGroup;
  oneAtATime = true;
  ischeckedradio: boolean = false;
  profileId: any[] = []
  selectedItemsList = [];
  checkboxvalue: any;
  arryvalue: any[];
  constructor(private settingsService: SettingsService, private relationService: RelationService) { }

  ngOnInit(): void {
    this.profileForm = new FormGroup({
      profile: new FormControl(this.settingsService.getSortOrder()),
      project_profile: new FormControl(this.settingsService.getSortOrder()),
      profile_id_list: new FormControl(this.settingsService.getSortOrder())
    });
    this.profileForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.profile);
    });
    this.profileForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.project_profile);
    });
    this.profileForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.profile_id_list);
    });
  }

  onchange() {
    if (this.profileForm.value.profile == 'my_profile' || this.profileForm.value.profile == 'profile_id') {
      this.ischeckedradio = true;
    } else {
      this.ischeckedradio = false;
    }
  }

  onchangeTarget() {
    this.profileId = this.relations
    const newData = this.profileId
    for (let i = 0; i < newData.length; i++) {
      newData[i].checked = false;
    }
    this.arryvalue= newData
    this.fetchSelectedItems();
  }

  clear() {
    this.profileForm.value.profile = '';
    this.ischeckedradio = false;
  }

  onChangeCheckbox() {
    this.checkboxvalue = this.profileForm.value.profile_id_list
  }

  fetchSelectedItems() {
    this.selectedItemsList = this.arryvalue.filter((value, index) => {
      return value.checked
    });

  }
  get relations(): Array<Path> {
    let results = this.relationService.getRelations();
    return results
  }
}
