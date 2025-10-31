import { Router } from 'express';
import authRoutes from './auth';
import eventRoutes from './events';
import marketplaceRoutes from './marketplace';
import swapRequestRoutes from './swapRequests';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Event routes
router.use('/events', eventRoutes);

// Marketplace routes
router.use('/swappable-slots', marketplaceRoutes);

// Swap request routes - consolidate all swap-related routes under one path
router.use('/swap', swapRequestRoutes);

export default router;