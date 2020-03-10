import { Component, Input, OnInit } from '@angular/core';
import Profile from 'src/app/model/Profile';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
  @Input() user: Profile;
  count = 0;

  constructor() {}

  ngOnInit(): void {}
}
