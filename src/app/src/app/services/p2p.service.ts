import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import {
  FETCH_CHATS_URL,
  FETCH_USERS_URL,
  SEARCH_USERS_URL,
} from '../app.constants';
import { AuthService } from '../auth/auth.service';
import Connection from '../model/ProfileRelation';

const USER_SEARCH_INTERVAL_MILLIS = 1000 * 60 * 3;

interface User2User {
  profile_id1: string;
  profile_id2: string;
}

@Injectable({
  providedIn: 'root',
})
export class P2pService {
  user2userPaths: User2User[] = [];
  userSearchIntervalId: NodeJS.Timeout;

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

    this.socket.on('user2user_path', (path: User2User) => {
      if (
        path.profile_id1 === this.auth.user.id &&
        !this.user2userPaths.find((p) => p.profile_id1 === path.profile_id1)
      ) {
        this.user2userPaths.push(path);
      }
    });

    this.fetchUsers(); // fetch found users while you were absent
    this.fetchChats();
    this.searchUsers(); // initial search without delay
    this.scheduleUserSearch();
  }

  private scheduleUserSearch() {
    this.userSearchIntervalId = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        this.searchUsers();
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

  private searchUsers() {
    return this.http.post(SEARCH_USERS_URL, {}).subscribe(console.log);
  }

  private fetchUsers() {
    return this.http.get(FETCH_USERS_URL).subscribe((data) => console.log);
  }

  private fetchChats() {
    return this.http.get(FETCH_CHATS_URL).subscribe(console.log);
  }
}
