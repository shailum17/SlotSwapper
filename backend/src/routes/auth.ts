import { Router } from 'express';
import { signup, login, verifyToken } from '../controllers/authController';
import { validateSignup, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/signup - User registration
router.post('/signup', validateSignup, signup);

// POST /api/auth/login - User login
router.post('/login', validateLogin, login);

// GET /api/auth/verify - Token verification
router.get('/verify', authenticateToken, verifyToken);

export default router;