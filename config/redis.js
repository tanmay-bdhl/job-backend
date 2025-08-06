const Redis = require('ioredis');

// Create Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Required by BullMQ
  retryDelayOnFailover: 100,
  lazyConnect: false, // Connect immediately
});

redis.on('connect', () => {
  console.log('✅ Redis: Connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis: Ready to receive commands');
});

redis.on('error', (err) => {
  console.error('❌ Redis: Connection error:', err.message);
});

redis.on('close', () => {
  console.log('⚠️  Redis: Connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});

module.exports = redis; 