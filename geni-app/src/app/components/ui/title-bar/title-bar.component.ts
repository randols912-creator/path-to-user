import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.css'],
})
export class TitleBarComponent implements OnInit {
  @Input() icons: string[];
  @Output() onToggleMenu: EventEmitter<void> = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  isIconShown(name: string): boolean {
    return this.icons.indexOf(name) > -1;
  }

  iconClickHandler(): void {
    this.onToggleMenu.emit();
  }
}
