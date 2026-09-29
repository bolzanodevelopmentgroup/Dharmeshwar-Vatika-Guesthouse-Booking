/* ==========================================================
   Dharmeshwar Vatika & Guest House
   script.js
   ========================================================== */

document.addEventListener("DOMContentLoaded", function () {
  /* =====================================
       AOS Initialization
    ====================================== */

  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
  }

  /* =====================================
       Sticky Navbar
    ====================================== */

  const navbar = document.querySelector(".custom-navbar");

  function handleNavbar() {
    if (window.scrollY > 60) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  handleNavbar();
  window.addEventListener("scroll", handleNavbar);

  /* =====================================
       Animated Counter
    ====================================== */

  const counters = document.querySelectorAll(".counter");

  counters.forEach((counter) => {
    const updateCounter = () => {
      const target = +counter.getAttribute("data-target");
      const current = +counter.innerText;

      const increment = Math.ceil(target / 150);

      if (current < target) {
        counter.innerText = current + increment;

        setTimeout(updateCounter, 20);
      } else {
        counter.innerText = target.toLocaleString();
      }
    };

    updateCounter();
  });

  /* ==========================================================
                BOOKING FORM
========================================================== */

  const bookingForm = document.getElementById("bookingForm");

  if (bookingForm) {
    bookingForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Get Form Values

      const name = document.getElementById("customerName").value.trim();

      const mobile = document.getElementById("customerMobile").value.trim();

      const email = document.getElementById("customerEmail").value.trim();

      const bookingDate = document.getElementById("bookingDate").value;

      const eventType = document.getElementById("eventType").value;

      const guestCount = document.getElementById("guestCount").value;

      const requirements = document.getElementById("requirements").value.trim();

      // Validation

      if (name === "" || mobile === "") {
        alert("Please enter Full Name and Mobile Number.");

        return;
      }

      // Booking Message

      const whatsappMessage = `🙏 *New Booking Request*

🏨 Dharmeshwar Vatika & Guest House

--------------------------------------

👤 Name : ${name}

📱 Mobile : ${mobile}

📧 Email : ${email || "Not Provided"}

📅 Booking Date : ${bookingDate || "Not Selected"}

🎉 Event : ${eventType}

👥 Guests : ${guestCount || "Not Mentioned"}

📝 Special Requirements :

${requirements || "None"}

--------------------------------------

Please contact me regarding booking.

Thank You.`;

      // Success Message

      alert(
        `✅ Booking Request Prepared Successfully!

You will now be redirected to WhatsApp.


WhatsApp : +91 887488510
Email : akjha29@gmail.com`,
      );

      // Open WhatsApp

      const whatsappURL =
        "https://wa.me/91887488510?text=" + encodeURIComponent(whatsappMessage);

      window.open(whatsappURL, "_blank");

      // Reset Form

      bookingForm.reset();
    });
  }

  /* =====================================
       Smooth Scroll
    ====================================== */

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));

      if (target) {
        e.preventDefault();

        window.scrollTo({
          top: target.offsetTop - 70,

          behavior: "smooth",
        });
      }
    });
  });

  /* =====================================
       Mobile Menu Auto Close
    ====================================== */

  /*=========================================
        ACTIVE NAVIGATION
=========================================*/

  const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", function () {
      navLinks.forEach((item) => item.classList.remove("active"));

      this.classList.add("active");
    });
  });

  /* =====================================
       Gallery Image Popup
    ====================================== */

  const galleryImages = document.querySelectorAll(".gallery-item img");

  galleryImages.forEach((img) => {
    img.addEventListener("click", function () {
      const overlay = document.createElement("div");

      overlay.style.position = "fixed";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,.9)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "9999";
      overlay.style.cursor = "pointer";

      const image = document.createElement("img");

      image.src = this.src;
      image.style.maxWidth = "90%";
      image.style.maxHeight = "90%";
      image.style.borderRadius = "10px";
      image.style.boxShadow = "0 0 25px #000";

      overlay.appendChild(image);

      document.body.appendChild(overlay);

      overlay.addEventListener("click", () => {
        overlay.remove();
      });
    });
  });

  /* =====================================
       Scroll To Top Button
    ====================================== */

  const topBtn = document.createElement("button");

  topBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';

  topBtn.style.position = "fixed";
  topBtn.style.bottom = "20px";
  topBtn.style.left = "20px";
  topBtn.style.width = "50px";
  topBtn.style.height = "50px";
  topBtn.style.border = "none";
  topBtn.style.borderRadius = "50%";
  topBtn.style.background = "#C89B3C";
  topBtn.style.color = "#fff";
  topBtn.style.fontSize = "20px";
  topBtn.style.cursor = "pointer";
  topBtn.style.display = "none";
  topBtn.style.zIndex = "9999";
  topBtn.style.boxShadow = "0 5px 20px rgba(0,0,0,.3)";

  document.body.appendChild(topBtn);

  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      topBtn.style.display = "block";
    } else {
      topBtn.style.display = "none";
    }
  });

  topBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });
  });

  /* =====================================
       Hero Auto Caption Animation
    ====================================== */

  const captions = document.querySelectorAll(".carousel-caption");

  captions.forEach((caption) => {
    caption.style.animation = "fadeInUp 1.2s";
  });

  /* =====================================
       Button Hover Effect
    ====================================== */

  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.05)";
    });

    btn.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });
  });

  /* =====================================
       Current Year (Optional)
    ====================================== */

  const year = document.getElementById("year");

  if (year) {
    year.innerText = new Date().getFullYear();
  }
});

const sections = document.querySelectorAll("section, header");
const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 120;
    const sectionHeight = section.offsetHeight;

    if (window.pageYOffset >= sectionTop) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");

    if (link.getAttribute("href") === "#" + current) {
      link.classList.add("active");
    }
  });
});
