import { Component, Input, OnInit } from '@angular/core';
import Profile from 'src/app/model/Profile';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
  @Input() user: Profile;
  @Input() relations: Array<any>;

  constructor() {}

  ngOnInit(): void {}

  dummyClickHandler(info: string): void {
    console.log(info);
  }
}
