import { AfterViewInit, Component, OnInit } from '@angular/core';

declare const AOS: any;

interface Booking {
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  bookingDate: string;
  eventType: string;
  guestCount: string;
  requirements: string;
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./app.component.css']
})
export class HomePageComponent implements OnInit, AfterViewInit {
  currentYear = new Date().getFullYear();

  booking: Booking = {
    customerName: '',
    customerMobile: '',
    customerEmail: '',
    bookingDate: '',
    eventType: '',
    guestCount: '',
    requirements: ''
  };

  ngOnInit(): void {
    // Preserves the original script.js year behavior.
  }

  ngAfterViewInit(): void {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 1000,
        once: true,
        easing: 'ease-in-out'
      });
    }

    this.setupStickyNavbar();
    this.setupGalleryPopup();
    this.setupScrollTopButton();
    this.setupButtonHover();
    this.setupHeroCaptionAnimation();
  }

  submitBooking(): void {
    if (!this.booking.customerName.trim() || !this.booking.customerMobile.trim()) {
      alert('Please enter Full Name and Mobile Number.');
      return;
    }

    const whatsappMessage = `🙏 *New Booking Request*

🏨 Dharmeshwar Vatika & Guest House

--------------------------------------

👤 Name : ${this.booking.customerName.trim()}

📱 Mobile : ${this.booking.customerMobile.trim()}

📧 Email : ${this.booking.customerEmail || 'Not Provided'}

📅 Booking Date : ${this.booking.bookingDate || 'Not Selected'}

🎉 Event : ${this.booking.eventType}

👥 Guests : ${this.booking.guestCount || 'Not Mentioned'}

📝 Special Requirements :

${this.booking.requirements || 'None'}

--------------------------------------

Please contact me regarding booking.

Thank You.`;

    alert(`✅ Booking Request Prepared Successfully!

You will now be redirected to WhatsApp.

WhatsApp : +91 887488510
Email : akjha29@gmail.com`);

    const whatsappURL =
      'https://wa.me/91887488510?text=' + encodeURIComponent(whatsappMessage);

    window.open(whatsappURL, '_blank');
    this.booking = {
      customerName: '',
      customerMobile: '',
      customerEmail: '',
      bookingDate: '',
      eventType: '',
      guestCount: '',
      requirements: ''
    };
  }

  copyUPI(): void {
    navigator.clipboard.writeText('akjha29@okicici')
      .then(() => alert('UPI ID copied: akjha29@okicici'))
      .catch(() => alert('UPI ID: akjha29@okicici'));
  }

  private setupStickyNavbar(): void {
    const navbar = document.querySelector('.custom-navbar');
    if (!navbar) return;

    const handleNavbar = () => {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    handleNavbar();
    window.addEventListener('scroll', handleNavbar);
  }

  private setupGalleryPopup(): void {
    document.querySelectorAll('.gallery-item img').forEach((element) => {
      const img = element as HTMLImageElement;

      img.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.style.cssText =
          'position:fixed;left:0;top:0;width:100%;height:100%;' +
          'background:rgba(0,0,0,.9);display:flex;align-items:center;' +
          'justify-content:center;z-index:9999;cursor:pointer;';

        const image = document.createElement('img');
        image.src = img.src;
        image.style.cssText =
          'max-width:90%;max-height:90%;border-radius:10px;box-shadow:0 0 25px #000;';

        overlay.appendChild(image);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => overlay.remove());
      });
    });
  }

  private setupScrollTopButton(): void {
    const topBtn = document.createElement('button');
    topBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    topBtn.style.cssText =
      'position:fixed;bottom:20px;left:20px;width:50px;height:50px;' +
      'border:none;border-radius:50%;background:#C89B3C;color:#fff;' +
      'font-size:20px;cursor:pointer;display:none;z-index:9999;' +
      'box-shadow:0 5px 20px rgba(0,0,0,.3);';

    document.body.appendChild(topBtn);

    window.addEventListener('scroll', () => {
      topBtn.style.display = window.scrollY > 400 ? 'block' : 'none';
    });

    topBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  private setupButtonHover(): void {
    document.querySelectorAll('.btn').forEach((element) => {
      const btn = element as HTMLElement;
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    });
  }

  private setupHeroCaptionAnimation(): void {
    document.querySelectorAll('.carousel-caption').forEach((caption) => {
      (caption as HTMLElement).style.animation = 'fadeInUp 1.2s';
    });
  }

}
