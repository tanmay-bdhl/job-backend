const redis = require('./redis');
const { initializeQueues } = require('./queue');
const { initializeWorker } = require('../workers/notificationWorker');

async function initializeRedisAndQueues() {
  console.log('🚀 Starting Redis and BullMQ initialization (Server Mode)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('1️⃣  Waiting for Redis connection...');
    await waitForRedisConnection();
    
    console.log('2️⃣  Setting up BullMQ queues...');
    await initializeQueues();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Redis and BullMQ queues initialized successfully!');
    console.log('📝 Note: Workers will run in separate processes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return true;
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💥 FAILED to initialize Redis and BullMQ services!');
    console.error('Error:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw error;
  }
}

async function initializeRedisQueuesAndWorkers() {
  console.log('🚀 Starting Redis and BullMQ initialization (Combined Mode)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('1️⃣  Waiting for Redis connection...');
    await waitForRedisConnection();
    
    console.log('2️⃣  Setting up BullMQ queues...');
    await initializeQueues();
    
    console.log('3️⃣  Starting notification worker...');
    await initializeWorker();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All Redis and BullMQ services initialized successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return true;
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💥 FAILED to initialize Redis and BullMQ services!');
    console.error('Error:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw error;
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

async function shutdownRedisAndQueues() {
  console.log('🛑 Shutting down Redis and BullMQ services (Server Mode)...');
  
  try {
    
    await redis.quit();
    console.log('✅ Redis connection closed');
    
    console.log('✅ Redis and BullMQ services shut down gracefully');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
  }
}

async function shutdownRedisQueuesAndWorkers() {
  console.log('🛑 Shutting down Redis and BullMQ services (Combined Mode)...');
  
  try {
    const { getWorker } = require('../workers/notificationWorker');
    const worker = getWorker();
    if (worker) {
      await worker.close();
      console.log('✅ Notification worker closed');
    }

    await redis.quit();
    console.log('✅ Redis connection closed');
    
    console.log('✅ All Redis and BullMQ services shut down gracefully');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
  }
}

function getConnectionStatus() {
  return {
    redis: {
      status: redis.status,
      connected: redis.status === 'ready',
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  initializeRedisAndQueues, 
  initializeRedisQueuesAndWorkers, 
  shutdownRedisAndQueues, 
  shutdownRedisQueuesAndWorkers, 
  getConnectionStatus,
}; 