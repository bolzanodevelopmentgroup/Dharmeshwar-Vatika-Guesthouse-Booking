import { Component } from '@angular/core';

@Component({
  selector: 'app-about-page',
  templateUrl: './about-page.component.html'
})
export class AboutPageComponent {
  currentYear = new Date().getFullYear();
}
