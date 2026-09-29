import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AboutPageComponent } from './about-page.component';
import { AdminPageComponent } from './admin-page.component';
import { BookingPageComponent } from './booking-page.component';
import { ContactPageComponent } from './contact-page.component';
import { GalleryPageComponent } from './gallery-page.component';
import { HomePageComponent } from './home-page.component';
import { PaymentPageComponent } from './payment-page.component';
import { ServicesPageComponent } from './services-page.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomePageComponent },
  { path: 'about', component: AboutPageComponent },
  { path: 'services', component: ServicesPageComponent },
  { path: 'gallery', component: GalleryPageComponent },
  { path: 'booking', component: BookingPageComponent },
  { path: 'payment', component: PaymentPageComponent },
  { path: 'contact', component: ContactPageComponent },
  { path: 'admin', component: AdminPageComponent },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
