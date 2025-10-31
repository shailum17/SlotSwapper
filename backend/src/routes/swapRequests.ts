import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createSwapRequest, respondToSwapRequest, getSwapRequests } from '../controllers/swapController';

const router = Router();

// All swap request routes require authentication
router.use(authenticateToken);

// POST /api/swap/request - Create a new swap request
router.post('/request', createSwapRequest);

// GET /api/swap/requests - Get user's incoming and outgoing swap requests
router.get('/requests', getSwapRequests);

// POST /api/swap/response/:id - Accept or reject a swap request  
router.post('/response/:id', respondToSwapRequest);

export default router;