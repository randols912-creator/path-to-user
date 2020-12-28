import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import {
  FETCH_CHATS_URL,
  FETCH_USERS_URL,
  SEARCH_USERS_URL
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

@Injectable({
  providedIn: 'root',
})
export class P2pService {
  private userSearchIntervalId: NodeJS.Timeout;
  private userConnections: IUsersConnections = {};

  constructor(
    private http: HttpClient,
    private socket: Socket,
    private auth: AuthService
  ) {
    setTimeout(() => this.auth.isAuthenticated() && this.init(), 1000);
  }

  private init() {
    this.socket.on('message', console.log);

    this.socket.emit('init', { token: this.auth.token });

    this.socket.on(
      'user2user_path',
      ({ profile_id1: userId, profile_id2: chatmateId }: User2User) => {
        if (
          userId === this.auth.user.id &&
          !this.userConnections.hasOwnProperty(chatmateId)
        ) {
          this.userConnections[chatmateId] = undefined;
          this.fetchUserPath(chatmateId).subscribe(
            (userPath) => (this.userConnections[chatmateId] = userPath)
          );
        }
      }
    );
    this.scheduleUserSearch();
  }

  private scheduleUserSearch() {
    this.triggerSearchUsersWorkers(); // Initial workers call without delay
    this.userSearchIntervalId = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        this.triggerSearchUsersWorkers();
      } else {
        this.dismiss();
      }
    }, USER_SEARCH_INTERVAL_MILLIS);
  }

  private dismiss() {
    this.socket.removeAllListeners();
    if (this.userSearchIntervalId) {
      clearInterval(this.userSearchIntervalId);
      console.log('User search canceled');
    }
  }

  private triggerSearchUsersWorkers() {
    return this.http.post(SEARCH_USERS_URL, {}).subscribe(console.log);
  }

  private fetchUserPath(id?: string): Observable<Path> {
    return this.http.get<Path>(`${FETCH_USERS_URL}/${id}`);
  }

  private fetchChats(id?: string): Observable<any> {
    return this.http.get(FETCH_CHATS_URL, {
      params: { chatmate_id: id },
    });
  }

  get users() {
    return Object.values(this.userConnections);
  }
}
