import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { menuUrl, millisBetweenBackendCalls } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import Profile from 'src/app/model/Profile';
import Relation from 'src/app/model/Relation';
import { RelationService } from 'src/app/services/relation.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  constructor(
    private router: Router,
    private auth: AuthService,
    private relationService: RelationService
  ) {}

  ngOnInit(): void {
    if (this.relations.length === 0) {
      const interval$ = interval(millisBetweenBackendCalls);
      this.relationService.fetchAll();
    }
  }

  gotoMenuHandler(): void {
    this.router.navigate([menuUrl]);
  }

  get user(): Profile {
    return this.auth.user;
  }

  get relations(): Array<Relation> {
    return this.relationService.getRelations();
  }
}
