import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {
  constructor(private location: Location) {}

  ngOnInit(): void {}

  goToPreviousLocation(): void {
    this.location.back();
  }
}
