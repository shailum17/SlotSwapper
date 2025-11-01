import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routes from '../src/routes';

// Load environment variables
dotenv.config();

const app = express();

// Simple and reliable CORS configuration
app.use(cors({
  origin: [
    'https://slot-swapper-eight.vercel.app',
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - Handle both /api and direct routes
app.use('/api', routes);
app.use('/', routes);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SlotSwapper API is running',
    timestamp: new Date().toISOString()
  });
});

// Initialize database connection for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/slot-swapper';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }
    
    isConnected = true;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    isConnected = false;
    throw error;
  }
};

// Serverless function handler
export default async (req: any, res: any) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};