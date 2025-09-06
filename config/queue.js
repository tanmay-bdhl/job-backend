const { Queue, Worker } = require('bullmq');
const redis = require('./redis');

const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, 
    },
    removeOnComplete: 100, 
    removeOnFail: 50, 
  },
});

notificationQueue.on('error', (err) => {
  console.error('❌ Notification Queue: Error occurred:', err.message);
});

notificationQueue.on('waiting', (job) => {
  console.log(`⏳ Notification Queue: Job ${job.id} is waiting`);
});

notificationQueue.on('active', (job) => {
  console.log(`🔄 Notification Queue: Job ${job.id} is now active`);
});

notificationQueue.on('completed', (job) => {
  console.log(`✅ Notification Queue: Job ${job.id} completed`);
});

notificationQueue.on('failed', (job, err) => {
  console.log(`❌ Notification Queue: Job ${job.id} failed:`, err.message);
});

async function initializeQueues() {
  try {
    console.log('🚀 Initializing BullMQ notification queue...');
    
    await notificationQueue.getJobCounts();
    console.log('✅ BullMQ: Notification queue initialized successfully');
    
    return true;
  } catch (error) {
    console.error('❌ BullMQ: Failed to initialize notification queue:', error.message);
    throw error;
  }
}

module.exports = {
  notificationQueue,
  initializeQueues,
}; 