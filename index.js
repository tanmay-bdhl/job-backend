require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const cors = require('cors');
const { initializeRedisAndQueues, shutdownRedisAndQueues, getConnectionStatus } = require('./config/init');
const authRoutes = require('./routes/auth');
const uploadCvRoutes = require('./routes/uploadCv');
const jobPreferencesRoutes = require('./routes/jobPreferences');
const notificationsRoutes = require('./routes/notifications');

const app = express();

// Explicit CORS handling for Amplify frontend and preflight requests
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://main.d1yr5y57cgtbi9.amplifyapp.com';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Content-Length, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
});

// Basic middleware
app.use(express.json());
app.use(morgan('dev'));

// Add all routes
app.use('/api/auth', authRoutes);
app.use('/api/upload-cv', uploadCvRoutes);
app.use('/api/job-preferences', jobPreferencesRoutes);
app.use('/api/notifications', notificationsRoutes);

// Simple routes only
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  const status = getConnectionStatus();
  res.json({
    success: true,
    message: 'Connection status retrieved',
    environment: process.env.NODE_ENV || 'development',
    ...status,
  });
});

// Simple startup function
async function startServer() {
  const PORT = process.env.PORT || 3000;
  
  try {
    console.log('🚀 Starting full server...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Port: ${PORT}`);
    
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Redis
    await initializeRedisAndQueues();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`📄 Upload: http://localhost:${PORT}/api/upload-cv`);
      console.log(`⚙️ Preferences: http://localhost:${PORT}/api/job-preferences`);
      console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down...');
      await shutdownRedisAndQueues();
      server.close(() => process.exit(0));
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down...');
      await shutdownRedisAndQueues();
      server.close(() => process.exit(0));
    });

  } catch (error) {
    console.error('💥 Server failed:', error.message);
    process.exit(1);
  }
}

startServer(); 