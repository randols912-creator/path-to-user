import { Component, Input, OnInit } from '@angular/core';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { forkJoin } from 'rxjs';
import Connection from 'src/app/model/ProfileRelation';
import { GeniService } from 'src/app/services/geni.service';

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css'],
})
export class ConnectionsListComponent implements OnInit {
  @Input() connections: Array<Connection>;
  loading: boolean;
  directConnectionsOnly: boolean = true;
  faAngleDown = faAngleDown;

  constructor(private geni: GeniService) {}

  ngOnInit(): void {
    if (this.connections?.length) {
      const unitializedConnections = this.connections.filter((c) => !c.profile);

      if (unitializedConnections.length) {
        this.loading = true;

        forkJoin(
          unitializedConnections.map((c) =>
            this.geni.fetchProfileByLink(c.url, [
              'gender',
              'name',
              'photo_urls',
              'birth',
              'death',
            ])
          )
        ).subscribe((profiles) => {
          for (let i = 0; i < unitializedConnections.length; i++) {
            const element = unitializedConnections[i];
            element.profile = profiles[i];
          }
          this.loading = false;
        });
      } else {
        this.loading = false;
      }
    }
  }

  dummyClickHandler(info: string): void {
    console.log(info);
  }

  toggleDirectConnectionsOnly(): void {
    this.directConnectionsOnly = !this.directConnectionsOnly;
  }

  isDirectConnection(i: number): boolean {
    return i === 0 || i === this.connections.length - 1;
  }

  get userConnection(): Connection {
    return this.connections?.length && this.connections[0];
  }

  get finalConnection(): Connection {
    return (
      this.connections?.length && this.connections[this.connections.length - 1]
    );
  }
}
