const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('💡 To fix this:');
    console.log('   1. Add your current IP to MongoDB Atlas whitelist');
    console.log('   2. Or use a local MongoDB instance');
    console.log('   3. Or set MONGO_URI to a local connection string');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Continuing in development mode without MongoDB...');
      return false;
    } else {
      process.exit(1);
    }
  }
};

module.exports = { connectDB }; 