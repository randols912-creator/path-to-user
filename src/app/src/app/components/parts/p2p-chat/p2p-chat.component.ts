import { Message } from '@angular/compiler/src/i18n/i18n_ast';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { IChatParticipant } from 'ng-chat';
import { NgChat } from 'ng-chat/ng-chat/ng-chat.component';
import { AuthService } from 'src/app/auth/auth.service';
import { P2pService } from 'src/app/services/p2p.service';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-p2p-chat',
  templateUrl: './p2p-chat.component.html',
  styleUrls: ['./p2p-chat.component.css'],
})
export class P2pChatComponent implements AfterViewInit {
  @Input() activeChatUser: IChatParticipant;
  @ViewChild('ngChat') ngChat: NgChat;

  userId: string;

  constructor(
    public p2p: P2pService,
    private auth: AuthService,
    private settings: SettingsService
  ) {
    this.userId = this.auth.user.id;
  }

  ngAfterViewInit(): void {
    this.adapter.activeChatUser = this.activeChatUser;
    this.ngChat.triggerOpenChatWindow(this.activeChatUser);
  }

  onParticipantChatOpened(user: IChatParticipant) {
    // TODO fix me
  }

  onMessagesSeen(messages: Message[]) {
    // TODO add messages acknoledgement
  }

  onPredefineMessageSelected(text) {
    this.ngChat.windows[0].newMessage = text;
  }

  get adapter() {
    return this.p2p;
  }

  get showPredefinedMessages(): boolean {
    return (
      this.p2p.isNewChat &&
      !this.ngChat?.windows[0].messages.length &&
      !this.ngChat?.windows[0].newMessage
    );
  }

  get isHebrewLocale(): boolean {
    return this.settings.isHebrewLocale;
  }
}
