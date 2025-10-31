import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import routes from '../routes';
import { User } from '../models/User';
import { Event, EventStatus } from '../models/Event';
import jwt from 'jsonwebtoken';

describe('GET /api/swappable-slots', () => {
  let app: express.Application;
  let user1Id: string;
  let user2Id: string;
  let user1Token: string;
  let user2Token: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api', routes);

    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/slot-swapper-test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await Event.deleteMany({});

    // Create test users
    const user1 = new User({
      name: 'User One',
      email: 'user1@test.com',
      passwordHash: 'hashedpassword1'
    });
    const user2 = new User({
      name: 'User Two',
      email: 'user2@test.com',
      passwordHash: 'hashedpassword2'
    });

    await user1.save();
    await user2.save();

    user1Id = user1._id.toString();
    user2Id = user2._id.toString();

    // Create JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    user1Token = jwt.sign({ userId: user1Id }, jwtSecret);
    user2Token = jwt.sign({ userId: user2Id }, jwtSecret);

    // Create test events
    const events = [
      // User 1's events
      new Event({
        userId: user1Id,
        title: 'User 1 Busy Event',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
        status: EventStatus.BUSY
      }),
      new Event({
        userId: user1Id,
        title: 'User 1 Swappable Event',
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T15:00:00Z'),
        status: EventStatus.SWAPPABLE
      }),
      // User 2's events
      new Event({
        userId: user2Id,
        title: 'User 2 Swappable Event 1',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        status: EventStatus.SWAPPABLE
      }),
      new Event({
        userId: user2Id,
        title: 'User 2 Swappable Event 2',
        startTime: new Date('2024-01-01T16:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        status: EventStatus.SWAPPABLE
      }),
      new Event({
        userId: user2Id,
        title: 'User 2 Swap Pending Event',
        startTime: new Date('2024-01-01T12:00:00Z'),
        endTime: new Date('2024-01-01T13:00:00Z'),
        status: EventStatus.SWAP_PENDING
      })
    ];

    await Event.insertMany(events);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should return swappable slots from other users only', async () => {
    const response = await request(app)
      .get('/api/swappable-slots')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2); // Only User 2's swappable events

    // Verify all returned events are swappable and from other users
    response.body.data.forEach((slot: any) => {
      expect(slot.status).toBe(EventStatus.SWAPPABLE);
      expect(slot.userId._id).toBe(user2Id);
      expect(slot.userId.name).toBe('User Two');
      expect(slot.userId.email).toBe('user2@test.com');
    });

    // Verify events are sorted by start time
    const startTimes = response.body.data.map((slot: any) => new Date(slot.startTime));
    for (let i = 1; i < startTimes.length; i++) {
      expect(startTimes[i].getTime()).toBeGreaterThanOrEqual(startTimes[i - 1].getTime());
    }
  });

  it('should exclude current user\'s swappable slots', async () => {
    const response = await request(app)
      .get('/api/swappable-slots')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    // Should not include User 1's swappable event
    const user1Events = response.body.data.filter((slot: any) => slot.userId._id === user1Id);
    expect(user1Events).toHaveLength(0);
  });

  it('should exclude non-swappable events', async () => {
    const response = await request(app)
      .get('/api/swappable-slots')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    // Should not include BUSY or SWAP_PENDING events
    response.body.data.forEach((slot: any) => {
      expect(slot.status).toBe(EventStatus.SWAPPABLE);
    });
  });

  it('should require authentication', async () => {
    await request(app)
      .get('/api/swappable-slots')
      .expect(401);
  });

  it('should include owner information', async () => {
    const response = await request(app)
      .get('/api/swappable-slots')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    response.body.data.forEach((slot: any) => {
      expect(slot.userId).toHaveProperty('_id');
      expect(slot.userId).toHaveProperty('name');
      expect(slot.userId).toHaveProperty('email');
      expect(slot.userId).not.toHaveProperty('passwordHash'); // Should be excluded
    });
  });
});