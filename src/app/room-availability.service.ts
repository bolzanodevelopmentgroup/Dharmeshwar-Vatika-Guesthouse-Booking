import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable,
  Subject
} from 'rxjs';

import {
  io,
  Socket
} from 'socket.io-client';

import { environment } from '../environments/environment';

export type RoomStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'cleaning';

export interface RoomRecord {
  _id?: string;

  id: number;

  name: string;

  type: string;

  status: RoomStatus;

  guestName: string;

  lastUpdated: string;
}

export interface DashboardSummary {
  total: number;

  available: number;

  occupied: number;

  reserved: number;

  cleaning: number;
}

export interface RoomAvailabilityCheck {
  roomType: string;

  totalRooms: number;

  bookedRooms: number;

  available: number;

  status:
    | 'available'
    | 'limited'
    | 'full'
    | string;
}

export interface BookingResponse {
  success: boolean;

  available: number;

  message: string;

  notifications?: {
    email: 'sent' | 'failed' | 'not_configured';
    whatsapp: 'sent' | 'failed' | 'not_configured';
  };

  booking?: any;

  roomIds?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class RoomAvailabilityService {

  private readonly apiUrl =
    `${environment.apiBaseUrl}/api`;

  private readonly socket: Socket;

  /*
   * Admin room changes.
   */
  private readonly roomsChangedSubject =
    new Subject<any>();

  readonly roomsChanged$ =
    this.roomsChangedSubject.asObservable();

  /*
   * Booking changes.
   */
  private readonly bookingsChangedSubject =
    new Subject<any>();

  readonly bookingsChanged$ =
    this.bookingsChangedSubject.asObservable();

  /*
   * Socket connection status.
   */
  private readonly connectionSubject =
    new Subject<boolean>();

  readonly connection$ =
    this.connectionSubject.asObservable();

  constructor(
    private readonly http: HttpClient
  ) {

    this.socket =
      io(environment.apiBaseUrl, {
        transports: [
          'websocket',
          'polling'
        ],

        reconnection: true,

        reconnectionAttempts: Infinity,

        reconnectionDelay: 1000
      });

    /*
     * Connected.
     */
    this.socket.on(
      'connect',
      () => {

        console.log(
          'Socket.IO connected:',
          this.socket.id
        );

        this.connectionSubject.next(
          true
        );
      }
    );

    /*
     * Disconnected.
     */
    this.socket.on(
      'disconnect',
      (reason) => {

        console.log(
          'Socket.IO disconnected:',
          reason
        );

        this.connectionSubject.next(
          false
        );
      }
    );

    /*
     * Room changed.
     *
     * This can originate from:
     *
     * 1. Admin Angular page
     * 2. MongoDB Compass
     * 3. Another browser
     */
    this.socket.on(
      'roomsChanged',
      (data) => {

        console.log(
          'REALTIME ROOM CHANGE:',
          data
        );

        this.roomsChangedSubject.next(
          data
        );
      }
    );

    /*
     * Booking changed.
     */
    this.socket.on(
      'bookingsChanged',
      (data) => {

        console.log(
          'REALTIME BOOKING CHANGE:',
          data
        );

        this.bookingsChangedSubject.next(
          data
        );
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GET ROOMS
  |--------------------------------------------------------------------------
  */

  getRooms(): Observable<RoomRecord[]> {

    return this.http.get<RoomRecord[]>(
      `${this.apiUrl}/rooms`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GET SUMMARY
  |--------------------------------------------------------------------------
  */

  getDashboardSummary():
    Observable<DashboardSummary> {

    return this.http.get<DashboardSummary>(
      `${this.apiUrl}/rooms/summary`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GET ROOM AVAILABILITY
  |--------------------------------------------------------------------------
  */

  getAvailability(
    roomType: string,
    checkIn?: string,
    checkOut?: string
  ): Observable<RoomAvailabilityCheck> {

    let params =
      new HttpParams();

    if (checkIn) {
      params =
        params.set(
          'checkIn',
          checkIn
        );
    }

    if (checkOut) {
      params =
        params.set(
          'checkOut',
          checkOut
        );
    }

    return this.http.get<RoomAvailabilityCheck>(
      `${this.apiUrl}/availability/${roomType}`,
      {
        params
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GET AVAILABLE ROOM COUNT
  |--------------------------------------------------------------------------
  */

  getAvailableRoomsForDates(
    roomType: string,
    checkIn: string,
    checkOut: string
  ): Observable<number> {

    return new Observable<number>(
      (subscriber) => {

        this.getAvailability(
          roomType,
          checkIn,
          checkOut
        ).subscribe({

          next: (response) => {
            subscriber.next(
              response.available
            );

            subscriber.complete();
          },

          error: (error) => {
            subscriber.error(
              error
            );
          }

        });
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ADD BOOKING
  |--------------------------------------------------------------------------
  */

  addBooking(booking: {
    roomType: string;
    guestName: string;
    customerName: string;
    customerMobile: string;
    customerEmail: string;
    bookingDate: string;
    eventType: string;
    guestCount: string;
    requirements: string;
    checkIn: string;
    checkOut: string;
    roomsBooked: number;
  }): Observable<BookingResponse> {

    return this.http.post<BookingResponse>(
      `${this.apiUrl}/bookings`,
      booking
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GET BOOKINGS
  |--------------------------------------------------------------------------
  */

  getBookings(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/bookings`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CREATE ROOM
  |--------------------------------------------------------------------------
  */

  createRoom(
    room: Partial<RoomRecord>
  ): Observable<RoomRecord> {

    return this.http.post<RoomRecord>(
      `${this.apiUrl}/rooms`,
      room
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE ROOM
  |--------------------------------------------------------------------------
  */

  updateRoom(
    roomId: number,
    room: Partial<RoomRecord>
  ): Observable<RoomRecord> {

    return this.http.put<RoomRecord>(
      `${this.apiUrl}/rooms/${roomId}`,
      room
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE ROOM
  |--------------------------------------------------------------------------
  */

  deleteRoom(
    roomId: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/rooms/${roomId}`
    );
  }

deleteBooking(
  bookingId: number
) {
  return this.http.delete(
    `${this.apiUrl}/api/bookings/${bookingId}`
  );
}

  /*
  |--------------------------------------------------------------------------
  | UPDATE ROOM STATUS
  |--------------------------------------------------------------------------
  */

  updateRoomStatus(
    roomId: number,
    status: RoomStatus
  ): Observable<any> {

    return this.http.patch(
      `${this.apiUrl}/rooms/${roomId}/status`,
      {
        status
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MARK CLEANING
  |--------------------------------------------------------------------------
  */

  markForCleaning(
    roomId: number
  ): Observable<any> {

    return this.updateRoomStatus(
      roomId,
      'cleaning'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | COMPLETE CLEANING
  |--------------------------------------------------------------------------
  */

  completeCleaning(
    roomId: number
  ): Observable<any> {

    return this.updateRoomStatus(
      roomId,
      'available'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DISCONNECT
  |--------------------------------------------------------------------------
  */

  disconnectRealtime(): void {

    this.socket.disconnect();
  }
}