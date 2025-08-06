const mongoose = require('mongoose');

const jobPreferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  skills: [{ type: String }],
  location: { type: String },
  jobType: { type: String },
});

module.exports = mongoose.model('JobPreference', jobPreferenceSchema); 