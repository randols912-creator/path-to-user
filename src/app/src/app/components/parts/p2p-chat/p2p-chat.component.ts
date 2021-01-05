import { Message } from '@angular/compiler/src/i18n/i18n_ast';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { IChatController, IChatParticipant } from 'ng-chat';
import { AuthService } from 'src/app/auth/auth.service';
import { P2pService } from 'src/app/services/p2p.service';

@Component({
  selector: 'app-p2p-chat',
  templateUrl: './p2p-chat.component.html',
  styleUrls: ['./p2p-chat.component.css'],
})
export class P2pChatComponent implements AfterViewInit {
  @Input() activeChatUser: IChatParticipant;
  @ViewChild('ngChat') ngChat: IChatController;

  userId: string;

  constructor(public p2p: P2pService, private auth: AuthService) {
    this.userId = this.auth.user.id;
  }

  ngAfterViewInit(): void {
    this.adapter.activeChatUser = this.activeChatUser;
    this.ngChat.triggerOpenChatWindow(this.activeChatUser);
  }

  onParticipantChatOpened(user: IChatParticipant) {
    console.log(user);
  }

  onMessagesSeen(messages: Message[]) {
    console.log(messages);
    // this.p2p.acknowledgeSeenMessage();
  }

  get adapter() {
    return this.p2p;
  }
}
