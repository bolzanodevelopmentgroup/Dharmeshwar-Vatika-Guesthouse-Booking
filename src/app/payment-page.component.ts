import { Component } from '@angular/core';

@Component({
  selector: 'app-payment-page',
  templateUrl: './payment-page.component.html'
})
export class PaymentPageComponent {
  currentYear = new Date().getFullYear();

  copyUPI(): void {
    navigator.clipboard.writeText('akjha29@okicici')
      .then(() => alert('UPI ID copied: akjha29@okicici'))
      .catch(() => alert('UPI ID: akjha29@okicici'));
  }
}
