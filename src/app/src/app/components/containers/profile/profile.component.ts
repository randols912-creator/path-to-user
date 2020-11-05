import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import Profile from 'src/app/model/Profile';
import { GeniService } from 'src/app/services/geni.service';

declare var Wiky: any;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: Observable<Profile>;

  constructor(private geni: GeniService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.profile = this.geni.fetchProfile(this.route.snapshot.params.id, [
      'id',
      'name',
      'first_name',
      'last_name',
      'photo_urls',
      'birth',
      'about_me',
      'profile_url',
    ]);
  }

  convertMdToHtml(markdown: string): string {
    return Wiky.toHtml(markdown);
  }
}
