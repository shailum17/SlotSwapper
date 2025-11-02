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

// ULTRA-SIMPLE SWAP REQUEST (bypasses all complex logic)
app.post('/api/simple-swap', authenticateToken, async (req: any, res: any) => {
  try {
    console.log('🔥 SIMPLE SWAP REQUEST ATTEMPT');
    
    const { targetEventId, requesterEventId } = req.body;
    const userId = req.user?.userId;
    
    // Minimal validation
    if (!targetEventId || !requesterEventId || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Connect to DB
    await connectToDatabase();
    
    // Create swap request with minimal data
    const swapRequest = {
      requesterId: userId,
      targetUserId: 'temp-target-user', // We'll fix this later
      requesterEventId,
      targetEventId,
      message: 'Simple swap request',
      status: 'PENDING',
      createdAt: new Date()
    };
    
    // Try to save directly
    const result = await SwapRequest.create(swapRequest);
    
    console.log('✅ Simple swap request created:', result._id);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Simple swap request created successfully'
    });
    
  } catch (error) {
    console.error('❌ Simple swap request failed:', error);
    res.status(500).json({
      success: false,
      message: 'Simple swap request failed',
      error: error.message
    });
  }
});

// MINIMAL SWAP REQUEST (even simpler)
app.post('/api/minimal-swap', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const swapRequest = new SwapRequest({
      requesterId: req.user.userId,
      targetUserId: req.user.userId, // Same user for testing
      requesterEventId: req.body.requesterEventId || '507f1f77bcf86cd799439011',
      targetEventId: req.body.targetEventId || '507f1f77bcf86cd799439012',
      message: 'Minimal test swap',
      status: 'PENDING'
    });
    
    await swapRequest.save();
    
    res.json({
      success: true,
      data: swapRequest,
      message: 'Minimal swap created'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check events (requires auth)
app.get('/api/debug/events', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;
    
    // Get user's events
    const userEvents = await Event.find({ userId }).select('_id title status startTime endTime');
    
    // Get all swappable events (from other users)
    const swappableEvents = await Event.find({ 
      status: 'SWAPPABLE',
      userId: { $ne: userId }
    }).populate('userId', 'name email').select('_id title status startTime endTime userId');
    
    // Get existing swap requests
    const swapRequests = await SwapRequest.find({
      $or: [
        { requesterId: userId },
        { targetUserId: userId }
      ]
    }).select('_id requesterId targetUserId requesterEventId targetEventId status');
    
    res.json({
      success: true,
      data: {
        userEvents,
        swappableEvents,
        swapRequests,
        userId
      }
    });
  } catch (error) {
    console.error('Debug events error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Debug endpoint to validate ObjectIds
app.post('/api/debug/validate-ids', (req: any, res: any) => {
  const { targetEventId, requesterEventId, userId } = req.body;
  
  const validation = {
    targetEventId: {
      value: targetEventId,
      isValid: mongoose.Types.ObjectId.isValid(targetEventId),
      type: typeof targetEventId
    },
    requesterEventId: {
      value: requesterEventId,
      isValid: mongoose.Types.ObjectId.isValid(requesterEventId),
      type: typeof requesterEventId
    },
    userId: {
      value: userId,
      isValid: mongoose.Types.ObjectId.isValid(userId),
      type: typeof userId
    }
  };
  
  res.json({
    success: true,
    validation,
    allValid: validation.targetEventId.isValid && validation.requesterEventId.isValid && validation.userId.isValid
  });
});

// PRODUCTION DIAGNOSTIC ENDPOINT
app.get('/api/production/diagnostics', authenticateToken, async (req: any, res: any) => {
  try {
    const startTime = Date.now();
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      checks: {}
    };

    // 1. Database connectivity
    try {
      const dbStart = Date.now();
      await connectToDatabase();
      diagnostics.checks.database = {
        status: 'connected',
        responseTime: Date.now() - dbStart,
        mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing'
      };
    } catch (error) {
      diagnostics.checks.database = {
        status: 'failed',
        error: error.message
      };
    }

    // 2. User authentication
    diagnostics.checks.auth = {
      userId: req.user?.userId || 'missing',
      userIdValid: mongoose.Types.ObjectId.isValid(req.user?.userId || ''),
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing'
    };

    // 3. Collections check
    try {
      const [userCount, eventCount, swapCount] = await Promise.all([
        User.countDocuments(),
        Event.countDocuments(),
        SwapRequest.countDocuments()
      ]);
      
      diagnostics.checks.collections = {
        users: userCount,
        events: eventCount,
        swapRequests: swapCount
      };
    } catch (error) {
      diagnostics.checks.collections = {
        error: error.message
      };
    }

    // 4. User's data check
    if (req.user?.userId) {
      try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const [userEvents, userSwapRequests] = await Promise.all([
          Event.find({ userId }).countDocuments(),
          SwapRequest.find({ 
            $or: [{ requesterId: userId }, { targetUserId: userId }] 
          }).countDocuments()
        ]);
        
        diagnostics.checks.userData = {
          userEvents,
          userSwapRequests
        };
      } catch (error) {
        diagnostics.checks.userData = {
          error: error.message
        };
      }
    }

    // 5. Memory and performance
    diagnostics.checks.performance = {
      totalExecutionTime: Date.now() - startTime,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    res.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Diagnostics failed',
      error: error.message
    });
  }
});

// SIMPLE SWAP REQUEST TEST ENDPOINT
app.post('/api/test/swap-request', authenticateToken, async (req: any, res: any) => {
  try {
    console.log('🧪 Testing swap request creation process...');
    
    const { targetEventId, requesterEventId } = req.body;
    const userId = req.user?.userId;
    
    const testResults: any = {
      timestamp: new Date().toISOString(),
      steps: {}
    };

    // Step 1: Validate inputs
    testResults.steps.inputValidation = {
      targetEventId: !!targetEventId,
      requesterEventId: !!requesterEventId,
      userId: !!userId,
      targetEventIdFormat: mongoose.Types.ObjectId.isValid(targetEventId || ''),
      requesterEventIdFormat: mongoose.Types.ObjectId.isValid(requesterEventId || ''),
      userIdFormat: mongoose.Types.ObjectId.isValid(userId || '')
    };

    if (!targetEventId || !requesterEventId || !userId) {
      return res.json({ success: true, testResults, stopped: 'Missing required fields' });
    }

    // Step 2: Database connection
    try {
      await connectToDatabase();
      testResults.steps.database = { status: 'connected' };
    } catch (error) {
      testResults.steps.database = { status: 'failed', error: error.message };
      return res.json({ success: true, testResults, stopped: 'Database connection failed' });
    }

    // Step 3: Check events exist
    try {
      const [requesterEvent, targetEvent] = await Promise.all([
        Event.findById(requesterEventId),
        Event.findById(targetEventId)
      ]);
      
      testResults.steps.eventCheck = {
        requesterEventExists: !!requesterEvent,
        targetEventExists: !!targetEvent,
        requesterEventOwnership: requesterEvent?.userId?.toString() === userId,
        targetEventStatus: targetEvent?.status || 'not found'
      };
    } catch (error) {
      testResults.steps.eventCheck = { error: error.message };
    }

    // Step 4: Check existing swap requests
    try {
      const existing = await SwapRequest.findOne({
        requesterId: new mongoose.Types.ObjectId(userId),
        targetEventId: new mongoose.Types.ObjectId(targetEventId),
        requesterEventId: new mongoose.Types.ObjectId(requesterEventId)
      });
      
      testResults.steps.duplicateCheck = {
        existingRequest: !!existing,
        existingStatus: existing?.status || 'none'
      };
    } catch (error) {
      testResults.steps.duplicateCheck = { error: error.message };
    }

    res.json({
      success: true,
      testResults,
      message: 'Test completed - check steps for issues'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// Check swap request status (helps with auto-refresh scenarios)
app.get('/api/swap/request/status/:targetEventId/:requesterEventId', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const { targetEventId, requesterEventId } = req.params;
    const requesterId = req.user?.userId;
    
    if (!mongoose.Types.ObjectId.isValid(targetEventId) || !mongoose.Types.ObjectId.isValid(requesterEventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event IDs' });
    }
    
    const swapRequest = await SwapRequest.findOne({
      requesterId: new mongoose.Types.ObjectId(requesterId),
      targetEventId: new mongoose.Types.ObjectId(targetEventId),
      requesterEventId: new mongoose.Types.ObjectId(requesterEventId)
    }).populate([
      { path: 'requesterId', select: 'name email' },
      { path: 'targetUserId', select: 'name email' },
      { path: 'requesterEventId', select: 'title startTime endTime' },
      { path: 'targetEventId', select: 'title startTime endTime' }
    ]).sort({ createdAt: -1 });
    
    if (!swapRequest) {
      return res.json({ 
        success: true, 
        exists: false, 
        message: 'No swap request found' 
      });
    }
    
    res.json({ 
      success: true, 
      exists: true,
      data: swapRequest,
      status: swapRequest.status
    });
  } catch (error) {
    console.error('Check swap request status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Same endpoint without /api prefix
app.get('/swap/request/status/:targetEventId/:requesterEventId', authenticateToken, async (req: any, res: any) => {
  try {
    await connectToDatabase();
    
    const { targetEventId, requesterEventId } = req.params;
    const requesterId = req.user?.userId;
    
    if (!mongoose.Types.ObjectId.isValid(targetEventId) || !mongoose.Types.ObjectId.isValid(requesterEventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event IDs' });
    }
    
    const swapRequest = await SwapRequest.findOne({
      requesterId: new mongoose.Types.ObjectId(requesterId),
      targetEventId: new mongoose.Types.ObjectId(targetEventId),
      requesterEventId: new mongoose.Types.ObjectId(requesterEventId)
    }).populate([
      { path: 'requesterId', select: 'name email' },
      { path: 'targetUserId', select: 'name email' },
      { path: 'requesterEventId', select: 'title startTime endTime' },
      { path: 'targetEventId', select: 'title startTime endTime' }
    ]).sort({ createdAt: -1 });
    
    if (!swapRequest) {
      return res.json({ 
        success: true, 
        exists: false, 
        message: 'No swap request found' 
      });
    }
    
    res.json({ 
      success: true, 
      exists: true,
      data: swapRequest,
      status: swapRequest.status
    });
  } catch (error) {
    console.error('Check swap request status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
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
  body('targetEventId').notEmpty().withMessage('Target event ID is required').isMongoId().withMessage('Target event ID must be a valid MongoDB ObjectId'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required').isMongoId().withMessage('Requester event ID must be a valid MongoDB ObjectId'),
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
  body('targetEventId').notEmpty().withMessage('Target event ID is required').isMongoId().withMessage('Target event ID must be a valid MongoDB ObjectId'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required').isMongoId().withMessage('Requester event ID must be a valid MongoDB ObjectId'),
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
  body('targetEventId').notEmpty().withMessage('Target event ID is required').isMongoId().withMessage('Target event ID must be a valid MongoDB ObjectId'),
  body('requesterEventId').notEmpty().withMessage('Requester event ID is required').isMongoId().withMessage('Requester event ID must be a valid MongoDB ObjectId'),
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

// SIMPLIFIED SWAP REQUEST CREATION - New robust logic
app.post('/swap/request', authenticateToken, async (req: any, res: any) => {
  const startTime = Date.now();
  console.log(`🚀 [${new Date().toISOString()}] Swap request started`);
  
  try {
    // Basic validation first
    const { targetEventId, requesterEventId, message = '' } = req.body;
    const requesterId = req.user?.userId;

    console.log('📝 Request data:', { 
      targetEventId, 
      requesterEventId, 
      requesterId,
      hasMessage: !!message 
    });

    // Quick validation
    if (!targetEventId || !requesterEventId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Target event ID and requester event ID are required' 
      });
    }

    // Connect to database with timeout
    console.log('🔌 Connecting to database...');
    const dbStart = Date.now();
    await Promise.race([
      connectToDatabase(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    console.log(`✅ Database connected in ${Date.now() - dbStart}ms`);

    // Simple ObjectId validation and conversion
    let targetObjId, requesterObjId, requesterObjId2;
    try {
      targetObjId = new mongoose.Types.ObjectId(targetEventId);
      requesterObjId = new mongoose.Types.ObjectId(requesterEventId);
      requesterObjId2 = new mongoose.Types.ObjectId(requesterId);
    } catch (err) {
      console.log('❌ Invalid ObjectId format');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
      });
    }

    // Check for existing request first (fastest check)
    console.log('🔍 Checking for existing request...');
    const existingRequest = await SwapRequest.findOne({
      requesterId: requesterObjId2,
      targetEventId: targetObjId,
      requesterEventId: requesterObjId,
      status: { $in: ['PENDING', 'ACCEPTED'] }
    }).lean(); // Use lean for faster query

    if (existingRequest) {
      console.log('✅ Found existing request, returning it');
      return res.status(200).json({ 
        success: true, 
        data: existingRequest,
        message: 'Swap request already exists',
        fromCache: true
      });
    }

    // Batch fetch both events in parallel
    console.log('📋 Fetching events in parallel...');
    const [requesterEvent, targetEvent] = await Promise.all([
      Event.findOne({ _id: requesterObjId, userId: requesterObjId2 }).lean(),
      Event.findOne({ _id: targetObjId, status: 'SWAPPABLE' }).lean()
    ]);

    // Type assertion for lean queries
    const requesterEventTyped = requesterEvent as any;
    const targetEventTyped = targetEvent as any;

    // Validate events
    if (!requesterEventTyped) {
      console.log('❌ Requester event not found or not owned');
      return res.status(404).json({ 
        success: false, 
        message: 'Your event not found or you do not own it' 
      });
    }

    if (!targetEventTyped) {
      console.log('❌ Target event not found or not swappable');
      return res.status(404).json({ 
        success: false, 
        message: 'Target event not found or not available for swapping' 
      });
    }

    // Prevent self-swapping
    if (targetEventTyped.userId.toString() === requesterId.toString()) {
      console.log('❌ Self-swap attempt');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot swap with your own event' 
      });
    }

    // Create swap request (simple approach)
    console.log('💾 Creating swap request...');
    const swapRequestData = {
      requesterId: requesterObjId2,
      targetUserId: targetEventTyped.userId,
      requesterEventId: requesterObjId,
      targetEventId: targetObjId,
      message: message || `Swap request from ${requesterEventTyped.title} to ${targetEventTyped.title}`,
      status: 'PENDING'
    };

    const swapRequest = await SwapRequest.create(swapRequestData);
    console.log('✅ Swap request created with ID:', swapRequest._id);

    // Return minimal response for speed
    const response = {
      success: true,
      data: {
        _id: swapRequest._id,
        requesterId: swapRequest.requesterId,
        targetUserId: swapRequest.targetUserId,
        requesterEventId: swapRequest.requesterEventId,
        targetEventId: swapRequest.targetEventId,
        status: swapRequest.status,
        message: swapRequest.message,
        createdAt: swapRequest.createdAt
      },
      executionTime: Date.now() - startTime
    };

    console.log(`🎉 Swap request completed in ${Date.now() - startTime}ms`);
    
    res.status(201).json(response);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`💥 Swap request failed after ${executionTime}ms:`, error.message);
    console.error('Stack:', error.stack);
    
    // Production-safe error response
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create swap request',
      executionTime,
      errorCode: 'SWAP_CREATE_ERROR'
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