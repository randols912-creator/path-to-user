import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import Connection from 'src/app/model/ProfileRelation';
import { GeniService } from 'src/app/services/geni.service';

@Component({
  selector: 'app-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css'],
})
export class ConnectionComponent implements OnInit {
  @Input() connection: Connection;
  @Input() direct: boolean;

  constructor(private geni: GeniService, private auth: AuthService) {}

  ngOnInit(): void {
    if (!this.connection.profile) {
      this.geni
        .fetchProfileByLink(this.connection.url, [
          'gender',
          'name',
          'photo_urls',
          'birth',
          'death',
        ])
        .subscribe(profile => {
          this.connection.profile = profile;
        });
    }
  }

  get relationImgUlr(): string {
    return (
      this.connection.profile &&
      this.connection.profile.photo_urls &&
      this.connection.profile.photo_urls.medium
    );
  }

  get gender(): string {
    return this.connection.profile && this.connection.profile.gender
      ? this.connection.profile.gender
      : 'male';
  }
}
