const redis = require('./redis');

async function initializeRedisAndQueues() {
  console.log('🚀 Starting Redis initialization...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    console.log('1️⃣  Waiting for Redis connection...');
    await waitForRedisConnection();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Redis initialized successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return true;
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💥 FAILED to initialize Redis services!');
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
  console.log('🛑 Shutting down Redis services...');
  
  try {
    await redis.quit();
    console.log('✅ Redis connection closed');
    console.log('✅ Redis services shut down gracefully');
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
  shutdownRedisAndQueues, 
  getConnectionStatus,
}; 