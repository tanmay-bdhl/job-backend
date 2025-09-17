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
  interviewQuestions: {
    type: {
      questions: [{
        id: { type: String, required: true },
        category: { type: String, required: true },
        difficulty: { 
          type: String, 
          enum: ['Easy', 'Medium', 'Hard'],
          required: true 
        },
        question: { type: String, required: true },
        time_estimate: { type: String, required: true },
        tags: [{ type: String }],
        ai_answer: { type: String, required: true }
      }],
      metadata: {
        total_questions: { type: Number, default: 0 },
        total_time: { type: Number, default: 0 },
        difficulty_distribution: {
          Easy: { type: Number, default: 0 },
          Medium: { type: Number, default: 0 },
          Hard: { type: Number, default: 0 }
        },
        categories: [{ type: String }]
      },
      generated_at: { type: Date, default: Date.now }
    },
    default: null
  },
  interviewAnswers: {
    type: [{
      questionId: { type: String, required: true },
      answer: { type: String, required: true },
      score: {
        overall_score: { type: Number, min: 0, max: 100, required: true },
        breakdown: {
          technical_accuracy: { type: Number, min: 0, max: 100, required: true },
          completeness: { type: Number, min: 0, max: 100, required: true },
          clarity: { type: Number, min: 0, max: 100, required: true },
          relevance: { type: Number, min: 0, max: 100, required: true }
        },
        feedback: { type: String, required: true }
      },
      submitted_at: { type: Date, required: true },
      scored_at: { type: Date, default: Date.now }
    }],
    default: []
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
