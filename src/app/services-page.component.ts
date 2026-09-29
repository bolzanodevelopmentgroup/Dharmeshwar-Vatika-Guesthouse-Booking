import { Component } from '@angular/core';

@Component({
  selector: 'app-services-page',
  templateUrl: './services-page.component.html'
})
export class ServicesPageComponent {
  currentYear = new Date().getFullYear();
}
