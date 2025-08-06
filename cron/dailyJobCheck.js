const cron = require('node-cron');
const axios = require('axios');
const User = require('../models/User');

// Helper to determine if a user should be notified today
function shouldNotifyToday(user) {
  const freq = user.jobPreferences?.frequency;
  if (!freq) return false;
  const today = new Date();
  const day = today.getDay(); // 0=Sunday, 1=Monday, ...
  if (freq === 'daily') return true;
  if (freq === 'weekly once') return day === 1; // e.g., Monday
  if (freq === 'once in two weeks') {
    // Notify on even weeks, Monday
    const firstJan = new Date(today.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((today - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
    return weekNum % 2 === 0 && day === 1;
  }
  if (freq === 'monthly') return today.getDate() === 1;
  return false;
}

async function notifyDjangoServer(userIds) {
  try {
    await axios.post('http://your-django-server/notify', { userIds });
  } catch (err) {
    console.error('Failed to notify Django server:', err.message);
  }
}

function startDailyJobCheck() {
  cron.schedule('0 7 * * *', async () => {
    try {
      const users = await User.find({ 'jobPreferences.frequency': { $exists: true } });
      const notifyIds = users.filter(shouldNotifyToday).map(u => u._id.toString());
      if (notifyIds.length > 0) {
        await notifyDjangoServer(notifyIds);
        console.log('Notified Django server for user IDs:', notifyIds);
      } else {
        console.log('No users to notify today.');
      }
    } catch (err) {
      console.error('Error in daily job check:', err.message);
    }
  }, {
    timezone: 'Asia/Kolkata' // Set to your timezone if needed
  });
}

module.exports = { startDailyJobCheck }; 