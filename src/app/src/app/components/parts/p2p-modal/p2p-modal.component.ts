import { Component, EventEmitter, Output } from '@angular/core';
import {
  ChatParticipantStatus,
  ChatParticipantType,
  IChatParticipant,
} from 'ng-chat';

import {
  INITIAL_RELATIONS_LIMIT,
} from 'src/app/app.constants';

import { AuthService } from 'src/app/auth/auth.service';
import Path, { PathDetailsResponse } from 'src/app/model/Path';
import Profile from 'src/app/model/Profile';
import Connection from 'src/app/model/ProfileRelation';
import { GeniService } from 'src/app/services/geni.service';
import { I18nService } from 'src/app/services/i18n.service';
import { P2pService } from 'src/app/services/p2p.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';
import { RelationSortOrder } from 'src/app/pipes/relations-sort-by.pipe';

@Component({
  selector: 'app-p2p-modal',
  templateUrl: './p2p-modal.component.html',
  styleUrls: ['./p2p-modal.component.css'],
})
export class P2pModalComponent {
  @Output() public closeModal: EventEmitter<void> = new EventEmitter();
  activeUser: Path;
  activeUserConnections: Connection[];
  activeUserProfile: Profile;
  activeChatUser: IChatParticipant;

  activeTab = 1;

  limit = INITIAL_RELATIONS_LIMIT;

  constructor(
    private p2p: P2pService,
    private settings: SettingsService,
    private auth: AuthService,
    private relations: RelationService,
    private geni: GeniService,
    private i18n: I18nService
  ) {}

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }

  get users() {
    return this.p2p.users;
  }

  setActiveUser(user: Path) {
    this.activeUser = user;
    this.fetchRelationDetails();
    this.fetchProfile();

    this.activeChatUser = {
      id: this.activeUser.target_id,
      participantType: ChatParticipantType.User,
      status: ChatParticipantStatus.Online,
      displayName: this.i18n.extractProfileFullname(
        this.activeUser?.target_profile,
        this.settings.getLocale()
      ),
      avatar: this.activeUser.target_profile.photo_urls?.small,
    };
  }

  fetchRelationDetails() {
    this.relations
      .fetchRelationDetails({
        source_id: this.auth.user.id,
        target_id: this.activeUser.target_id,
      })
      .subscribe(({ path: { relations } }: PathDetailsResponse) => {
        relations.forEach((nextRelation) => {
          const urlParts = nextRelation.url.split('/');
          nextRelation.id = urlParts[urlParts.length - 1];
        });

        this.activeUserConnections = relations;
      });
  }

  fetchProfile() {
    this.geni
      .fetchProfiles(
        [this.activeUser.target_id],
        [
          'id',
          'name',
          'names',
          'first_name',
          'last_name',
          'photo_urls',
          'birth',
          'about_me',
          'detail_strings',
          'profile_url',
        ]
      )
      .subscribe(({ results: [profile], error }) => {
        if (!error) {
          this.activeUserProfile = profile;
        } else {
          setTimeout(() => this.fetchProfile(), 500);
        }
      }, console.log);
  }

  get sortOrder(): RelationSortOrder {
    return this.settings.getSortOrder();
  }

  acknowledgeSeenMessage() {
    this.p2p.acknowledgeSeenMessage();
  }

  get hasNewMessages() {
    return this.countNewMessages() > 0;
  }


  countNewMessages() {
    return this.p2p.countNewMessages(this.activeChatUser.id);
  }
}
