const axios = require('axios');
const Redis = require('ioredis');

async function verifySetup() {
  console.log('🔍 Verifying Redis and BullMQ setup...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 1: Check if Redis is running
  console.log('1️⃣  Testing Redis connection...');
  try {
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    });
    
    await redis.ping();
    console.log('✅ Redis is running and accessible');
    await redis.quit();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('💡 Make sure Redis is running: brew services start redis');
    return false;
  }

  // Test 2: Check if server is running
  console.log('2️⃣  Testing server status...');
  try {
    const response = await axios.get('http://localhost:8000/api/status');
    console.log('✅ Server is running');
    console.log('📊 Connection Status:', response.data);
  } catch (error) {
    console.error('❌ Server not accessible:', error.message);
    console.log('💡 Make sure the server is running: npm run dev');
    return false;
  }

  // Test 3: Test notification endpoint
  console.log('3️⃣  Testing notification endpoint...');
  try {
    const notificationData = {
      userId: 'test-user-123',
      channels: ['email', 'sms'],
      message: 'Test notification from verification script'
    };

    const response = await axios.post('http://localhost:8000/api/notifications', notificationData);
    console.log('✅ Notification endpoint working');
    console.log('📨 Job created with ID:', response.data.jobId);
  } catch (error) {
    console.error('❌ Notification endpoint failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return false;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 All tests passed! Setup is working correctly.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return true;
}

// Run verification
verifySetup().catch(console.error); 