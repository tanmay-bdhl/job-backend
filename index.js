require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const { initializeRedisAndQueues, shutdownRedisAndQueues, getConnectionStatus } = require('./config/init');
const websocketService = require('./services/websocketService');
const changeStreamService = require('./services/changeStreamService');
const authRoutes = require('./routes/auth');
const jobPreferencesRoutes = require('./routes/jobPreferences');
const analysisRoutes = require('./routes/analysis');
const rateLimitRoutes = require('./routes/rateLimit');

const app = express();

const DEFAULT_ORIGINS = [
  'https://main.d1yr5y57cgtbi9.amplifyapp.com',
  'https://twopiece.life',
  'https://www.twopiece.life',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];
const parsedEnvOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ORIGINS, ...parsedEnvOrigins])];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Content-Length, X-Requested-With, X-Device-Fingerprint, Device-Fingerprint');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
});

app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/job-preferences', jobPreferencesRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/rate-limit', rateLimitRoutes);

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

async function startServer() {
  const PORT = process.env.PORT || 3000;
  
  try {
    console.log('🚀 Starting full server...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Port: ${PORT}`);
    
    const mongoConnected = await connectDB();
    
    await initializeRedisAndQueues();
    
    const WS_PORT = process.env.WS_PORT || 8080;
    websocketService.initialize(WS_PORT);
    
    
    if (mongoConnected) {
      try {
        console.log('🔍 Initializing MongoDB change streams...');
        await changeStreamService.initialize();
        console.log('✅ MongoDB change streams initialized successfully');
      } catch (error) {
        console.log('⚠️ MongoDB change streams failed to initialize:', error.message);
        console.log('💡 This might indicate a connection or permission issue.');
        
        if (error.message.includes('ChangeStreamNotSupported')) {
          console.log('🔧 Change streams are not supported on this MongoDB deployment');
        } else if (error.message.includes('Unauthorized')) {
          console.log('🔧 Database user may need additional permissions');
        }
      }
    } else {
      console.log('⚠️ Skipping MongoDB change streams (MongoDB not connected)');
    }
    
    const server = app.listen(PORT, () => {
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server running on port ${WS_PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`📄 Upload: http://localhost:${PORT}/api/analysis/upload`);
      console.log(`⚙️ Preferences: http://localhost:${PORT}/api/job-preferences`);
      console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications`);
      console.log(`🧠 Analysis: http://localhost:${PORT}/api/analysis`);
    });

    const gracefulShutdown = async () => {
      console.log('🛑 Shutting down...');
      await changeStreamService.shutdown();
      websocketService.shutdown();
      await shutdownRedisAndQueues();
      server.close(() => process.exit(0));
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('💥 Server failed:', error.message);
    process.exit(1);
  }
}

startServer(); 