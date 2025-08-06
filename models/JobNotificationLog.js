const mongoose = require('mongoose');

const jobNotificationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobs: [{ type: Object }],
  notifiedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('JobNotificationLog', jobNotificationLogSchema); 