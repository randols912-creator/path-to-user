import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment as env } from 'src/environments/environment';
import { ModalService } from 'src/app/services/modal.service';
import { P2pMessageModalComponent } from '../components/parts/p2p-message-modal/p2p-message-modal.component';
import { SettingsService } from 'src/app/services/settings.service';


import {
  ChatAdapter,
  IChatParticipant,
  Message,
  ParticipantResponse,
} from 'ng-chat';
import { Socket } from 'ngx-socket-io';
import { Observable, of } from 'rxjs';
import {
  FETCH_CHATS_URL,
  FETCH_USERS_URL,
  FETCH_NEW_MESSAGES_COUNT,
  SEARCH_USERS_URL,
} from '../app.constants';
import { AuthService } from '../auth/auth.service';
import Path from '../model/Path';

const USER_SEARCH_INTERVAL_MILLIS = 1000 * 60 * 3;

interface User2User {
  profile_id1: string;
  profile_id2: string;
}
interface IUsersConnections {
  [key: string]: Path;
}

interface IUsersNewMessagesCount {
  [key: string]: number;
}

interface ChatDetails {
  chats: {
    messages: Message[];
  }[];
}

interface UserPaths {
  paths: Path[];
}

@Injectable({
  providedIn: 'root',
})
export class P2pService extends ChatAdapter {
  activeChatUser: IChatParticipant;
  isNewChat: boolean;

  private userSearchIntervalId: NodeJS.Timeout;
  private userConnections: IUsersConnections = {};
  private usersNewMessagesCount: IUsersNewMessagesCount = {};

  constructor(
    private http: HttpClient,
    private socket: Socket,
    private auth: AuthService,
    private modal: ModalService,
    private settings: SettingsService
  ) {
    super();
    setTimeout(() => this.auth.isAuthenticated() && this.init(), 1000);
  }

  private init() {
    // Check if p2p disabled
    if (!this.settings.getP2p()) {
      this.dismissService();
      return;
    }

    this.socket.on('message', ({ message }) => {
      this.onMessageReceived(this.activeChatUser, message);
      // Increase new message counter
      this.usersNewMessagesCount[message.fromId] = (message.fromId in this.usersNewMessagesCount)
                                                    ? this.usersNewMessagesCount[message.fromId]+1
                                                    : 1;

      // Open message modal (if window is active)
      if (!this.modal.isModalOpen()) {
        var modalInstance = this.modal.open(P2pMessageModalComponent);
        modalInstance.messageText = message.message;
        modalInstance.messageSender = this.userConnections[message.fromId].target_profile["name"];
      }
      // Also, try notifying via Natification API (TODO: support mobile via service worker)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(message.message, {});
      }
    });

    this.socket.emit('init', { token: this.auth.token });

    this.socket.on(
      'user2user_path',
      ({ profile_id1: userId, profile_id2: chatmateId }: User2User) => {
        if (
          userId === this.auth.user.id &&
          !this.userConnections.hasOwnProperty(chatmateId)
        ) {
          this.userConnections[chatmateId] = undefined;
          this.fetchSingleUserPath(chatmateId).subscribe(
            (userPath) => (this.userConnections[chatmateId] = userPath)
          );
        }
      }
    );

    this.socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
            // the disconnection was initiated by the server, you need to reconnect manually
            this.socket.connect();
        }
        // else the socket will automatically try to reconnect
    });

    this.fetchUserPaths().subscribe(({ paths }) => {
      paths.forEach((path) => {
        if (!this.userConnections[path.target_id]) {
          this.userConnections[path.target_id] = path;
        }
      });
    });

    this.fetchNewMessagesCount().subscribe((counts) => {
      this.usersNewMessagesCount = counts;
    });


    this.scheduleUserSearch();
  }

  private scheduleUserSearch() {
    // Initial workers call without delay
    this.triggerSearchUsersWorkers().subscribe();

    this.userSearchIntervalId = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        this.triggerSearchUsersWorkers().subscribe();
      } else {
        this.dismissService();
      }
    }, USER_SEARCH_INTERVAL_MILLIS);
  }

  private dismissService() {
    this.socket.removeAllListeners();

    if (this.userSearchIntervalId) {
      clearInterval(this.userSearchIntervalId);
      console.log('User search canceled');
    }
  }

  private triggerSearchUsersWorkers(): Observable<any> {
    return this.http.post(SEARCH_USERS_URL, {});
  }

  private fetchUserPaths(): Observable<UserPaths> {
    return this.http.get<UserPaths>(FETCH_USERS_URL);
  }

  private fetchSingleUserPath(id?: string): Observable<Path> {
    return this.http.get<Path>(`${FETCH_USERS_URL}/${id}`);
  }

  private fetchChat(id?: string): Observable<ChatDetails> {
    return this.http.get<ChatDetails>(FETCH_CHATS_URL, {
      params: { chatmate_id: id },
    });
  }

  private fetchNewMessagesCount(id?: string): Observable<IUsersNewMessagesCount> {
    return this.http.get<IUsersNewMessagesCount>(FETCH_NEW_MESSAGES_COUNT);
  }

  public acknowledgeSeenMessage(): void {
    delete this.usersNewMessagesCount[this.activeChatUser.id];
    this.socket.emit('read_ack', {
      token: this.auth.token,
      chatmate_id: this.activeChatUser.id,
    });
  }

  get users() {
    return Object.values(this.userConnections);
  }

  get hasNewMessages() {
    return Object.keys(this.usersNewMessagesCount).length > 0;
  }

  countNewMessages(userId) {
    return (userId in this.usersNewMessagesCount)
              ? this.usersNewMessagesCount[userId]
              : 0;
  }
  /////////////////////////////////// CHAT ///////////////////////////////////
  listFriends(): Observable<ParticipantResponse[]> {
    return of([]);
  }

  getMessageHistory(destinataryId: any): Observable<Message[]> {
    return new Observable((observer) => {
      this.fetchChat(destinataryId).subscribe(({ chats: [resp] }) => {
        const { messages } = resp;
        this.isNewChat = messages.length === 0;
        observer.next(messages);
      });
    });
  }

  sendMessage(message: Message): void {
    setTimeout(() => {
      this.socket.emit('message', {
        message,
        token: this.auth.token,
        chatmate_id: this.activeChatUser.id,
      });
    }, 1000);
  }
  /////////////////////////////////// CHAT ///////////////////////////////////
}
