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
  soruce = ['My Profile', 'Another Profile'];
  target = ['Profile', 'Project'];
  projectList: any[] = [
    ["Nobel Prize in Physics", "project-10373"],
    ["Nobel Prize in Literature", "project-5272"],
    ["Nobel Prize in Economics", "project-5571"],
    ["Mayflower Passengers of 1620", "project-8"],
    ["British Monarchs", "project-3232"],
    ["Partial Hollywood Walk of Fame", "project-358"],
    ["US Presidents and Vice Presidents", "project-9"],
    ["World Monarchs", "project-56256"]
  ]
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
    if (this.profileForm.value.profile == 0 || this.profileForm.value.profile == 1) {
      this.ischeckedradio = true;
    } else {
      this.ischeckedradio = false;
    }
  }

  onchangeTarget() {
    const newData = this.projectList
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
    console.log(this.checkboxvalue);
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
