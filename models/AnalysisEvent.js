const mongoose = require('mongoose');

const analysisEventSchema = new mongoose.Schema({
  analysisId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  userId: { 
    type: String, 
    required: false,
    index: true
  },
  fileName: { 
    type: String, 
    required: true 
  },
  fileSize: { 
    type: Number, 
    required: true 
  },
  fileUrl: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['queued', 'processing', 'ats_analysis', 'content_review', 'skills_analysis', 'completed', 'error', 'cancelled'],
    default: 'queued',
    index: true
  },
  currentStage: { 
    type: String, 
    default: 'queued' 
  },
  progress: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  },
  results: { 
    type: Object, 
    default: null 
  },
  error: { 
    type: String, 
    default: null 
  },
  lambdaJobId: { 
    type: String, 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date, 
    default: null 
  }
});

analysisEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

analysisEventSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('AnalysisEvent', analysisEventSchema);
