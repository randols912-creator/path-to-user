import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { PathDetailsResponse } from 'src/app/model/Path';
import Connection from 'src/app/model/ProfileRelation';
import { P2pService } from 'src/app/services/p2p.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-p2p-modal',
  templateUrl: './p2p-modal.component.html',
  styleUrls: ['./p2p-modal.component.css'],
})
export class P2pModalComponent {
  @Output() public closeModal: EventEmitter<void> = new EventEmitter();
  activeRelative: Connection;
  activeTab = 1;
  connections: Connection[];

  constructor(
    private p2p: P2pService,
    private settings: SettingsService,
    private auth: AuthService,
    private relations: RelationService
  ) {}

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }

  get relatives() {
    return this.p2p.relatives;
  }

  setActiveRelative(relative: Connection, stepCount: number) {
    this.activeRelative = { ...relative, stepCount };
    this.fetchRelationDetails();
  }

  fetchRelationDetails() {
    this.relations
      .fetchRelationDetails({
        source_id: this.auth.user.id,
        target_id: 'profile-5370227', // TODO fix me
      })
      .subscribe(({ path: { relations } }: PathDetailsResponse) => {
        relations.forEach((nextRelation) => {
          const urlParts = nextRelation.url.split('/');
          nextRelation.id = urlParts[urlParts.length - 1];
        });

        this.connections = relations;
      });
  }
}
