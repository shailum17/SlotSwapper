import { Router } from 'express';
import { signup, login } from '../controllers/authController';
import { validateSignup, validateLogin } from '../middleware/validation';

const router = Router();

// POST /api/auth/signup - User registration
router.post('/signup', validateSignup, signup);

// POST /api/auth/login - User login
router.post('/login', validateLogin, login);

export default router;