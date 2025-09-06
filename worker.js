require('dotenv').config();
const { initializeWorker } = require('./workers/notificationWorker');
const redis = require('./config/redis');
async function startWorker() {
  console.log('🔧 Starting Notification Worker Process...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('1️⃣  Connecting to Redis...');
    await waitForRedisConnection();
    
    console.log('2️⃣  Starting notification worker...');
    const worker = await initializeWorker();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Notification Worker Process running successfully!');
    console.log('🔧 Worker ID:', process.pid);
    console.log('🔄 Waiting for jobs...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down worker...');
      await gracefulShutdown(worker);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down worker...');
      await gracefulShutdown(worker);
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💥 FAILED to start worker process!');
    console.error('Error:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
}

function waitForRedisConnection(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Redis connection timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    if (redis.status === 'ready') {
      clearTimeout(timeout);
      resolve();
      return;
    }

    redis.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    redis.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function gracefulShutdown(worker) {
  console.log('🛑 Starting graceful worker shutdown...');
  
  try {
    if (worker) {
      await worker.close();
      console.log('✅ Worker closed');
    }

    await redis.quit();
    console.log('✅ Redis connection closed');
    
    console.log('✅ Worker process shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during worker shutdown:', error.message);
    process.exit(1);
  }
}

startWorker(); 