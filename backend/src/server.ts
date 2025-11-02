import dotenv from 'dotenv';
import app from '../api/index';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 SlotSwapper API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API routes: http://localhost:${PORT}/api/routes`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;