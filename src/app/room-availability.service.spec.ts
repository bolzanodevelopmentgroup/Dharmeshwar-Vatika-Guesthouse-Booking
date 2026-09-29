import { TestBed } from '@angular/core/testing';
import { RoomAvailabilityService } from './room-availability.service';

describe('RoomAvailabilityService', () => {
  let service: RoomAvailabilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomAvailabilityService);
  });

  it('should reserve a room when capacity is available', () => {
    const result = service.reserve('guest-room', 1);
    expect(result.success).toBeTrue();
    expect(result.available).toBeGreaterThanOrEqual(0);
  });

  it('should block reservation when room is fully booked', () => {
    const fullBooking = service.reserve('guest-room', 999);
    const secondAttempt = service.reserve('guest-room', 1);

    expect(fullBooking.success).toBeFalse();
    expect(secondAttempt.success).toBeFalse();
  });
});
