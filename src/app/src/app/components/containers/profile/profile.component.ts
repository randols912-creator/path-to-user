import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Profile from 'src/app/model/Profile';
import { GeniService } from 'src/app/services/geni.service';

declare var Wiky: any;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: Profile;

  constructor(private geni: GeniService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.geni
      .fetchProfile(this.route.snapshot.params.id, [
        'id',
        'name',
        'first_name',
        'last_name',
        'photo_urls',
        'birth',
        'about_me',
      ])
      .subscribe((profile: Profile) => {
        this.profile = profile;
      });
  }

  get profilePhotoUrl(): string {
    return (
      this.profile.photo_urls &&
      (this.profile.photo_urls.large || this.profile.photo_urls.medium)
    );
  }

  get birthdate(): string {
    return (
      this.profile.birth &&
      this.profile.birth.date &&
      this.profile.birth.date.formatted_date
    );
  }

  get birthplace(): string {
    return (
      this.profile.birth &&
      this.profile.birth.location &&
      this.profile.birth.location.formatted_location
    );
  }

  get about(): string {
    return Wiky.toHtml(this.profile.about_me);
  }

  get fullname(): string {
    return this.profile.first_name && this.profile.last_name
      ? `${this.profile.first_name} ${this.profile.last_name}`
      : this.profile.name;
  }
}
