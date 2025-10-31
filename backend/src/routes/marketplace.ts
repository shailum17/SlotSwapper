import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getSwappableSlots } from '../controllers/eventController';

const router = Router();

// All marketplace routes require authentication
router.use(authenticateToken);

// GET /api/swappable-slots - Get all swappable slots from other users
router.get('/', getSwappableSlots);

export default router;