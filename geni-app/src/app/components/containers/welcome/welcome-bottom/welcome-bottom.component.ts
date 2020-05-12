import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-welcome-bottom',
  templateUrl: './welcome-bottom.component.html',
  styleUrls: ['./welcome-bottom.component.css'],
})
export class WelcomeBottomComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  dummyClickHandler(info: string): void {
    console.log(info);
  }
}
