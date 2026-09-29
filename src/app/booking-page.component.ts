import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  Subject,
  takeUntil
} from 'rxjs';

import {
  RoomAvailabilityCheck,
  RoomAvailabilityService,
  RoomRecord
} from './room-availability.service';

interface BookingForm {
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  bookingDate: string;
  eventType: string;
  guestCount: string;
  requirements: string;
  roomType: string;
  roomCount: number;
  checkIn: string;
  checkOut: string;
}

@Component({
  selector: 'app-booking-page',
  templateUrl: './booking-page.component.html'
})
export class BookingPageComponent
  implements OnInit, OnDestroy {

  private readonly destroy$ =
    new Subject<void>();

  currentYear =
    new Date().getFullYear();

  availability:
    Record<
      string,
      RoomAvailabilityCheck
    > = {};

  rooms: RoomRecord[] = [];

  totalRooms = 0;

  availableRooms = 0;

  confirmationMessage = '';

  lastUpdatedText =
    'Waiting for update...';

  realtimeConnected = false;

  booking: BookingForm = {
    customerName: '',
    customerMobile: '',
    customerEmail: '',
    bookingDate: '',
    eventType: 'Marriage',
    guestCount: '',
    requirements: '',
    roomType: 'guest-room',
    roomCount: 1,
    checkIn: '',
    checkOut: ''
  };

  constructor(
    private readonly roomAvailabilityService:
      RoomAvailabilityService
  ) {}

  ngOnInit(): void {

    /*
     * Initial load.
     */
    this.refreshData();

    /*
     * REAL-TIME ROOM STATUS.
     *
     * Admin changes room status:
     *
     * available -> cleaning
     *
     * Booking page receives this event
     * immediately.
     */
    this.roomAvailabilityService.roomsChanged$
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        (event) => {

          console.log(
            'Booking page room update:',
            event
          );

          this.refreshData();

          this.lastUpdatedText =
            `Updated ${new Date().toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }
            )}`;
        }
      );

    /*
     * REAL-TIME BOOKING UPDATE.
     */
    this.roomAvailabilityService.bookingsChanged$
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        (event) => {

          console.log(
            'Booking page booking update:',
            event
          );

          this.refreshData();
        }
      );

    /*
     * Socket connection status.
     */
    this.roomAvailabilityService.connection$
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        (connected) => {

          this.realtimeConnected =
            connected;

          /*
           * Refresh after reconnect.
           */
          if (connected) {
            this.refreshData();
          }
        }
      );
  }

  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();
  }

  /*
  |--------------------------------------------------------------------------
  | REFRESH EVERYTHING
  |--------------------------------------------------------------------------
  */

  refreshData(): void {

    this.refreshRooms();

    this.refreshAvailability();
  }

  /*
  |--------------------------------------------------------------------------
  | REFRESH ROOMS
  |--------------------------------------------------------------------------
  */

  refreshRooms(): void {

    this.roomAvailabilityService
      .getRooms()
      .subscribe({

        next: (rooms) => {

          this.rooms = rooms;
        },

        error: (error) => {

          console.error(
            'Unable to load rooms:',
            error
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | REFRESH AVAILABILITY
  |--------------------------------------------------------------------------
  */

  refreshAvailability(): void {

    const selectedRoomType =
      this.booking.roomType;

    this.roomAvailabilityService
      .getAvailability(
        selectedRoomType,
        this.booking.checkIn,
        this.booking.checkOut
      )
      .subscribe({

        next: (response) => {

          this.availability[
            selectedRoomType
          ] = response;

          this.totalRooms =
            response.totalRooms;

          this.availableRooms =
            response.available;

          this.lastUpdatedText =
            `Updated ${new Date().toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }
            )}`;
        },

        error: (error) => {

          console.error(
            'Availability error:',
            error
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | DATE CHANGED
  |--------------------------------------------------------------------------
  */

  onDatesChanged(): void {

    this.refreshAvailability();
  }

  /*
  |--------------------------------------------------------------------------
  | ROOM TYPE CHANGED
  |--------------------------------------------------------------------------
  */

  onRoomTypeChanged(): void {

    this.refreshAvailability();
  }

  /*
  |--------------------------------------------------------------------------
  | NORMALIZE ROOM TYPE
  |--------------------------------------------------------------------------
  */

  private normalizeRoomType(
    value: string
  ): string {

    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  /*
  |--------------------------------------------------------------------------
  | SELECTED ROOMS
  |--------------------------------------------------------------------------
  */

  getSelectedRooms():
    RoomRecord[] {

    const selectedType =
      this.normalizeRoomType(
        this.booking.roomType
      );

    return this.rooms.filter(
      (room) =>
        this.normalizeRoomType(
          room.type
        ) === selectedType
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ROOM STATUS LABEL
  |--------------------------------------------------------------------------
  */

  getRoomStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'available':
        return 'Available';

      case 'occupied':
        return 'Occupied';

      case 'reserved':
        return 'Reserved';

      case 'cleaning':
        return 'Cleaning';

      default:
        return status;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ROOM STATUS CLASS
  |--------------------------------------------------------------------------
  */

  getRoomStatusClass(
    status: string
  ): string {

    switch (status) {

      case 'available':
        return 'status-available';

      case 'occupied':
        return 'status-occupied';

      case 'reserved':
        return 'status-reserved';

      case 'cleaning':
        return 'status-cleaning';

      default:
        return '';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ACTIVE AVAILABILITY
  |--------------------------------------------------------------------------
  */

  getAvailabilityForActiveRoom():
    RoomAvailabilityCheck {

    const fallback:
      RoomAvailabilityCheck = {

        roomType:
          this.booking.roomType,

        totalRooms: 0,

        bookedRooms: 0,

        available: 0,

        status:
          'available'
      };

    return (
      this.availability[
        this.booking.roomType
      ] ||
      fallback
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LIVE LABEL
  |--------------------------------------------------------------------------
  */

  getLiveAvailabilityLabel():
    string {

    const current =
      this.getAvailabilityForActiveRoom();

    if (
      current.available > 2
    ) {
      return 'Available';
    }

    if (
      current.available > 0
    ) {
      return 'Limited';
    }

    return 'Fully booked';
  }

  /*
  |--------------------------------------------------------------------------
  | LIVE CSS CLASS
  |--------------------------------------------------------------------------
  */

  getLiveAvailabilityClass():
    string {

    const current =
      this.getAvailabilityForActiveRoom();

    if (
      current.available > 2
    ) {
      return 'text-success';
    }

    if (
      current.available > 0
    ) {
      return 'text-warning';
    }

    return 'text-danger';
  }

  /*
  |--------------------------------------------------------------------------
  | BOOKING UNAVAILABLE
  |--------------------------------------------------------------------------
  */

  isBookingUnavailable():
    boolean {

    if (
      !this.booking.checkIn ||
      !this.booking.checkOut
    ) {
      return false;
    }

    const requiredRooms =
      Number(
        this.booking.roomCount || 0
      );

    return (
      requiredRooms > 0 &&
      requiredRooms >
        this.availableRooms
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CHECK ROOM AVAILABILITY
  |--------------------------------------------------------------------------
  */

  checkRoomAvailability():
    boolean {

    const requiredRooms =
      Number(
        this.booking.roomCount || 0
      );

    if (
      !this.booking.checkIn ||
      !this.booking.checkOut
    ) {
      alert(
        'Please select both check-in and check-out dates.'
      );

      return false;
    }

    if (
      this.booking.checkOut <=
      this.booking.checkIn
    ) {
      alert(
        'Check-out date must be after the check-in date.'
      );

      return false;
    }

    if (
      requiredRooms <= 0
    ) {
      alert(
        'Please enter at least 1 room to book.'
      );

      return false;
    }

    if (
      requiredRooms >
      this.availableRooms
    ) {
      alert(
        `Only ${this.availableRooms} room(s) available for the selected dates.`
      );

      return false;
    }

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | SUBMIT BOOKING
  |--------------------------------------------------------------------------
  */

  submitBooking(): void {

    if (
      !this.booking.customerName.trim() ||
      !this.booking.customerMobile.trim()
    ) {

      alert(
        'Please enter Full Name and Mobile Number.'
      );

      return;
    }

    if (
      !this.checkRoomAvailability()
    ) {
      return;
    }

    const requiredRooms =
      Number(
        this.booking.roomCount || 0
      );

    /*
     * IMPORTANT:
     *
     * We check availability AGAIN on
     * the server before saving.
     *
     * This protects against two users
     * booking at almost the same time.
     */
    this.roomAvailabilityService
      .getAvailableRoomsForDates(
        this.booking.roomType,
        this.booking.checkIn,
        this.booking.checkOut
      )
      .subscribe({

        next: (availableRooms) => {

          if (
            requiredRooms >
            availableRooms
          ) {

            alert(
              `Only ${availableRooms} room(s) available for the selected dates.`
            );

            this.refreshData();

            return;
          }

          /*
           * Save booking.
           */
          this.roomAvailabilityService
            .addBooking(
              this.booking.roomType,

              this.booking.customerName.trim(),

              this.booking.checkIn,

              this.booking.checkOut,

              requiredRooms
            )
            .subscribe({

              next: (reservation) => {

                if (
                  !reservation.success
                ) {

                  alert(
                    reservation.message
                  );

                  this.refreshData();

                  return;
                }

                this.confirmationMessage =
                  `${reservation.message} Available rooms now: ${reservation.available}.`;

                const message =
                  `New Booking Request\n\n` +

                  `Name: ${this.booking.customerName}\n` +

                  `Mobile: ${this.booking.customerMobile}\n` +

                  `Email: ${
                    this.booking.customerEmail ||
                    'Not provided'
                  }\n` +

                  `Check-in: ${
                    this.booking.checkIn
                  }\n` +

                  `Check-out: ${
                    this.booking.checkOut
                  }\n` +

                  `Event: ${
                    this.booking.eventType
                  }\n` +

                  `Room Type: ${
                    this.booking.roomType
                      .replace(
                        '-',
                        ' '
                      )
                  }\n` +

                  `Rooms: ${
                    this.booking.roomCount
                  }\n` +

                  `Guests: ${
                    this.booking.guestCount ||
                    'Not mentioned'
                  }\n` +

                  `Requirements: ${
                    this.booking.requirements ||
                    'None'
                  }\n` +

                  `Status: ${
                    reservation.message
                  }`;

                window.open(
                  `https://wa.me/918208417376?text=${encodeURIComponent(
                    message
                  )}`,
                  '_blank'
                );

                alert(
                  this.confirmationMessage
                );

                /*
                 * Reset form.
                 */
                this.booking = {

                  customerName: '',

                  customerMobile: '',

                  customerEmail: '',

                  bookingDate: '',

                  eventType:
                    'Marriage',

                  guestCount: '',

                  requirements: '',

                  roomType:
                    'guest-room',

                  roomCount: 1,

                  checkIn: '',

                  checkOut: ''
                };

                this.refreshData();
              },

              error: (error) => {

                console.error(
                  'Booking save error:',
                  error
                );

                alert(
                  'Unable to save booking. Please try again.'
                );
              }
            });
        },

        error: (error) => {

          console.error(
            'Availability error:',
            error
          );

          alert(
            'Unable to check room availability. Please try again.'
          );
        }
      });
  }
}