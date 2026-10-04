require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);

const PORT = Number(process.env.PORT || 3000);

const REQUIRE_MONGODB =
  process.env.NODE_ENV === 'production' ||
  process.env.REQUIRE_MONGODB === 'true';

const MONGODB_DATABASE =
  process.env.MONGODB_DATABASE ||
  'dharmeshwar_guesthouse';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  (REQUIRE_MONGODB
    ? ''
    : 'mongodb://127.0.0.1:27017/dharmeshwar_guesthouse');

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 'http://localhost:4200';

const ADMIN_EMAIL =
  process.env.BOOKING_ADMIN_EMAIL ||
  'testuser2.022016@gmail.com';
const ADMIN_WHATSAPP =
  process.env.BOOKING_WHATSAPP_TO || '917044099619';

const mailTransporter =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    : null;

async function sendBookingNotifications(booking) {
  const statuses = {
    email: 'not_configured',
    whatsapp: 'not_configured'
  };

  const bookingDetails = [
    `Name: ${booking.customerName}`,
    `Mobile: ${booking.customerMobile}`,
    `Email: ${booking.customerEmail}`,
    `Booking date: ${booking.bookingDate || 'Not selected'}`,
    `Event: ${booking.eventType || 'Not specified'}`,
    `Room type: ${booking.roomType}`,
    `Rooms: ${booking.roomsBooked}`,
    `Check-in: ${booking.checkIn}`,
    `Check-out: ${booking.checkOut}`,
    `Guests: ${booking.guestCount || 'Not mentioned'}`,
    `Requirements: ${booking.requirements || 'None'}`
  ].join('\n');

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: ADMIN_EMAIL,
        replyTo: booking.customerEmail,
        subject: `New booking request from ${booking.customerName}`,
        text: `A customer submitted a booking request.\n\n${bookingDetails}`
      });
      statuses.email = 'sent';
    } catch (error) {
      statuses.email = 'failed';
      console.error('Booking email notification failed:', error.message);
    }
  }

  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappTemplateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (
    whatsappToken &&
    whatsappPhoneNumberId &&
    whatsappTemplateName
  ) {
    try {
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${whatsappPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: ADMIN_WHATSAPP,
            type: 'template',
            template: {
              name: whatsappTemplateName,
              language: {
                code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US'
              },
              components: [
                {
                  type: 'body',
                  parameters: [
                    {
                      type: 'text',
                      text: `New booking request\n\n${bookingDetails}`
                    }
                  ]
                }
              ]
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`WhatsApp API returned HTTP ${response.status}`);
      }

      statuses.whatsapp = 'sent';
    } catch (error) {
      statuses.whatsapp = 'failed';
      console.error('Booking WhatsApp notification failed:', error.message);
    }
  }

  if (statuses.email === 'not_configured') {
    console.warn('Booking email notification skipped: SMTP is not configured.');
  }
  if (statuses.whatsapp === 'not_configured') {
    console.warn('Booking WhatsApp notification skipped: Cloud API credentials or approved template are not configured.');
  }

  return statuses;
}

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const corsOptions = {
  origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

/*
|--------------------------------------------------------------------------
| MongoDB state
|--------------------------------------------------------------------------
*/

let databaseAvailable = false;

let rooms = [];
let bookings = [];

let roomChangeStreamActive = false;
let bookingChangeStreamActive = false;

let roomChangeStream = null;
let bookingChangeStream = null;

/*
|--------------------------------------------------------------------------
| Fallback data
|--------------------------------------------------------------------------
| Used only if MongoDB is unavailable.
|--------------------------------------------------------------------------
*/

const defaultRooms = [
  {
    id: 101,
    name: 'Room 101',
    type: 'Guest Room',
    status: 'available',
    guestName: 'No guest',
    lastUpdated: 'Today'
  },
  {
    id: 102,
    name: 'Room 102',
    type: 'Guest Room',
    status: 'occupied',
    guestName: 'Mr. Sharma',
    lastUpdated: '2 hours ago'
  },
  {
    id: 103,
    name: 'Room 103',
    type: 'Guest Room',
    status: 'reserved',
    guestName: 'Family Booking',
    lastUpdated: '30 mins ago'
  },
  {
    id: 104,
    name: 'Room 104',
    type: 'Guest Room',
    status: 'cleaning',
    guestName: 'Checkout pending',
    lastUpdated: 'Now'
  },
  {
    id: 201,
    name: 'Suite 201',
    type: 'Family Suite',
    status: 'available',
    guestName: 'No guest',
    lastUpdated: 'Today'
  },
  {
    id: 202,
    name: 'Suite 202',
    type: 'Family Suite',
    status: 'occupied',
    guestName: 'Patel Family',
    lastUpdated: '45 mins ago'
  },
  {
    id: 301,
    name: 'Deluxe 301',
    type: 'Deluxe Room',
    status: 'reserved',
    guestName: 'Wedding Guest',
    lastUpdated: '15 mins ago'
  },
  {
    id: 302,
    name: 'Deluxe 302',
    type: 'Deluxe Room',
    status: 'available',
    guestName: 'No guest',
    lastUpdated: 'Today'
  },
  {
    id: 401,
    name: 'Hall A',
    type: 'Marriage Hall',
    status: 'occupied',
    guestName: 'Wedding Event',
    lastUpdated: '1 hour ago'
  },
  {
    id: 402,
    name: 'Hall B',
    type: 'Marriage Hall',
    status: 'cleaning',
    guestName: 'Event ended',
    lastUpdated: 'Now'
  }
];

const defaultBookings = [
  {
    id: 1,
    roomType: 'guest-room',
    guestName: 'Sample Guest',
    checkIn: '2026-09-28',
    checkOut: '2026-09-30',
    roomsBooked: 2,
    roomIds: []
  },
  {
    id: 2,
    roomType: 'family-suite',
    guestName: 'Sample Family',
    checkIn: '2026-09-27',
    checkOut: '2026-09-29',
    roomsBooked: 1,
    roomIds: []
  },
  {
    id: 3,
    roomType: 'deluxe-room',
    guestName: 'Sample Guest',
    checkIn: '2026-09-29',
    checkOut: '2026-10-01',
    roomsBooked: 2,
    roomIds: []
  }
];

/*
|--------------------------------------------------------------------------
| Mongoose schemas
|--------------------------------------------------------------------------
*/

const roomSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true
    },

    type: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        'available',
        'occupied',
        'reserved',
        'cleaning'
      ],
      default: 'available'
    },

    guestName: {
      type: String,
      default: 'No guest'
    },

    lastUpdated: {
      type: String,
      default: 'Today'
    }
  },
  {
    collection: 'rooms',
    timestamps: false
  }
);

const bookingSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },

    roomType: {
      type: String,
      required: true
    },

    guestName: {
      type: String,
      required: true
    },

    customerName: String,

    customerMobile: String,

    customerEmail: String,

    bookingDate: String,

    eventType: String,

    guestCount: String,

    requirements: String,

    checkIn: {
      type: String,
      required: true
    },

    checkOut: {
      type: String,
      required: true
    },

    roomsBooked: {
      type: Number,
      required: true
    },

    roomId: {
      type: Number,
      default: null
    },

    roomIds: {
      type: [Number],
      default: []
    }
  },
  {
    collection: 'bookings',
    timestamps: false
  }
);

const Room =
  mongoose.models.Room ||
  mongoose.model('Room', roomSchema);

const Booking =
  mongoose.models.Booking ||
  mongoose.model('Booking', bookingSchema);

/*
|--------------------------------------------------------------------------
| Utility functions
|--------------------------------------------------------------------------
*/

function toRoomTypeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function dateKey(date) {
  return new Date(date).getTime();
}

function overlaps(
  checkIn,
  checkOut,
  existingCheckIn,
  existingCheckOut
) {
  const start = dateKey(checkIn);
  const end = dateKey(checkOut);

  const existingStart = dateKey(existingCheckIn);
  const existingEnd = dateKey(existingCheckOut);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    Number.isNaN(existingStart) ||
    Number.isNaN(existingEnd)
  ) {
    return false;
  }

  return (
    start < existingEnd &&
    end > existingStart
  );
}

function getBookingRoomIds(booking) {
  if (!booking) {
    return [];
  }

  const directIds = Array.isArray(booking.roomIds)
    ? booking.roomIds
    : [];

  const fallbackId =
    booking.roomId !== undefined &&
    booking.roomId !== null
      ? [booking.roomId]
      : [];

  return [
    ...new Set(
      [...directIds, ...fallbackId]
        .map(Number)
        .filter((id) => !Number.isNaN(id))
    )
  ];
}

/*
|--------------------------------------------------------------------------
| Room summary
|--------------------------------------------------------------------------
*/

function buildRoomSummary(roomList) {
  return roomList.reduce(
    (summary, room) => {
      summary.total += 1;

      if (room.status === 'available') {
        summary.available += 1;
      }

      if (room.status === 'occupied') {
        summary.occupied += 1;
      }

      if (room.status === 'reserved') {
        summary.reserved += 1;
      }

      if (room.status === 'cleaning') {
        summary.cleaning += 1;
      }

      return summary;
    },
    {
      total: 0,
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0
    }
  );
}

/*
|--------------------------------------------------------------------------
| Availability
|--------------------------------------------------------------------------
*/

function calculateAvailability(
  roomType,
  roomList = [],
  bookingList = [],
  checkIn = null,
  checkOut = null
) {
  const normalizedRoomType =
    toRoomTypeKey(roomType);

  const targetRooms = roomList.filter(
    (room) =>
      toRoomTypeKey(room.type) ===
      normalizedRoomType
  );

  const totalRooms = targetRooms.length;

  /*
   * Current operational availability.
   */
  const currentlyAvailableRooms =
    targetRooms.filter(
      (room) => room.status === 'available'
    );

  /*
   * If dates are selected, consider bookings
   * overlapping those dates.
   */
  const matchingBookings = bookingList.filter(
    (booking) =>
      toRoomTypeKey(booking.roomType) ===
      normalizedRoomType
  );

  const relevantBookings =
    checkIn && checkOut
      ? matchingBookings.filter((booking) =>
          overlaps(
            checkIn,
            checkOut,
            booking.checkIn,
            booking.checkOut
          )
        )
      : [];

  const mappedBookedRoomIds = new Set(
    relevantBookings.flatMap(
      (booking) =>
        getBookingRoomIds(booking)
    )
  );

  const bookedRoomsByCount =
    relevantBookings.reduce(
      (total, booking) =>
        total +
        Number(
          booking.roomsBooked || 0
        ),
      0
    );

  let available;

  if (
    checkIn &&
    checkOut &&
    mappedBookedRoomIds.size > 0
  ) {
    /*
     * We know exactly which rooms are
     * assigned to overlapping bookings.
     */
    available =
      currentlyAvailableRooms.filter(
        (room) =>
          !mappedBookedRoomIds.has(
            Number(room.id)
          )
      ).length;
  } else if (
    checkIn &&
    checkOut
  ) {
    /*
     * Older booking records may not have
     * roomIds. Use roomsBooked as fallback.
     */
    available = Math.max(
      0,
      currentlyAvailableRooms.length -
        bookedRoomsByCount
    );
  } else {
    /*
     * No dates selected:
     * show current room status.
     */
    available =
      currentlyAvailableRooms.length;
  }

  return {
    roomType: normalizedRoomType,
    totalRooms,
    bookedRooms:
      mappedBookedRoomIds.size ||
      bookedRoomsByCount,
    available,
    status:
      available === 0
        ? 'full'
        : available <= 2
        ? 'limited'
        : 'available'
  };
}

/*
|--------------------------------------------------------------------------
| Allocate actual rooms for a booking
|--------------------------------------------------------------------------
*/

function reserveRoomAllocationsForBooking(
  roomList,
  roomType,
  checkIn,
  checkOut,
  requestedRooms,
  bookingList
) {
  const normalizedRoomType =
    toRoomTypeKey(roomType);

  const roomsForType =
    roomList.filter(
      (room) =>
        toRoomTypeKey(room.type) ===
        normalizedRoomType
    );

  const activeBookedRoomIds =
    new Set(
      bookingList
        .filter(
          (booking) =>
            toRoomTypeKey(
              booking.roomType
            ) === normalizedRoomType
        )
        .filter((booking) =>
          overlaps(
            checkIn,
            checkOut,
            booking.checkIn,
            booking.checkOut
          )
        )
        .flatMap(
          (booking) =>
            getBookingRoomIds(
              booking
            )
        )
    );

  const availableRooms =
    roomsForType.filter((room) => {
      if (room.status !== 'available') {
        return false;
      }

      if (
        activeBookedRoomIds.has(
          Number(room.id)
        )
      ) {
        return false;
      }

      return true;
    });

  return availableRooms
    .slice(0, Number(requestedRooms))
    .map((room) => Number(room.id));
}

/*
|--------------------------------------------------------------------------
| MongoDB connection
|--------------------------------------------------------------------------
*/

async function connectToMongo() {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        'MONGODB_URI must be configured when MongoDB is required.'
      );
    }

    await mongoose.connect(
      MONGODB_URI,
      {
        dbName: MONGODB_DATABASE,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        w: 'majority'
      }
    );

    databaseAvailable = true;

    console.log(
      'MongoDB connected successfully.'
    );

    const roomCount =
      await Room.countDocuments();

    const bookingCount =
      await Booking.countDocuments();

    console.log(
      `MongoDB rooms: ${roomCount}`
    );

    console.log(
      `MongoDB bookings: ${bookingCount}`
    );
  } catch (error) {
    databaseAvailable = false;

    console.warn(
      'MongoDB connection failed:',
      error.message
    );

    if (REQUIRE_MONGODB) {
      throw new Error(
        `Server startup stopped because required MongoDB is unavailable: ${error.message}`
      );
    }

    /*
     * Use fallback memory data.
     */
    rooms = [...defaultRooms];
    bookings = [...defaultBookings];

    console.warn(
      'Using fallback in-memory data.'
    );
  }
}

/*
|--------------------------------------------------------------------------
| MongoDB data access
|--------------------------------------------------------------------------
*/

async function getRoomRecords() {
  if (databaseAvailable) {
    return Room.find()
      .sort({ id: 1 })
      .lean();
  }

  return [...rooms];
}

async function getBookingsData() {
  if (databaseAvailable) {
    return Booking.find()
      .sort({ id: 1 })
      .lean();
  }

  return [...bookings];
}

/*
|--------------------------------------------------------------------------
| Room CRUD
|--------------------------------------------------------------------------
*/

async function createRoomRecord(roomInput) {
  const payload = roomInput || {};

  const validated = {
    id:
      payload.id !== undefined
        ? Number(payload.id)
        : Date.now(),

    name: String(
      payload.name || ''
    ).trim(),

    type: String(
      payload.type || 'Guest Room'
    ).trim(),

    status: [
      'available',
      'occupied',
      'reserved',
      'cleaning'
    ].includes(payload.status)
      ? payload.status
      : 'available',

    guestName: String(
      payload.guestName ||
        'No guest'
    ).trim(),

    lastUpdated: String(
      payload.lastUpdated ||
        'Today'
    ).trim()
  };

  if (!validated.name) {
    throw new Error(
      'Room name is required.'
    );
  }

  if (
    !Number.isFinite(
      validated.id
    )
  ) {
    throw new Error(
      'Room ID must be numeric.'
    );
  }

  if (databaseAvailable) {
    const created =
      await Room.create(
        validated
      );

    return created.toObject();
  }

  const duplicate =
    rooms.find(
      (room) =>
        Number(room.id) ===
        Number(validated.id)
    );

  if (duplicate) {
    throw new Error(
      'Room ID already exists.'
    );
  }

  rooms.push(validated);

  return validated;
}

async function updateRoomRecord(
  roomId,
  update
) {
  if (databaseAvailable) {
    /*
     * upsert = false is intentional.
     * We do not want a bad room ID to
     * silently create a new room.
     */
    return Room.findOneAndUpdate(
      {
        id: Number(roomId)
      },
      {
        $set: update
      },
      {
        new: true,
        upsert: false
      }
    ).lean();
  }

  const target =
    rooms.find(
      (room) =>
        Number(room.id) ===
        Number(roomId)
    );

  if (!target) {
    return null;
  }

  Object.assign(
    target,
    update
  );

  return target;
}

async function deleteRoomRecord(
  roomId
) {
  if (databaseAvailable) {
    const deleted =
      await Room.findOneAndDelete({
        id: Number(roomId)
      });

    return Boolean(deleted);
  }

  const index =
    rooms.findIndex(
      (room) =>
        Number(room.id) ===
        Number(roomId)
    );

  if (index === -1) {
    return false;
  }

  rooms.splice(index, 1);

  return true;
}

/*
|--------------------------------------------------------------------------
| Booking persistence
|--------------------------------------------------------------------------
*/

async function persistBooking(
  booking
) {
  if (databaseAvailable) {
    const saved =
      await Booking.create(
        booking
      );

    return saved.toObject();
  }

  bookings.push(booking);

  return booking;
}

/*
|--------------------------------------------------------------------------
| Socket.IO connection
|--------------------------------------------------------------------------
*/

io.on('connection', (socket) => {
  console.log(
    `Realtime client connected: ${socket.id}`
  );

  socket.emit(
    'connected',
    {
      socketId: socket.id,
      message:
        'Realtime connection established.'
    }
  );

  socket.on('disconnect', () => {
    console.log(
      `Realtime client disconnected: ${socket.id}`
    );
  });
});

/*
|--------------------------------------------------------------------------
| MongoDB Change Streams
|--------------------------------------------------------------------------
|
| This is important for your MongoDB Compass requirement.
|
| If an admin changes:
|
| rooms.status
|
| directly in MongoDB Compass, the change stream
| can notify Angular without waiting for the
| Angular Admin page.
|
| MongoDB Atlas supports change streams.
| A standalone local MongoDB may not.
|--------------------------------------------------------------------------
*/

async function startMongoChangeStreams() {
  if (!databaseAvailable) {
    return;
  }

  /*
   * ROOM CHANGE STREAM
   */
  try {
    roomChangeStream =
      Room.watch(
        [],
        {
          fullDocument:
            'updateLookup'
        }
      );

    roomChangeStreamActive = true;

    console.log(
      'MongoDB room change stream enabled.'
    );

    roomChangeStream.on(
      'change',
      (change) => {
        console.log(
          'MongoDB room change:',
          change.operationType
        );

        io.emit(
          'roomsChanged',
          {
            operation:
              change.operationType,

            room:
              change.fullDocument ||
              null
          }
        );
      }
    );

    roomChangeStream.on(
      'error',
      (error) => {
        roomChangeStreamActive = false;

        console.warn(
          'Room change stream error:',
          error.message
        );
      }
    );
  } catch (error) {
    roomChangeStreamActive = false;

    console.warn(
      'Room change stream unavailable:',
      error.message
    );
  }

  /*
   * BOOKING CHANGE STREAM
   */
  try {
    bookingChangeStream =
      Booking.watch(
        [],
        {
          fullDocument:
            'updateLookup'
        }
      );

    bookingChangeStreamActive = true;

    console.log(
      'MongoDB booking change stream enabled.'
    );

    bookingChangeStream.on(
      'change',
      (change) => {
        console.log(
          'MongoDB booking change:',
          change.operationType
        );

        io.emit(
          'bookingsChanged',
          {
            operation:
              change.operationType,

            booking:
              change.fullDocument ||
              null
          }
        );
      }
    );

    bookingChangeStream.on(
      'error',
      (error) => {
        bookingChangeStreamActive = false;

        console.warn(
          'Booking change stream error:',
          error.message
        );
      }
    );
  } catch (error) {
    bookingChangeStreamActive = false;

    console.warn(
      'Booking change stream unavailable:',
      error.message
    );
  }
}

/*
|--------------------------------------------------------------------------
| Manual realtime fallback
|--------------------------------------------------------------------------
|
| If MongoDB change streams are unavailable,
| API operations manually send the events.
|--------------------------------------------------------------------------
*/

function emitRoomsChanged(
  operation,
  room
) {
  if (!roomChangeStreamActive) {
    io.emit(
      'roomsChanged',
      {
        operation,
        room
      }
    );
  }
}

function emitBookingsChanged(
  operation,
  booking
) {
  if (!bookingChangeStreamActive) {
    io.emit(
      'bookingsChanged',
      {
        operation,
        booking
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.json({
    name:
      'Dharmeshwar Guesthouse API',

    status: 'ok',

    database:
      databaseAvailable
        ? 'mongodb'
        : 'fallback',

    realtime: true,

    endpoints: [
      '/api/health',
      '/api/rooms',
      '/api/rooms/summary',
      '/api/availability/:roomType',
      '/api/bookings'
    ]
  });
});

app.get('/api', (req, res) => {
  res.json({
    name:
      'Dharmeshwar Guesthouse API',

    status: 'ok',

    database:
      databaseAvailable
        ? 'mongodb'
        : 'fallback',

    realtime: true
  });
});

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      status: 'ok',

      database:
        databaseAvailable
          ? 'mongodb'
          : 'fallback',

      realtime: true,

      roomChangeStream:
        roomChangeStreamActive,

      bookingChangeStream:
        bookingChangeStreamActive,

      timestamp:
        new Date().toISOString()
    });
  }
);

/*
|--------------------------------------------------------------------------
| ROOMS
|--------------------------------------------------------------------------
*/

app.get(
  '/api/rooms',
  async (req, res) => {
    try {
      res.json(
        await getRoomRecords()
      );
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
);

app.get(
  '/api/rooms/summary',
  async (req, res) => {
    try {
      const roomList =
        await getRoomRecords();

      res.json(
        buildRoomSummary(
          roomList
        )
      );
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
);

app.get(
  '/api/rooms/:id',
  async (req, res) => {
    try {
      const roomList =
        await getRoomRecords();

      const room =
        roomList.find(
          (item) =>
            Number(item.id) ===
            Number(req.params.id)
        );

      if (!room) {
        return res.status(404).json({
          message:
            'Room not found.'
        });
      }

      res.json(room);
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE ROOM
|--------------------------------------------------------------------------
*/

app.post(
  '/api/rooms',
  async (req, res) => {
    try {
      const room =
        await createRoomRecord(
          req.body
        );

      emitRoomsChanged(
        'insert',
        room
      );

      res.status(201).json(
        room
      );
    } catch (error) {
      res.status(400).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE ROOM
|--------------------------------------------------------------------------
*/

app.put(
  '/api/rooms/:id',
  async (req, res) => {
    try {
      const room =
        await updateRoomRecord(
          req.params.id,
          req.body
        );

      if (!room) {
        return res.status(404).json({
          message:
            'Room not found.'
        });
      }

      emitRoomsChanged(
        'update',
        room
      );

      res.json(room);
    } catch (error) {
      res.status(400).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE ROOM
|--------------------------------------------------------------------------
*/

app.delete(
  '/api/rooms/:id',
  async (req, res) => {
    try {
      const deleted =
        await deleteRoomRecord(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          message:
            'Room not found.'
        });
      }

      emitRoomsChanged(
        'delete',
        {
          id:
            Number(req.params.id)
        }
      );

      res.json({
        success: true,
        message:
          'Room deleted successfully.'
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CHANGE ROOM STATUS
|--------------------------------------------------------------------------
*/

app.patch(
  '/api/rooms/:id/status',
  async (req, res) => {
    const roomId =
      Number(req.params.id);

    const { status } =
      req.body;

    const allowedStatuses = [
      'available',
      'occupied',
      'reserved',
      'cleaning'
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          'Unsupported room status.'
      });
    }

    try {
      const room =
        await updateRoomRecord(
          roomId,
          {
            status,

            guestName:
              status === 'available'
                ? 'No guest'
                : 'Updated by admin',

            lastUpdated:
              'Just now'
          }
        );

      if (!room) {
        return res.status(404).json({
          message:
            'Room not found.'
        });
      }

      /*
       * If MongoDB Change Streams are active,
       * the change stream will send the event.
       *
       * Otherwise this sends it manually.
       */
      emitRoomsChanged(
        'update',
        room
      );

      res.json({
        success: true,
        room
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| AVAILABILITY
|--------------------------------------------------------------------------
*/

app.get(
  '/api/availability',
  async (req, res) => {
    try {
      const roomType =
        toRoomTypeKey(
          req.query.roomType ||
            'guest-room'
        );

      const checkIn =
        req.query.checkIn ||
        null;

      const checkOut =
        req.query.checkOut ||
        null;

      const roomList =
        await getRoomRecords();

      const bookingList =
        await getBookingsData();

      res.json(
        calculateAvailability(
          roomType,
          roomList,
          bookingList,
          checkIn,
          checkOut
        )
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

app.get(
  '/api/availability/:roomType',
  async (req, res) => {
    try {
      const roomType =
        toRoomTypeKey(
          req.params.roomType
        );

      const checkIn =
        req.query.checkIn ||
        null;

      const checkOut =
        req.query.checkOut ||
        null;

      const roomList =
        await getRoomRecords();

      const bookingList =
        await getBookingsData();

      res.json(
        calculateAvailability(
          roomType,
          roomList,
          bookingList,
          checkIn,
          checkOut
        )
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
*/

app.post(
  '/api/bookings',
  async (req, res) => {
    try {
      const {
        roomType,
        guestName,
        customerName,
        customerMobile,
        customerEmail,
        bookingDate,
        eventType,
        guestCount,
        requirements,
        checkIn,
        checkOut,
        roomsBooked
      } = req.body;

      if (
        !roomType ||
        !guestName ||
        !customerMobile ||
        !customerEmail ||
        !checkIn ||
        !checkOut
      ) {
        return res.status(400).json({
          success: false,
          available: 0,
          message:
            'Please complete all booking details.'
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          String(customerEmail).trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          available: 0,
          message: 'Please provide a valid email address.'
        });
      }

      if (
        dateKey(checkOut) <=
        dateKey(checkIn)
      ) {
        return res.status(400).json({
          success: false,
          available: 0,
          message:
            'Check-out date must be after check-in date.'
        });
      }

      const requestedRooms =
        Number(roomsBooked);

      if (
        !Number.isInteger(
          requestedRooms
        ) ||
        requestedRooms <= 0
      ) {
        return res.status(400).json({
          success: false,
          available: 0,
          message:
            'Please select at least 1 room.'
        });
      }

      const cleanRoomType =
        toRoomTypeKey(
          roomType
        );

      const roomList =
        await getRoomRecords();

      const existingBookings =
        await getBookingsData();

      /*
       * Check current availability.
       */
      const availability =
        calculateAvailability(
          cleanRoomType,
          roomList,
          existingBookings,
          checkIn,
          checkOut
        );

      if (
        availability.available <
        requestedRooms
      ) {
        return res.status(400).json({
          success: false,

          available:
            availability.available,

          message:
            `Only ${availability.available} room(s) available for the selected dates.`
        });
      }

      /*
       * Allocate actual room IDs.
       */
      const assignedRoomIds =
        reserveRoomAllocationsForBooking(
          roomList,
          cleanRoomType,
          checkIn,
          checkOut,
          requestedRooms,
          existingBookings
        );

      if (
        assignedRoomIds.length <
        requestedRooms
      ) {
        return res.status(409).json({
          success: false,

          available:
            assignedRoomIds.length,

          message:
            'Room availability changed. Please refresh and try again.'
        });
      }

      const newBooking = {
        id: Date.now(),

        roomType:
          cleanRoomType,

        guestName:
          String(guestName).trim(),

        customerName:
          String(customerName || guestName).trim(),

        customerMobile:
          String(customerMobile).trim(),

        customerEmail:
          String(customerEmail).trim(),

        bookingDate:
          bookingDate || '',

        eventType:
          eventType || '',

        guestCount:
          guestCount || '',

        requirements:
          requirements || '',

        checkIn,

        checkOut,

        roomsBooked:
          requestedRooms,

        roomId:
          assignedRoomIds[0] ||
          null,

        roomIds:
          assignedRoomIds
      };

      /*
       * Mark allocated rooms as reserved.
       */
      for (
        const roomId
        of assignedRoomIds
      ) {
        await updateRoomRecord(
          roomId,
          {
            status:
              'reserved',

            guestName:
              String(
                guestName
              ).trim(),

            lastUpdated:
              'Just now'
          }
        );
      }

      /*
       * Save booking.
       */
      const savedBooking =
        await persistBooking(
          newBooking
        );

      const notificationStatus =
        await sendBookingNotifications(
          savedBooking
        );

      /*
       * Notify clients if MongoDB
       * change streams are not active.
       */
      emitRoomsChanged(
        'update',
        {
          roomIds:
            assignedRoomIds
        }
      );

      emitBookingsChanged(
        'insert',
        savedBooking
      );

      /*
       * Recalculate after booking.
       */
      const updatedRooms =
        await getRoomRecords();

      const updatedBookings =
        await getBookingsData();

      const updatedAvailability =
        calculateAvailability(
          cleanRoomType,
          updatedRooms,
          updatedBookings,
          checkIn,
          checkOut
        );

      res.status(201).json({
        success: true,

        booking:
          savedBooking,

        roomIds:
          assignedRoomIds,

        available:
          updatedAvailability.available,

        notifications:
          notificationStatus,

        message:
          `Booking confirmed for ${requestedRooms} room(s) from ${checkIn} to ${checkOut}.`
      });
    } catch (error) {
      console.error(
        'Booking error:',
        error
      );

      res.status(500).json({
        success: false,
        available: 0,
        message:
          'Unable to save booking.'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET BOOKINGS
|--------------------------------------------------------------------------
*/

app.get(
  '/api/bookings',
  async (req, res) => {
    try {
      res.json(
        await getBookingsData()
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE BOOKING
|--------------------------------------------------------------------------
*/

app.delete(
  '/api/bookings/:id',
  async (req, res) => {
    try {
      const bookingId =
        Number(req.params.id);

      let deletedBooking =
        null;

      if (databaseAvailable) {
        deletedBooking =
          await Booking.findOneAndDelete(
            {
              id: bookingId
            }
          ).lean();
      } else {
        const index =
          bookings.findIndex(
            (booking) =>
              Number(
                booking.id
              ) === bookingId
          );

        if (index !== -1) {
          deletedBooking =
            bookings[index];

          bookings.splice(
            index,
            1
          );
        }
      }

      if (!deletedBooking) {
        return res.status(404).json({
          message:
            'Booking not found.'
        });
      }

      /*
       * Release the rooms belonging to
       * this booking.
       */
      const roomIds =
        getBookingRoomIds(
          deletedBooking
        );

      for (
        const roomId
        of roomIds
      ) {
        const room =
          await getRoomRecords();

        const target =
          room.find(
            (item) =>
              Number(item.id) ===
              Number(roomId)
          );

        /*
         * Only automatically release a
         * room that is still reserved.
         */
        if (
          target &&
          target.status ===
            'reserved'
        ) {
          await updateRoomRecord(
            roomId,
            {
              status:
                'available',

              guestName:
                'No guest',

              lastUpdated:
                'Just now'
            }
          );
        }
      }

      emitBookingsChanged(
        'delete',
        {
          id: bookingId
        }
      );

      emitRoomsChanged(
        'update',
        {
          roomIds
        }
      );

      res.json({
        success: true,

        message:
          'Booking deleted and assigned rooms released.'
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      message:
        'Endpoint not found'
    });
  }
);

/*
|--------------------------------------------------------------------------
| Server startup
|--------------------------------------------------------------------------
*/

async function startServer() {
  await connectToMongo();

  /*
   * Start HTTP + Socket.IO server.
   */
  httpServer.listen(
    PORT,
    async () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );

      console.log(
        `Frontend allowed origin: ${FRONTEND_ORIGIN}`
      );

      if (databaseAvailable) {
        await startMongoChangeStreams();
      }
    }
  );
}

/*
|--------------------------------------------------------------------------
| Graceful shutdown
|--------------------------------------------------------------------------
*/

async function shutdown() {
  console.log(
    'Shutting down server...'
  );

  try {
    if (roomChangeStream) {
      await roomChangeStream.close();
    }

    if (bookingChangeStream) {
      await bookingChangeStream.close();
    }

    io.close();

    httpServer.close();

    if (
      mongoose.connection.readyState
    ) {
      await mongoose.connection.close();
    }
  } catch (error) {
    console.error(
      'Shutdown error:',
      error.message
    );
  }

  process.exit(0);
}

process.on(
  'SIGINT',
  shutdown
);

process.on(
  'SIGTERM',
  shutdown
);

startServer().catch(
  (error) => {
    console.error(
      'Failed to start server:',
      error
    );

    process.exit(1);
  }
);