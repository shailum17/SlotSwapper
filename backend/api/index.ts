import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const app = express();

// Security headers
app.use((req: any, res: any, next: any) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logging middleware
app.use((req: any, res: any, next: any) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Rate limiting simulation (basic)
const requestCounts = new Map();
app.use((req: any, res: any, next: any) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const record = requestCounts.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }

  record.count++;
  next();
});

// CORS configuration
app.use(cors({
  origin: [
    'https://slot-swapper-eight.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database connection with caching for serverless
let cachedConnection: typeof mongoose | null = null;

const connectToDatabase = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI environment variable is not set');
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('Connecting to MongoDB...');
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const connection = await mongoose.connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log('MongoDB connected successfully');
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    cachedConnection = null;
    throw error;
  }
};
// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['BUSY', 'SWAPPABLE', 'SWAP_PENDING'], 
    default: 'BUSY' 
  },
}, { timestamps: true });

const swapRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  targetEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'], 
    default: 'PENDING' 
  },
  message: { type: String, default: '' },
}, { timestamps: true });

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
const SwapRequest = mongoose.models.SwapRequest || mongoose.model('SwapRequest', swapRequestSchema);

// Input sanitization helper
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

// Validation helper
const handleValidationErrors = (req: any, res: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  return null;
};

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  console.log('Auth middleware - Headers:', req.headers.authorization ? 'Token present' : 'No token');
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
    if (err) {
      console.log('Auth middleware - Token verification failed:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    console.log('Auth middleware - Token verified, userId:', decoded.userId);
    req.user = { userId: decoded.userId };
    next();
  });
};

// ============================================================================
// HEALTH & INFO ENDPOINTS
// ============================================================================

app.get('/', (_req: any, res: any) => {
  res.json({
    success: true,
    message: 'SlotSwapper API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        signup: 'POST /auth/signup',
        login: 'POST /auth/login'
      },
      events: {
        list: 'GET /events',
        create: 'POST /events',
        update: 'PUT /events/:id',
        delete: 'DELETE /events/:id'
      },
      marketplace: 'GET /swappable-slots',
      swaps: {
        list: 'GET /swap/request',
        create: 'POST /swap/request',
        respond: 'PUT /swap/request/:id'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Environment validation
const validateEnvironment = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
};

app.get('/health', async (_req: any, res: any) => {
  const envValid = validateEnvironment();
  let dbStatus = 'unknown';
  
  try {
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'connected';
    } else {
      await connectToDatabase();
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'disconnected';
  }

  const isHealthy = envValid && dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'OK' : 'UNHEALTHY',
    message: 'SlotSwapper API health check',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    config: {
      mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing',
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing'
    }
  });
});

app.get('/api/health', (_req: any, res: any) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/routes', (_req: any, res: any) => {
  const routes = [
    'GET /health',
    'GET /api/health',
    'POST /auth/signup',
    'POST /auth/login',
    'GET /events',
    'POST /events',
    'PUT /events/:id',
    'DELETE /events/:id',
    'GET /swappable-slots',
    'GET /swap/request',
    'POST /swap/request',
    'PUT /swap/request/:id'
  ];
  
  res.json({
    success: true,
    message: 'Available API routes',
    routes,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/auth/signup', [
  body('name').notEmpty().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number')
], async (req: any, res: any) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    await connectToDatabase();

    const { name, email, password } = req.body;

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({ 
      name: sanitizedName, 
      email: sanitizedEmail, 
      passwordHash 
    });
    await user.save();

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { userId: user._id }, 
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email },
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/auth/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: any, res: any) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    await connectToDatabase();

    const { email, password } = req.body;
    const sanitizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { userId: user._id }, 
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ============================================================================
// EVENT ENDPOINTS
// ============================================================================

app.get('/events', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const events = await Event.find({ userId: req.user.userId })
      .sort({ startTime: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/events', [
  authenticateToken,
  body('title').notEmpty().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('status').optional().isIn(['BUSY', 'SWAPPABLE']).withMessage('Invalid status')
], async (req: any, res: any) => {
  try {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    await connectToDatabase();

    const { title, startTime, endTime, status = 'BUSY' } = req.body;

    // Sanitize title
    const sanitizedTitle = sanitizeInput(title);

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      return res.status(400).json({ 
        success: false, 
        message: 'End time must be after start time' 
      });
    }

    // Check for overlapping events
    const overlapping = await Event.findOne({
      userId: req.user.userId,
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event overlaps with existing event' 
      });
    }

    const event = new Event({
      userId: req.user.userId,
      title: sanitizedTitle,
      startTime: start,
      endTime: end,
      status
    });

    await event.save();

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put('/events/:id', [
  authenticateToken,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time is required'),
  body('status').optional().isIn(['BUSY', 'SWAPPABLE', 'SWAP_PENDING']).withMessage('Invalid status')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { id } = req.params;
    const updates = req.body;

    // Validate time range if both times are provided
    if (updates.startTime && updates.endTime) {
      const start = new Date(updates.startTime);
      const end = new Date(updates.endTime);
      
      if (start >= end) {
        return res.status(400).json({ 
          success: false, 
          message: 'End time must be after start time' 
        });
      }
    }

    const event = await Event.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.delete('/events/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();

    const { id } = req.params;

    const event = await Event.findOneAndDelete({ _id: id, userId: req.user.userId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Clean up any related swap requests
    await SwapRequest.deleteMany({
      $or: [
        { requesterEventId: id },
        { targetEventId: id }
      ]
    });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ============================================================================
// MARKETPLACE ENDPOINTS
// ============================================================================

app.get('/swappable-slots', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();

    const swappableEvents = await Event.find({
      userId: { $ne: req.user.userId },
      status: 'SWAPPABLE'
    })
    .populate('userId', 'name email')
    .sort({ startTime: 1 });

    res.json({
      success: true,
      data: swappableEvents
    });
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ============================================================================
// SWAP REQUEST ENDPOINTS
// ============================================================================

app.get('/swap/request', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();

    const swapRequests = await SwapRequest.find({
      $or: [
        { requesterId: req.user.userId },
        { targetUserId: req.user.userId }
      ]
    })
    .populate('requesterId', 'name email')
    .populate('targetUserId', 'name email')
    .populate('requesterEventId')
    .populate('targetEventId')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: swapRequests
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/swap/request', [
  authenticateToken,
  body('targetUserId').notEmpty().withMessage('Target user ID is required'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required'),
  body('targetEventId').notEmpty().withMessage('Target event ID is required'),
  body('message').optional().isString().withMessage('Message must be a string')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { targetUserId, requesterEventId, targetEventId, message = '' } = req.body;

    // Validate that requester owns the requester event
    const requesterEvent = await Event.findOne({
      _id: requesterEventId,
      userId: req.user.userId,
      status: 'SWAPPABLE'
    });

    if (!requesterEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid requester event or event not swappable' 
      });
    }

    // Validate that target event exists and is swappable
    const targetEvent = await Event.findOne({
      _id: targetEventId,
      userId: targetUserId,
      status: 'SWAPPABLE'
    });

    if (!targetEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target event not found or not swappable' 
      });
    }

    // Check for existing pending request
    const existingRequest = await SwapRequest.findOne({
      requesterId: req.user.userId,
      targetUserId,
      requesterEventId,
      targetEventId,
      status: 'PENDING'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Swap request already exists' 
      });
    }

    const swapRequest = new SwapRequest({
      requesterId: req.user.userId,
      targetUserId,
      requesterEventId,
      targetEventId,
      message,
      status: 'PENDING'
    });

    await swapRequest.save();

    // Update event statuses
    await Event.findByIdAndUpdate(requesterEventId, { status: 'SWAP_PENDING' });
    await Event.findByIdAndUpdate(targetEventId, { status: 'SWAP_PENDING' });

    const populatedRequest = await SwapRequest.findById(swapRequest._id)
      .populate('requesterId', 'name email')
      .populate('targetUserId', 'name email')
      .populate('requesterEventId')
      .populate('targetEventId');

    res.status(201).json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put('/swap/request/:id', [
  authenticateToken,
  body('status').isIn(['ACCEPTED', 'REJECTED']).withMessage('Status must be ACCEPTED or REJECTED')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { id } = req.params;
    const { status } = req.body;

    const swapRequest = await SwapRequest.findOne({
      _id: id,
      targetUserId: req.user.userId,
      status: 'PENDING'
    });

    if (!swapRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Swap request not found or not authorized' 
      });
    }

    swapRequest.status = status;
    await swapRequest.save();

    if (status === 'ACCEPTED') {
      // Swap the events between users
      const requesterEvent = await Event.findById(swapRequest.requesterEventId);
      const targetEvent = await Event.findById(swapRequest.targetEventId);

      if (requesterEvent && targetEvent) {
        // Swap user IDs
        const tempUserId = requesterEvent.userId;
        requesterEvent.userId = targetEvent.userId;
        targetEvent.userId = tempUserId;

        // Reset status to BUSY
        requesterEvent.status = 'BUSY';
        targetEvent.status = 'BUSY';

        await requesterEvent.save();
        await targetEvent.save();
      }
    } else {
      // Reset event statuses to SWAPPABLE
      await Event.findByIdAndUpdate(swapRequest.requesterEventId, { status: 'SWAPPABLE' });
      await Event.findByIdAndUpdate(swapRequest.targetEventId, { status: 'SWAPPABLE' });
    }

    const populatedRequest = await SwapRequest.findById(swapRequest._id)
      .populate('requesterId', 'name email')
      .populate('targetUserId', 'name email')
      .populate('requesterEventId')
      .populate('targetEventId');

    res.json({
      success: true,
      data: populatedRequest
    });
  } catch (error) {
    console.error('Update swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ============================================================================
// ERROR HANDLING & SERVER SETUP
// ============================================================================

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Export for Vercel
export default app;