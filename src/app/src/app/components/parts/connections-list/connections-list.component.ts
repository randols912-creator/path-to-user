import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { Gender } from 'src/app/model/Profile';
import Connection from 'src/app/model/ProfileRelation';
import { GeniService } from 'src/app/services/geni.service';

const MALE_RELATIONS = ['father', 'son', 'brother', 'husband', 'ex-husband'];
const FEMALE_RELATIONS = ['mother', 'daughter', 'sister', 'wife', 'ex-wife'];

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css'],
})
export class ConnectionsListComponent implements OnInit {
  @Input() connections: Connection[];
  directConnectionsOnly = true;
  profilesFetched = false;
  loading = true;

  constructor(private auth: AuthService, private geni: GeniService) {}

  ngOnInit(): void {
    this.updateDirectProfiles();
    this.updateAllProfiles();
  }

  private updateDirectProfiles() {
    const directProfiles = [
      this.connections[0],
      this.connections[this.connections.length - 1],
    ].map((c) => c.id);

    if (directProfiles.length) {
      this.fetchProfiles(
        directProfiles,
        () => (this.loading = false),
        () => this.updateDirectProfiles()
      );
    }
  }

  private updateAllProfiles() {
    const unfetchedProfiles = this.connections
      .filter((c) => !c.profile)
      .slice(0, 50)
      .map((c) => c.id);

    if (unfetchedProfiles.length) {
      this.fetchProfiles(
        unfetchedProfiles,
        () => setTimeout(() => this.updateAllProfiles()),
        () => this.updateAllProfiles()
      );
    } else if (this.loading) {
      this.loading = false;
    }
  }

  private fetchProfiles(
    ids: string[],
    sucessCallback?: () => {},
    retryCallback?: () => void
  ) {
    this.geni
      .fetchProfiles(ids, [
        'id',
        'gender',
        'name',
        'names',
        'photo_urls',
        'birth',
        'death',
      ])
      .subscribe(
        (resp) => {
          const { results: profiles, error } = resp;
          if (!error) {
            profiles.forEach(
              (p) => (this.connections.find((c) => c.id === p.id).profile = p)
            );

            if (sucessCallback) {
              sucessCallback();
            }
          } else {
            if (retryCallback) {
              setTimeout(retryCallback, 500);
            }
          }
        },
        (err) => {
          console.log(err);
        }
      );
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
