
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
  DashboardSummary,
  RoomAvailabilityService,
  RoomRecord,
  RoomStatus
} from './room-availability.service';

export interface CustomerBooking {
  id: number;
  roomType: string;

  guestName: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;

  bookingDate: string;
  eventType: string;
  guestCount: string | number;
  requirements: string;

  checkIn: string;
  checkOut: string;

  roomsBooked: number;

  roomId?: number | null;
  roomIds?: number[];
}

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: [
    './app.component.css'
  ]
})
export class AdminPageComponent
  implements OnInit, OnDestroy {

  private readonly destroy$ =
    new Subject<void>();

  rooms: RoomRecord[] = [];

  bookings: CustomerBooking[] = [];

  summary: DashboardSummary = {
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0
  };

  realtimeConnected = false;

  newRoom:
    Partial<RoomRecord> = {

    id: 0,

    name: '',

    type: 'Guest Room',

    status: 'available',

    guestName: 'No guest',

    lastUpdated: 'Today'
  };

  constructor(
    private readonly roomAvailabilityService:
      RoomAvailabilityService
  ) {}

  ngOnInit(): void {

    /*
     * Initial dashboard load.
     */
    this.refreshView();

    /*
     * REAL-TIME ROOM UPDATE
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
            'Admin realtime room update:',
            event
          );

          this.refreshRooms();
        }
      );

    /*
     * REAL-TIME BOOKING UPDATE
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
            'Admin realtime booking update:',
            event
          );

          this.refreshBookings();

          this.refreshRooms();

          this.refreshSummary();
        }
      );

    /*
     * Socket.IO CONNECTION
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

          if (connected) {

            this.refreshView();
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

  refreshView(): void {

    this.refreshRooms();

    this.refreshSummary();

    this.refreshBookings();
  }

  /*
  |--------------------------------------------------------------------------
  | ROOMS
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
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  refreshSummary(): void {

    this.roomAvailabilityService
      .getDashboardSummary()
      .subscribe({

        next: (summary) => {

          this.summary =
            summary;
        },

        error: (error) => {

          console.error(
            'Unable to load summary:',
            error
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER BOOKINGS
  |--------------------------------------------------------------------------
  */

  refreshBookings(): void {

    this.roomAvailabilityService
      .getBookings()
      .subscribe({

        next: (bookings) => {

          this.bookings =
            [...bookings].sort(
              (a: CustomerBooking, b: CustomerBooking) =>
                Number(b.id) -
                Number(a.id)
            );
        },

        error: (error) => {

          console.error(
            'Unable to load customer bookings:',
            error
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | CONTACT CUSTOMER
  |--------------------------------------------------------------------------
  */

  callCustomer(
    mobile: string
  ): void {

    if (!mobile) {
      return;
    }

    window.location.href =
      `tel:${mobile}`;
  }

  emailCustomer(
    email: string
  ): void {

    if (!email) {
      return;
    }

    window.location.href =
      `mailto:${email}`;
  }

  whatsappCustomer(
    mobile: string
  ): void {

    if (!mobile) {
      return;
    }

    const cleanNumber =
      mobile.replace(
        /[^0-9]/g,
        ''
      );

    window.open(
      `https://wa.me/${cleanNumber}`,
      '_blank'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE BOOKING
  |--------------------------------------------------------------------------
  */

  deleteBooking(
    bookingId: number
  ): void {

    if (
      !confirm(
        'Delete this customer booking?'
      )
    ) {
      return;
    }

    this.roomAvailabilityService
      .deleteBooking(bookingId)
      .subscribe({

        next: () => {

          this.refreshView();
        },

        error: (error) => {

          console.error(
            'Unable to delete booking:',
            error
          );

          alert(
            error?.error?.message ||
            'Unable to delete booking.'
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | ADD ROOM
  |--------------------------------------------------------------------------
  */

  addRoom(): void {

    if (
      !this.newRoom.name ||
      !this.newRoom.type
    ) {

      alert(
        'Please enter room name and room type.'
      );

      return;
    }

    const payload:
      Partial<RoomRecord> = {

      id:
        Number(
          this.newRoom.id
        ) || Date.now(),

      name:
        this.newRoom.name.trim(),

      type:
        this.newRoom.type,

      status:
        this.newRoom.status ||
        'available',

      guestName:
        this.newRoom.guestName ||
        'No guest',

      lastUpdated:
        'Just now'
    };

    this.roomAvailabilityService
      .createRoom(payload)
      .subscribe({

        next: () => {

          this.newRoom = {

            id: 0,

            name: '',

            type: 'Guest Room',

            status: 'available',

            guestName: 'No guest',

            lastUpdated: 'Today'
          };

          this.refreshView();
        },

        error: (error) => {

          console.error(
            error
          );

          alert(
            error?.error?.message ||
            'Unable to add room.'
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE ROOM
  |--------------------------------------------------------------------------
  */

  deleteRoom(
    roomId: number
  ): void {

    if (
      !confirm(
        'Delete this room?'
      )
    ) {
      return;
    }

    this.roomAvailabilityService
      .deleteRoom(roomId)
      .subscribe({

        next: () => {

          this.refreshView();
        },

        error: () => {

          alert(
            'Unable to delete room.'
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | MARK CLEANING
  |--------------------------------------------------------------------------
  */

  markForCleaning(
    roomId: number
  ): void {

    this.roomAvailabilityService
      .markForCleaning(roomId)
      .subscribe({

        next: () => {

          this.refreshView();
        },

        error: (error) => {

          console.error(
            error
          );

          alert(
            'Unable to mark room for cleaning.'
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | COMPLETE CLEANING
  |--------------------------------------------------------------------------
  */

  completeCleaning(
    roomId: number
  ): void {

    this.roomAvailabilityService
      .completeCleaning(roomId)
      .subscribe({

        next: () => {

          this.refreshView();
        },

        error: (error) => {

          console.error(
            error
          );

          alert(
            'Unable to complete cleaning.'
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | CHANGE STATUS
  |--------------------------------------------------------------------------
  */

  setStatus(
    roomId: number,
    status: RoomStatus
  ): void {

    this.roomAvailabilityService
      .updateRoomStatus(
        roomId,
        status
      )
      .subscribe({

        next: () => {

          this.refreshView();
        },

        error: (error) => {

          console.error(
            error
          );

          alert(
            'Unable to update room status.'
          );
        }
      });
  }

  /*
  |--------------------------------------------------------------------------
  | CSS STATUS
  |--------------------------------------------------------------------------
  */

  getStatusClass(
    status: RoomStatus
  ): string {

    switch (status) {

      case 'available':
        return 'status-available';

      case 'occupied':
        return 'status-occupied';

      case 'reserved':
        return 'status-reserved';

      case 'cleaning':
      default:
        return 'status-cleaning';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STATUS LABEL
  |--------------------------------------------------------------------------
  */

  getStatusLabel(
    status: RoomStatus
  ): string {

    switch (status) {

      case 'available':
        return 'Available';

      case 'occupied':
        return 'Occupied';

      case 'reserved':
        return 'Reserved';

      case 'cleaning':
      default:
        return 'Cleaning';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | BOOKING ROOM TYPE LABEL
  |--------------------------------------------------------------------------
  */

  getBookingRoomType(
    roomType: string
  ): string {

    switch (roomType) {

      case 'guest-room':
        return 'Guest Room';

      case 'family-suite':
        return 'Family Suite';

      case 'deluxe-room':
        return 'Deluxe Room';

      case 'marriage-hall':
        return 'Marriage Hall';

      default:
        return roomType || '-';
    }
  }
}

