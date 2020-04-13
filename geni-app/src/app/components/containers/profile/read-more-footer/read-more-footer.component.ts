import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-read-more-footer',
  templateUrl: './read-more-footer.component.html',
  styleUrls: ['./read-more-footer.component.css'],
})
export class ReadMoreFooterComponent {
  @Input() fullname: string;
}
