import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment as env } from 'src/environments/environment';
import { io } from 'socket.io-client';

import {
  ChatAdapter,
  IChatParticipant,
  Message,
  ParticipantResponse,
} from 'ng-chat';
import { Socket } from '../ngx-socket-io/index'; //'ngx-socket-io';
import { Observable, of } from 'rxjs';
import {
  FETCH_CHATS_URL,
  FETCH_USERS_URL,
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
  private socket;

  constructor(
    private http: HttpClient,
    //private socket: Socket,
    private auth: AuthService
  ) {
    super();
    setTimeout(() => this.auth.isAuthenticated() && this.init(), 1000);
    this.socket = io(env.socketioUrl)
  }

  private init() {
/*    if ('serviceWorker' in navigator && 'PushManager' in window) {
      console.log('Service Worker and Push is supported');

      navigator.serviceWorker.register("/assets/notifications/serviceworker.js")
        .then(function(swReg) {
          console.log('Service Worker is registered', swReg);
          //initializeUI();
        })
        .catch(function(error) {
          console.error('Service Worker Error', error);
        });
    } else {
      console.warn('Push meapplicationServerPublicKeyssaging is not supported');
    }
*/
    this.socket.on('message', ({ message }) => {
      this.onMessageReceived(this.activeChatUser, message);
      alert(message.message);
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

    this.fetchUserPaths().subscribe(({ paths }) => {
      paths.forEach((path) => {
        if (!this.userConnections[path.target_id]) {
          this.userConnections[path.target_id] = path;
        }
      });
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

  public acknowledgeSeenMessage(): void {
    this.socket.emit('read_ack', {
      token: this.auth.token,
      chatmate_id: this.activeChatUser.id,
    });
  }

  get users() {
    return Object.values(this.userConnections);
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
