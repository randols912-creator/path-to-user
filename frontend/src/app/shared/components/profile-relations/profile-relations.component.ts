import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProfileRelation } from '../../model/interfaces';
import { RelationDetailsComponent } from '../relation-details/relation-details.component';

@Component({
  selector: 'app-profile-relations',
  templateUrl: './profile-relations.component.html',
  styleUrls: ['./profile-relations.component.css'],
})
export class ProfileRelationsComponent {
  @Output() showRelationDetails: EventEmitter<
    ProfileRelation
  > = new EventEmitter<ProfileRelation>();

  constructor(
    public dialogRef: MatDialogRef<RelationDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProfileRelation[]
  ) {}

  onRelationClick(relation: ProfileRelation): void {
    this.dialogRef.close(relation);
  }
}
