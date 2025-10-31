import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getSwappableSlots
} from '../controllers/eventController';

const router = Router();

// All event routes require authentication
router.use(authenticateToken);

// GET /api/events - Get all events for the authenticated user
router.get('/', getEvents);

// POST /api/events - Create a new event
router.post('/', createEvent);

// PUT /api/events/:id - Update an existing event
router.put('/:id', updateEvent);

// DELETE /api/events/:id - Delete an event
router.delete('/:id', deleteEvent);

export default router;