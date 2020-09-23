import { Component, Input, OnInit } from '@angular/core';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { forkJoin, Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { Gender } from 'src/app/model/Profile';
import Connection from 'src/app/model/ProfileRelation';
import { GeniService } from 'src/app/services/geni.service';

const MALE_RELATIONS = ['father', 'son', 'brother', 'husband'];
const FEMALE_RELATIONS = ['mother', 'daughter', 'sister', 'wife'];

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css'],
})
export class ConnectionsListComponent {
  @Input() connections: Connection[];
  loading: boolean;
  directConnectionsOnly: boolean = true;
  faAngleDown = faAngleDown;

  constructor(private auth: AuthService) {}

  dummyClickHandler(info: string): void {
    console.log(info);
  }

  toggleDirectConnectionsOnly(): void {
    this.directConnectionsOnly = !this.directConnectionsOnly;
  }

  get userConnection(): Connection {
    return (
      this.connections?.length && {
        ...this.connections[0],
        gender: this.auth.user.gender,
        profile: this.auth.user,
      }
    );
  }

  get finalConnection(): Connection {
    return (
      this.connections?.length && this.connections[this.connections.length - 1]
    );
  }

  identifyConnectionGender(connection: Connection): Gender {
    if (!connection.gender) {
      let gender = Gender.UNDEFINED;
      if (MALE_RELATIONS.includes(connection.relation?.toLowerCase())) {
        gender = Gender.MALE;
      } else if (
        FEMALE_RELATIONS.includes(connection.relation?.toLowerCase())
      ) {
        gender = Gender.FEMALE;
      }

      connection.gender = gender;
    }

    return connection.gender;
  }
}
