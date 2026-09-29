const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRoomSummary, createRoomRecord, calculateAvailability, reserveRoomAllocationsForBooking } = require('./server');

test('buildRoomSummary calculates counts from room records', () => {
  const rooms = [
    { status: 'available' },
    { status: 'occupied' },
    { status: 'reserved' },
    { status: 'cleaning' },
    { status: 'available' }
  ];

  assert.deepEqual(buildRoomSummary(rooms), {
    total: 5,
    available: 2,
    occupied: 1,
    reserved: 1,
    cleaning: 1
  });
});

test('createRoomRecord stores a valid room from incoming payload', async () => {
  const room = await createRoomRecord({
    id: 999,
    name: 'Room 999',
    type: 'Guest Room',
    status: 'available',
    guestName: 'No guest',
    lastUpdated: 'Today'
  });

  assert.equal(room.id, 999);
  assert.equal(room.name, 'Room 999');
  assert.equal(room.status, 'available');
});

test('calculateAvailability reflects actual room counts and bookings', () => {
  const roomList = [
    { type: 'Guest Room', status: 'available' },
    { type: 'Guest Room', status: 'occupied' },
    { type: 'Guest Room', status: 'reserved' },
    { type: 'Family Suite', status: 'available' }
  ];

  const bookingList = [
    { roomType: 'guest-room', checkIn: '2026-09-28', checkOut: '2026-09-30', roomsBooked: 1 },
    { roomType: 'guest-room', checkIn: '2026-09-29', checkOut: '2026-10-01', roomsBooked: 2 }
  ];

  assert.deepEqual(calculateAvailability('guest-room', roomList, bookingList, '2026-09-29', '2026-09-30'), {
    roomType: 'guest-room',
    totalRooms: 3,
    bookedRooms: 3,
    available: 0,
    status: 'full'
  });
});

test('calculateAvailability reduces availability when admin marks rooms unavailable', () => {
  const roomList = [
    { type: 'Guest Room', status: 'available' },
    { type: 'Guest Room', status: 'occupied' },
    { type: 'Guest Room', status: 'cleaning' },
    { type: 'Guest Room', status: 'available' }
  ];

  const bookingList = [
    { roomType: 'guest-room', checkIn: '2026-09-29', checkOut: '2026-09-30', roomsBooked: 1 }
  ];

  assert.deepEqual(calculateAvailability('guest-room', roomList, bookingList, '2026-09-29', '2026-09-30'), {
    roomType: 'guest-room',
    totalRooms: 4,
    bookedRooms: 1,
    available: 1,
    status: 'limited'
  });
});

test('reserveRoomAllocationsForBooking marks available rooms as reserved for the selected room type', () => {
  const roomList = [
    { id: 2001, name: 'Room 2001', type: 'Guest Room', status: 'available', guestName: 'No guest' },
    { id: 2002, name: 'Room 2002', type: 'Guest Room', status: 'available', guestName: 'No guest' },
    { id: 2003, name: 'Room 2003', type: 'Guest Room', status: 'occupied', guestName: 'Existing guest' }
  ];

  const reservationIds = reserveRoomAllocationsForBooking(roomList, 'Guest Room', '2026-09-28', '2026-09-30', 1, []);

  assert.equal(reservationIds.length, 1);
  assert.ok(reservationIds.includes(2001) || reservationIds.includes(2002));
});
