import { Component, Input, OnInit, ViewChild, ViewEncapsulation, ElementRef } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from 'src/app/services/settings.service';
import { RelationService } from 'src/app/services/relation.service';
import { HOME_PATH} from 'src/app/app.constants';


@Component({
  selector: 'app-profile-popup',
  templateUrl: './profile-popup.component.html',
  styleUrls: ['./profile-popup.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ProfilePopupComponent implements OnInit {
  @ViewChild('accordion') accordion;
  @ViewChild("filterOption0") myNameElem: ElementRef;


  profileForm: FormGroup;
  oneAtATime = true;
  openFirst=true;
  ischeckedradio: boolean = false;
  sourceLabels = ['My Profile', 'Another Profile'];
  targetLabels = ['Profile', 'Project'];
  targetType = 'profile';

  projectList: any[] = [
    {label: "Nobel Prize in Physics", id: "10373"},
    {label: "Nobel Prize in Literature", id: "5272"},
    {label: "Nobel Prize in Economics", id: "5571"},
    {label: "Mayflower Passengers of 1620", id: "8"},
    {label: "British Monarchs", id: "3232"},
    {label: "Partial Hollywood Walk of Fame", id: "358"},
    {label: "US Presidents and Vice Presidents", id: "9"},
    {label: "World Monarchs", id: "56256"}
  ];
  customSourceProfileId = "";
  customTargetProfileId = "";
  customTargetProjectId = "";
  selectedItemsList = [];
  checkboxvalue: any;
  constructor(private settingsService: SettingsService,
              private relationsService: RelationService,
              private router: Router) { }

  ngOnInit(): void {
    this.profileForm = new FormGroup({
      sourceProfile: new FormControl(),
      targetType: new FormControl(),
      targetProjectIdSelection: new FormControl()
    });

    let initialFormValues = {
      sourceProfile: 0
    };

    let srcTgt = this.settingsService.getSourceTarget();
    this.customSourceProfileId = srcTgt.sourceId;
    if (srcTgt.targetId) {
      if (srcTgt.targetId.startsWith('profile')) {
        this.customTargetProfileId = srcTgt.targetId.replace('profile-', '');
        initialFormValues['targetType'] = 0;
      } else {
        this.customTargetProjectId = srcTgt.targetId.replace('project-', '');
        initialFormValues['targetType'] = 1;

      }
    }
    this.profileForm.patchValue(initialFormValues);
    this.onchangeTarget();

    /*
    this.profileForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.sourceProfile);
    });
    this.profileForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.targetType);
    });
    this.profileForm.valueChanges.subscribe((value) => {
      this.settingsService.setSortOrder(value.targetProjectIdSelection);
    });
    */
  }

  onchange() {
    if (this.profileForm.value.sourceProfile == 0 || this.profileForm.value.sourceProfile == 1) {
      this.ischeckedradio = true;
    } else {
      this.ischeckedradio = false;
    }
  }

  onchangeTarget() {
    this.targetType = this.profileForm.value.targetType == 1 ? "project" : "profile";
    for (let i = 0; i < this.projectList.length; i++) {
      this.projectList[i].checked = false;
    }
  }

  clear() {
    this.profileForm.value.sourceProfile = '';
    this.ischeckedradio = false;
  }

  onProjectSelection() {
    this.customTargetProjectId = this.profileForm.value.targetProjectIdSelection
    for (let i = 0; i < this.projectList.length; i++) {
      this.projectList[i].checked = (this.customTargetProjectId == this.projectList[i].id);
    }
    console.log(this.customTargetProjectId);
  }

  isValid() {
    let hasSourceId = this.profileForm.value.sourceProfile == 0 ||
                        this.profileForm.value.sourceProfile &&  this.customSourceProfileId;
    let hasTargetId = this.targetType == "profile" ? this.customTargetProfileId : this.customTargetProjectId;
  
    return hasSourceId && hasTargetId;

  }

  onSubmit() {
    let sourceId = this.profileForm.value.sourceProfile  ? "profile-" + this.customSourceProfileId : '';
    let targetId = this.targetType + "-" + (this.targetType == "profile" ? this.customTargetProfileId : this.customTargetProjectId);

    console.log("Submitting form: sourceId: ", sourceId, ", targetId: " + targetId);
    this.settingsService.setSourceTarget(sourceId, targetId);
    this.relationsService.reset();
    this.router.navigate([`/${HOME_PATH}`]);


  }

}
