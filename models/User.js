const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  jobPreferences: {
    frequency: {
      type: String,
      enum: ["daily", "weekly once", 'once in two weeks', "monthly"],
    },
    channel: [{
      type: String,
      enum: ["Whatsapp", "Email"],
    }],
    companySize: [{
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"]
    }],
    location: [{
      type: String,
      enum: ["Onsite", "Remote", "Hybrid"]
    }]
  },
  resumeName: { type: String },
  s3Location: { type: String }
});

module.exports = mongoose.model('User', userSchema); 