const redis = require('./redis');
const { initializeQueues } = require('./queue');
const { initializeWorker } = require('../workers/notificationWorker');

/**
 * Initialize Redis and BullMQ queues (for main server)
 * This function should be called when the main server starts
 */
async function initializeRedisAndQueues() {
  console.log('🚀 Starting Redis and BullMQ initialization (Server Mode)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Wait for Redis to be ready
    console.log('1️⃣  Waiting for Redis connection...');
    await waitForRedisConnection();
    
    // Step 2: Initialize queues (but NOT workers)
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

/**
 * Initialize everything including workers (for combined mode - legacy)
 */
async function initializeRedisQueuesAndWorkers() {
  console.log('🚀 Starting Redis and BullMQ initialization (Combined Mode)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Wait for Redis to be ready
    console.log('1️⃣  Waiting for Redis connection...');
    await waitForRedisConnection();
    
    // Step 2: Initialize queues
    console.log('2️⃣  Setting up BullMQ queues...');
    await initializeQueues();
    
    // Step 3: Initialize workers
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

/**
 * Wait for Redis connection to be ready
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10 seconds)
 */
function waitForRedisConnection(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Redis connection timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // If already connected
    if (redis.status === 'ready') {
      clearTimeout(timeout);
      resolve();
      return;
    }

    // Wait for ready event
    redis.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    // Handle connection errors
    redis.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Graceful shutdown of Redis and BullMQ connections (server mode)
 */
async function shutdownRedisAndQueues() {
  console.log('🛑 Shutting down Redis and BullMQ services (Server Mode)...');
  
  try {
    // Note: Workers are in separate processes, so we don't close them here
    
    // Close Redis connection
    await redis.quit();
    console.log('✅ Redis connection closed');
    
    console.log('✅ Redis and BullMQ services shut down gracefully');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
  }
}

/**
 * Graceful shutdown including workers (combined mode)
 */
async function shutdownRedisQueuesAndWorkers() {
  console.log('🛑 Shutting down Redis and BullMQ services (Combined Mode)...');
  
  try {
    // Close worker connections
    const { getWorker } = require('../workers/notificationWorker');
    const worker = getWorker();
    if (worker) {
      await worker.close();
      console.log('✅ Notification worker closed');
    }

    // Close Redis connection
    await redis.quit();
    console.log('✅ Redis connection closed');
    
    console.log('✅ All Redis and BullMQ services shut down gracefully');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
  }
}

/**
 * Get connection status
 */
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
  initializeRedisAndQueues, // Server-only (recommended)
  initializeRedisQueuesAndWorkers, // Combined mode (legacy)
  shutdownRedisAndQueues, // Server-only
  shutdownRedisQueuesAndWorkers, // Combined mode
  getConnectionStatus,
}; 