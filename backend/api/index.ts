import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const app = express();

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

// Database connection
let cachedConnection: typeof mongoose | null = null;

const connectToDatabase = async () => {
  // Check if we have a cached connection and it's still connected
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
    
    // Disconnect any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const connection = await mongoose.connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 1, // Reduced for serverless
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
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

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Event Schema
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

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

// SwapRequest Schema
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

const SwapRequest = mongoose.models.SwapRequest || mongoose.model('SwapRequest', swapRequestSchema);

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  console.log('Auth middleware - Headers:', req.headers.authorization ? 'Token present' : 'No token');
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, decoded: any) => {
    if (err) {
      console.log('Auth middleware - Token verification failed:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid token', error: err.message });
    }
    console.log('Auth middleware - Token verified, userId:', decoded.userId);
    req.user = { userId: decoded.userId };
    next();
  });
};

// Root endpoint
app.get('/', (_req: any, res: any) => {
  res.json({
    success: true,
    message: 'SlotSwapper API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login'
      },
      events: {
        list: 'GET /api/events',
        create: 'POST /api/events',
        update: 'PUT /api/events/:id',
        delete: 'DELETE /api/events/:id'
      },
      marketplace: 'GET /api/swappable-slots',
      swaps: {
        list: 'GET /api/swap/requests (or /api/swap/request)',
        create: 'POST /api/swap/requests (or /api/swap/request)',
        respond: 'PUT /api/swap/requests/:id (or /api/swap/request/:id)'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health endpoints
app.get('/health', (_req: any, res: any) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing'
  });
});

app.get('/api', (_req: any, res: any) => {
  res.json({
    success: true,
    message: 'SlotSwapper API v1.0.0',
    documentation: 'Visit / for endpoint documentation',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (_req: any, res: any) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to list all routes
app.get('/api/routes', (_req: any, res: any) => {
  const routes = [
    'GET /health',
    'GET /api/health',
    'GET /api/routes',
    'POST /api/auth/signup',
    'POST /api/auth/login',
    'GET /api/events',
    'POST /api/events',
    'PUT /api/events/:id',
    'DELETE /api/events/:id',
    'GET /api/swappable-slots',
    'GET /api/swap/requests',
    'POST /api/swap/requests',
    'PUT /api/swap/requests/:id',
    'GET /api/swap/request',
    'POST /api/swap/request',
    'PUT /api/swap/request/:id',
    '--- Routes without /api prefix ---',
    'POST /auth/signup',
    'POST /auth/login',
    'GET /events',
    'POST /events',
    'PUT /events/:id',
    'DELETE /events/:id',
    'GET /swappable-slots',
    'GET /swap/requests',
    'POST /swap/requests',
    'PUT /swap/requests/:id',
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

// Test endpoint for debugging (no auth required)
app.post('/api/test-post', (req: any, res: any) => {
  console.log('Test POST endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  res.json({
    success: true,
    message: 'Test POST endpoint working',
    receivedHeaders: req.headers,
    receivedBody: req.body,
    timestamp: new Date().toISOString()
  });
});

app.post('/test-post', (req: any, res: any) => {
  console.log('Test POST endpoint (no /api) hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  res.json({
    success: true,
    message: 'Test POST endpoint (no /api) working',
    receivedHeaders: req.headers,
    receivedBody: req.body,
    timestamp: new Date().toISOString()
  });
});

// Auth routes (with /api prefix)
app.post('/api/auth/signup', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({ name, email, passwordHash });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret',
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

app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret',
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

// Auth routes (without /api prefix - for frontend compatibility)
app.post('/auth/signup', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({ name, email, passwordHash });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret',
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
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret',
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

// Events routes
app.get('/api/events', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    const events = await Event.find({ userId: req.user?.userId });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/events', authenticateToken, [
  body('title').notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { title, startTime, endTime } = req.body;
    
    const event = new Event({
      userId: req.user?.userId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });

    await event.save();
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Swappable slots
app.get('/api/swappable-slots', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    const slots = await Event.find({ 
      status: 'SWAPPABLE',
      userId: { $ne: req.user?.userId }
    }).populate('userId', 'name email');
    
    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update event status
app.put('/api/events/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const { id } = req.params;
    const { status } = req.body;
    
    const event = await Event.findOneAndUpdate(
      { _id: id, userId: req.user?.userId },
      { status },
      { new: true }
    );
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete event
app.delete('/api/events/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const { id } = req.params;
    
    const event = await Event.findOneAndDelete({ _id: id, userId: req.user?.userId });
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Swap requests
app.get('/api/swap/requests', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;
    
    // Get incoming requests (where user is the target)
    const incoming = await SwapRequest.find({ 
      targetUserId: userId,
      status: 'PENDING'
    })
    .populate('requesterId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    // Get outgoing requests (where user is the requester)
    const outgoing = await SwapRequest.find({ 
      requesterId: userId,
      status: 'PENDING'
    })
    .populate('targetUserId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    res.json({ 
      success: true, 
      data: { incoming, outgoing }
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create swap request
app.post('/api/swap/requests', authenticateToken, [
  body('targetEventId').notEmpty().withMessage('Target event ID is required'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required'),
  body('message').optional().isString()
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { targetEventId, requesterEventId, message = '' } = req.body;
    const requesterId = req.user?.userId;

    // Verify the requester event belongs to the user
    const requesterEvent = await Event.findOne({ 
      _id: requesterEventId, 
      userId: requesterId 
    });
    
    if (!requesterEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Requester event not found or not owned by user' 
      });
    }

    // Verify the target event exists and is swappable
    const targetEvent = await Event.findOne({ 
      _id: targetEventId, 
      status: 'SWAPPABLE' 
    });
    
    if (!targetEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Target event not found or not swappable' 
      });
    }

    // Check if a request already exists
    const existingRequest = await SwapRequest.findOne({
      requesterId,
      targetEventId,
      requesterEventId,
      status: 'PENDING'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Swap request already exists' 
      });
    }

    // Create the swap request
    const swapRequest = new SwapRequest({
      requesterId,
      targetUserId: targetEvent.userId,
      requesterEventId,
      targetEventId,
      message
    });

    await swapRequest.save();

    // Populate the response
    await swapRequest.populate([
      { path: 'requesterId', select: 'name email' },
      { path: 'targetUserId', select: 'name email' },
      { path: 'requesterEventId', select: 'title startTime endTime' },
      { path: 'targetEventId', select: 'title startTime endTime' }
    ]);

    res.status(201).json({ 
      success: true, 
      data: swapRequest 
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Accept or reject swap request
app.put('/api/swap/requests/:id', authenticateToken, [
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user?.userId;

    // Find the swap request
    const swapRequest = await SwapRequest.findOne({
      _id: id,
      targetUserId: userId,
      status: 'PENDING'
    });

    if (!swapRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Swap request not found or not authorized' 
      });
    }

    if (action === 'accept') {
      // Update swap request status
      swapRequest.status = 'ACCEPTED';
      await swapRequest.save();

      // Update both events to SWAP_PENDING
      await Event.findByIdAndUpdate(swapRequest.requesterEventId, { status: 'SWAP_PENDING' });
      await Event.findByIdAndUpdate(swapRequest.targetEventId, { status: 'SWAP_PENDING' });

      res.json({ 
        success: true, 
        message: 'Swap request accepted',
        data: swapRequest 
      });
    } else {
      // Reject the request
      swapRequest.status = 'REJECTED';
      await swapRequest.save();

      res.json({ 
        success: true, 
        message: 'Swap request rejected',
        data: swapRequest 
      });
    }
  } catch (error) {
    console.error('Update swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// SINGULAR API ROUTES (with /api prefix)
// These match what your frontend might be calling: /api/swap/request (singular)

app.get('/api/swap/request', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;
    
    // Get incoming requests (where user is the target)
    const incoming = await SwapRequest.find({ 
      targetUserId: userId,
      status: 'PENDING'
    })
    .populate('requesterId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    // Get outgoing requests (where user is the requester)
    const outgoing = await SwapRequest.find({ 
      requesterId: userId,
      status: 'PENDING'
    })
    .populate('targetUserId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    res.json({ 
      success: true, 
      data: { incoming, outgoing }
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/swap/request', authenticateToken, [
  body('targetEventId').notEmpty().withMessage('Target event ID is required'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required'),
  body('message').optional().isString()
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { targetEventId, requesterEventId, message = '' } = req.body;
    const requesterId = req.user?.userId;

    // Verify the requester event belongs to the user
    const requesterEvent = await Event.findOne({ 
      _id: requesterEventId, 
      userId: requesterId 
    });
    
    if (!requesterEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Requester event not found or not owned by user' 
      });
    }

    // Verify the target event exists and is swappable
    const targetEvent = await Event.findOne({ 
      _id: targetEventId, 
      status: 'SWAPPABLE' 
    });
    
    if (!targetEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Target event not found or not swappable' 
      });
    }

    // Check if a request already exists
    const existingRequest = await SwapRequest.findOne({
      requesterId,
      targetEventId,
      requesterEventId,
      status: 'PENDING'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Swap request already exists' 
      });
    }

    // Create the swap request
    const swapRequest = new SwapRequest({
      requesterId,
      targetUserId: targetEvent.userId,
      requesterEventId,
      targetEventId,
      message
    });

    await swapRequest.save();

    // Populate the response
    await swapRequest.populate([
      { path: 'requesterId', select: 'name email' },
      { path: 'targetUserId', select: 'name email' },
      { path: 'requesterEventId', select: 'title startTime endTime' },
      { path: 'targetEventId', select: 'title startTime endTime' }
    ]);

    res.status(201).json({ 
      success: true, 
      data: swapRequest 
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put('/api/swap/request/:id', authenticateToken, [
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user?.userId;

    // Find the swap request
    const swapRequest = await SwapRequest.findOne({
      _id: id,
      targetUserId: userId,
      status: 'PENDING'
    });

    if (!swapRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Swap request not found or not authorized' 
      });
    }

    if (action === 'accept') {
      // Update swap request status
      swapRequest.status = 'ACCEPTED';
      await swapRequest.save();

      // Update both events to SWAP_PENDING
      await Event.findByIdAndUpdate(swapRequest.requesterEventId, { status: 'SWAP_PENDING' });
      await Event.findByIdAndUpdate(swapRequest.targetEventId, { status: 'SWAP_PENDING' });

      res.json({ 
        success: true, 
        message: 'Swap request accepted',
        data: swapRequest 
      });
    } else {
      // Reject the request
      swapRequest.status = 'REJECTED';
      await swapRequest.save();

      res.json({ 
        success: true, 
        message: 'Swap request rejected',
        data: swapRequest 
      });
    }
  } catch (error) {
    console.error('Update swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Routes without /api prefix (for frontend compatibility)
app.get('/events', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    const events = await Event.find({ userId: req.user?.userId });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/events', authenticateToken, [
  body('title').notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { title, startTime, endTime } = req.body;
    
    const event = new Event({
      userId: req.user?.userId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });

    await event.save();
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put('/events/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const { id } = req.params;
    const { status } = req.body;
    
    const event = await Event.findOneAndUpdate(
      { _id: id, userId: req.user?.userId },
      { status },
      { new: true }
    );
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.delete('/events/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const { id } = req.params;
    
    const event = await Event.findOneAndDelete({ _id: id, userId: req.user?.userId });
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/swappable-slots', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    const slots = await Event.find({ 
      status: 'SWAPPABLE',
      userId: { $ne: req.user?.userId }
    }).populate('userId', 'name email');
    
    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/swap/requests', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;
    
    // Get incoming requests (where user is the target)
    const incoming = await SwapRequest.find({ 
      targetUserId: userId,
      status: 'PENDING'
    })
    .populate('requesterId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    // Get outgoing requests (where user is the requester)
    const outgoing = await SwapRequest.find({ 
      requesterId: userId,
      status: 'PENDING'
    })
    .populate('targetUserId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    res.json({ 
      success: true, 
      data: { incoming, outgoing }
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create swap request (without /api prefix)
app.post('/swap/requests', authenticateToken, [
  body('targetEventId').notEmpty().withMessage('Target event ID is required'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required'),
  body('message').optional().isString()
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { targetEventId, requesterEventId, message = '' } = req.body;
    const requesterId = req.user?.userId;

    // Verify the requester event belongs to the user
    const requesterEvent = await Event.findOne({ 
      _id: requesterEventId, 
      userId: requesterId 
    });
    
    if (!requesterEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Requester event not found or not owned by user' 
      });
    }

    // Verify the target event exists and is swappable
    const targetEvent = await Event.findOne({ 
      _id: targetEventId, 
      status: 'SWAPPABLE' 
    });
    
    if (!targetEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Target event not found or not swappable' 
      });
    }

    // Check if a request already exists
    const existingRequest = await SwapRequest.findOne({
      requesterId,
      targetEventId,
      requesterEventId,
      status: 'PENDING'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Swap request already exists' 
      });
    }

    // Create the swap request
    const swapRequest = new SwapRequest({
      requesterId,
      targetUserId: targetEvent.userId,
      requesterEventId,
      targetEventId,
      message
    });

    await swapRequest.save();

    // Populate the response
    await swapRequest.populate([
      { path: 'requesterId', select: 'name email' },
      { path: 'targetUserId', select: 'name email' },
      { path: 'requesterEventId', select: 'title startTime endTime' },
      { path: 'targetEventId', select: 'title startTime endTime' }
    ]);

    res.status(201).json({ 
      success: true, 
      data: swapRequest 
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Accept or reject swap request (without /api prefix)
app.put('/swap/requests/:id', authenticateToken, [
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user?.userId;

    // Find the swap request
    const swapRequest = await SwapRequest.findOne({
      _id: id,
      targetUserId: userId,
      status: 'PENDING'
    });

    if (!swapRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Swap request not found or not authorized' 
      });
    }

    if (action === 'accept') {
      // Update swap request status
      swapRequest.status = 'ACCEPTED';
      await swapRequest.save();

      // Update both events to SWAP_PENDING
      await Event.findByIdAndUpdate(swapRequest.requesterEventId, { status: 'SWAP_PENDING' });
      await Event.findByIdAndUpdate(swapRequest.targetEventId, { status: 'SWAP_PENDING' });

      res.json({ 
        success: true, 
        message: 'Swap request accepted',
        data: swapRequest 
      });
    } else {
      // Reject the request
      swapRequest.status = 'REJECTED';
      await swapRequest.save();

      res.json({ 
        success: true, 
        message: 'Swap request rejected',
        data: swapRequest 
      });
    }
  } catch (error) {
    console.error('Update swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// SINGULAR ROUTES (for frontend compatibility)
// These match what your frontend is calling: /swap/request (singular)

app.get('/swap/request', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;
    
    // Get incoming requests (where user is the target)
    const incoming = await SwapRequest.find({ 
      targetUserId: userId,
      status: 'PENDING'
    })
    .populate('requesterId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    // Get outgoing requests (where user is the requester)
    const outgoing = await SwapRequest.find({ 
      requesterId: userId,
      status: 'PENDING'
    })
    .populate('targetUserId', 'name email')
    .populate('requesterEventId', 'title startTime endTime')
    .populate('targetEventId', 'title startTime endTime');
    
    res.json({ 
      success: true, 
      data: { incoming, outgoing }
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/swap/request', authenticateToken, [
  body('targetEventId').notEmpty().withMessage('Target event ID is required'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required'),
  body('message').optional().isString()
], async (req: any, res: any) => {
  try {
    console.log('POST /swap/request - Request body:', req.body);
    console.log('POST /swap/request - User:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');

    const { targetEventId, requesterEventId, message = '' } = req.body;
    const requesterId = req.user?.userId;

    console.log('Looking for requester event:', { requesterEventId, requesterId });
    
    // Verify the requester event belongs to the user
    const requesterEvent = await Event.findOne({ 
      _id: requesterEventId, 
      userId: requesterId 
    });
    
    if (!requesterEvent) {
      console.log('Requester event not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Requester event not found or not owned by user' 
      });
    }

    console.log('Found requester event:', requesterEvent);
    console.log('Looking for target event:', { targetEventId });

    // Verify the target event exists and is swappable
    const targetEvent = await Event.findOne({ 
      _id: targetEventId, 
      status: 'SWAPPABLE' 
    });
    
    if (!targetEvent) {
      console.log('Target event not found or not swappable');
      return res.status(404).json({ 
        success: false, 
        message: 'Target event not found or not swappable' 
      });
    }

    console.log('Found target event:', targetEvent);

    // Check if a request already exists
    const existingRequest = await SwapRequest.findOne({
      requesterId,
      targetEventId,
      requesterEventId,
      status: 'PENDING'
    });

    if (existingRequest) {
      console.log('Swap request already exists');
      return res.status(400).json({ 
        success: false, 
        message: 'Swap request already exists' 
      });
    }

    console.log('Creating new swap request...');

    // Create the swap request
    const swapRequest = new SwapRequest({
      requesterId,
      targetUserId: targetEvent.userId,
      requesterEventId,
      targetEventId,
      message
    });

    await swapRequest.save();
    console.log('Swap request saved successfully');

    // Populate the response
    await swapRequest.populate([
      { path: 'requesterId', select: 'name email' },
      { path: 'targetUserId', select: 'name email' },
      { path: 'requesterEventId', select: 'title startTime endTime' },
      { path: 'targetEventId', select: 'title startTime endTime' }
    ]);

    console.log('Swap request populated and ready to return');

    res.status(201).json({ 
      success: true, 
      data: swapRequest 
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/swap/request/:id', authenticateToken, [
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connectToDatabase();

    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user?.userId;

    // Find the swap request
    const swapRequest = await SwapRequest.findOne({
      _id: id,
      targetUserId: userId,
      status: 'PENDING'
    });

    if (!swapRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Swap request not found or not authorized' 
      });
    }

    if (action === 'accept') {
      // Update swap request status
      swapRequest.status = 'ACCEPTED';
      await swapRequest.save();

      // Update both events to SWAP_PENDING
      await Event.findByIdAndUpdate(swapRequest.requesterEventId, { status: 'SWAP_PENDING' });
      await Event.findByIdAndUpdate(swapRequest.targetEventId, { status: 'SWAP_PENDING' });

      res.json({ 
        success: true, 
        message: 'Swap request accepted',
        data: swapRequest 
      });
    } else {
      // Reject the request
      swapRequest.status = 'REJECTED';
      await swapRequest.save();

      res.json({ 
        success: true, 
        message: 'Swap request rejected',
        data: swapRequest 
      });
    }
  } catch (error) {
    console.error('Update swap request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Error handling
app.use((error: any, _req: any, res: any, _next: any) => {
  console.error('Express error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Serverless handler
export default async (req: any, res: any) => {
  try {
    console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    
    // Dynamic CORS headers
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://slot-swapper-eight.vercel.app',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Fallback for development
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    return app(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Serverless function error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};