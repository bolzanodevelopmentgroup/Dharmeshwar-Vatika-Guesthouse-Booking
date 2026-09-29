import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AboutPageComponent } from './about-page.component';
import { AdminPageComponent } from './admin-page.component';
import { BookingPageComponent } from './booking-page.component';
import { ContactPageComponent } from './contact-page.component';
import { GalleryPageComponent } from './gallery-page.component';
import { HomePageComponent } from './home-page.component';
import { PaymentPageComponent } from './payment-page.component';
import { ServicesPageComponent } from './services-page.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    AboutPageComponent,
    ServicesPageComponent,
    GalleryPageComponent,
    BookingPageComponent,
    PaymentPageComponent,
    ContactPageComponent,
    AdminPageComponent
  ],
  imports: [BrowserModule, FormsModule, HttpClientModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
