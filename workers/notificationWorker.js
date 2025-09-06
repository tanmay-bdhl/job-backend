const { Worker } = require('bullmq');
const redis = require('../config/redis');
const channelFactory = require('../channels/ChannelFactory');

let notificationWorker = null;

function createNotificationWorker() {
  if (notificationWorker) {
    return notificationWorker;
  }

  console.log('🚀 Initializing notification worker...');

  notificationWorker = new Worker(
    'notifications',
    async (job) => {
      console.log(`🔄 Processing notification job: ${job.id}`);
      
      const { userId, channels, message, timestamp } = job.data;
      
      try {
        console.log(`📤 Sending notification to user ${userId}`);
        console.log(`📋 Channels: ${channels.join(', ')}`);
        console.log(`💬 Message: ${message}`);
        console.log(`⏰ Timestamp: ${timestamp}`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const results = await channelFactory.sendMultiple(channels, userId, message, {
          subject: 'Job Backend Notification',
          jobId: job.id
        });
        
        const successfulChannels = results.filter(r => r.success).map(r => r.channel);
        const failedChannels = results.filter(r => !r.success).map(r => r.channel);
        
        if (successfulChannels.length > 0) {
          console.log(`✅ Successfully sent via: ${successfulChannels.join(', ')}`);
        }
        
        if (failedChannels.length > 0) {
          console.log(`❌ Failed to send via: ${failedChannels.join(', ')}`);
        }
        
        console.log(`✅ Notification job ${job.id} completed successfully`);
        
        return { 
          status: 'success', 
          processedAt: new Date().toISOString(),
          results: results,
          successfulChannels: successfulChannels,
          failedChannels: failedChannels
        };
        
      } catch (error) {
        console.error(`❌ Error processing notification job ${job.id}:`, error.message);
        throw error; 
      }
    },
    {
      connection: redis,
      concurrency: 5, 
    }
  );

  notificationWorker.on('ready', () => {
    console.log('✅ Notification Worker: Ready to process jobs');
    console.log('📋 Available channels:', channelFactory.getAvailableChannels().join(', '));
    
    const validationResults = channelFactory.validateConfigurations();
    console.log('🔧 Channel validation:', validationResults);
  });

  notificationWorker.on('completed', (job) => {
    console.log(`✅ Worker: Job ${job.id} completed`);
  });

  notificationWorker.on('failed', (job, err) => {
    console.log(`❌ Worker: Job ${job.id} failed:`, err.message);
  });

  notificationWorker.on('error', (err) => {
    console.error('❌ Worker: Error occurred:', err.message);
  });

  notificationWorker.on('stalled', (jobId) => {
    console.log(`⚠️  Worker: Job ${jobId} stalled`);
  });

  return notificationWorker;
}

async function initializeWorker() {
  try {
    const worker = createNotificationWorker();
    console.log('✅ Notification worker initialized successfully');
    return worker;
  } catch (error) {
    console.error('❌ Failed to initialize notification worker:', error.message);
    throw error;
  }
}

module.exports = {
  createNotificationWorker,
  initializeWorker,
  getWorker: () => notificationWorker,
}; 