import { Component, Input, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import * as jsonpath from 'jsonpath';
import { Subject } from 'rxjs';
import { Relation, RelationsResponse } from '../../model/interfaces';
import { RelationsService } from '../../services/relations.service';
import { ProfileRelationsComponent } from '../profile-relations/profile-relations.component';
import { RelationDetailsComponent } from '../relation-details/relation-details.component';

@Component({
  selector: 'app-relations',
  templateUrl: './relations.component.html',
  styleUrls: ['./relations.component.css'],
})
export class RelationsComponent implements OnInit {
  @Input() relationsStream$: Subject<RelationsResponse>;
  dataSource: MatTableDataSource<Relation> = new MatTableDataSource();

  @ViewChild(MatTable, { static: false }) table: MatTable<Relation>;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  isLoading = true;

  columns = ['profile_name', 'profiles_relationship', 'step_count'];

  columnsTitles = ['Name', 'Relationship', 'Step count'];

  columnsActions = [this.showProfileDetails, , this.showRelations];

  constructor(
    private zone: NgZone,
    private relationsService: RelationsService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const self = this;

    this.relationsStream$.subscribe(
      relationsData => {
        const src = relationsData.targets;
        const dest = self.dataSource.data;

        const beforePushCount = dest.length;

        for (let i = beforePushCount; i < src.length; i++) {
          dest.push(src[i]);
        }

        if (dest.length > beforePushCount) {
          this.dataSource.sort = this.sort;
          this.table.renderRows();
          this.isLoading = false;
        }
      },
      error => {
        console.error(error);
        this.isLoading = false;
      },
      () => {
        console.log('Relations table built!');
      }
    );
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  extractValue(object: object, path: string): any {
    const value = jsonpath.value(object, path);
    return typeof value === 'string' ? unescape(value) : value;
  }

  call(action: (relation: Relation) => void, relation: Relation): void {
    return action.bind(this)(relation);
  }

  private fetchAndOpenModalProfileDetails(profileId: string): void {
    this.relationsService.fetchDetails(profileId).subscribe(details => {
      if (!NgZone.isInAngularZone()) {
        this.zone.run(() => {
          this.dialog.open(RelationDetailsComponent, {
            width: '600px',
            data: details,
          });
        });
      }
    });
  }

  private showProfileDetails(relation: Relation): void {
    this.fetchAndOpenModalProfileDetails(relation.id);
  }

  private showRelations(relation: Relation): void {
    this.dialog
      .open(ProfileRelationsComponent, {
        width: '600px',
        data: relation.profile_relations,
      })
      .afterClosed()
      .subscribe(relationProfile => {
        if (relationProfile) {
          const urlParts = relationProfile.url.split('/');
          this.fetchAndOpenModalProfileDetails(urlParts[urlParts.length - 1]);
        }
      });
  }
}
