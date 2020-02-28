import { Component, OnInit } from '@angular/core';
import { welcomePhotos } from 'src/app/app.constants';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  photos = welcomePhotos;

  constructor() {}

  ngOnInit(): void {}
}
