import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from '../src/config/database';
import routes from '../src/routes';

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://slot-swapper-eight.vercel.app',
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
// Handle preflight requests
app.options('*', cors(corsOptions));

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

// Initialize database connection
let isConnected = false;

const connectDB = async () => {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }
};

// Serverless function handler
export default async (req: any, res: any) => {
  await connectDB();
  return app(req, res);
};