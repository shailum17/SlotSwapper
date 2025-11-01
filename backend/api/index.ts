import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

// Initialize Express app
const app = express();

// CORS configuration - simplified and robust
app.use(cors({
  origin: [
    'https://slot-swapper-eight.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (simple, no dependencies)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection management for serverless
let cachedConnection: typeof mongoose | null = null;

const connectToDatabase = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const connection = await mongoose.connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection;
    console.log('Database connected successfully');
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    cachedConnection = null;
    throw error;
  }
};

// Import and setup routes only after successful DB connection
const setupRoutes = async () => {
  try {
    // Dynamic import to avoid issues during cold starts
    const { default: routes } = await import('../src/routes');
    
    // Setup API routes
    app.use('/api', routes);
    app.use('/', routes);
    
    console.log('Routes setup completed');
  } catch (error) {
    console.error('Routes setup error:', error);
    // Don't throw here, let the app work without routes for debugging
  }
};

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Main serverless handler
export default async (req: any, res: any) => {
  try {
    // Set CORS headers manually as backup
    res.setHeader('Access-Control-Allow-Origin', 'https://slot-swapper-eight.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Connect to database
    await connectToDatabase();
    
    // Setup routes (only once)
    if (!app._router || app._router.stack.length <= 4) {
      await setupRoutes();
    }

    // Handle the request
    return app(req, res);
    
  } catch (error) {
    console.error('Serverless handler error:', error);
    
    // Return error response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Serverless function error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
};