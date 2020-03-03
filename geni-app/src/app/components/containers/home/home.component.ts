import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { menuUrl } from 'src/app/app.constants';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {}

  gotoMenuHandler(): void {
    this.router.navigate([menuUrl]);
  }
}
