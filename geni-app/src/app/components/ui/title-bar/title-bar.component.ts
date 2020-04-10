import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { homeUrl, menuUrl } from 'src/app/app.constants';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.css'],
})
export class TitleBarComponent implements OnInit {
  @Input() icons: string[];
  @Output() onToggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor(private location: Location, private router: Router) {}

  ngOnInit(): void {}

  isIconShown(name: string): boolean {
    return this.icons.indexOf(name) > -1;
  }

  iconClickHandler(): void {
    console.log('some');
  }

  gotoMenuHandler(): void {
    this.router.navigate([menuUrl]);
  }

  goToPreviousLocation(): void {
    this.location.back();
  }

  goToAllResults(): void {
    this.router.navigate([homeUrl]);
  }

  isMenu(): boolean {
    return this.router.url === menuUrl;
  }

  isHome(): boolean {
    return this.router.url === homeUrl;
  }
}
