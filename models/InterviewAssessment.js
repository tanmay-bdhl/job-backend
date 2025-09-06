const mongoose = require('mongoose');

const interviewAssessmentSchema = new mongoose.Schema({
  assessmentId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  analysisId: { 
    type: String, 
    required: true,
    index: true 
  },
  
  config: {
    difficulty_level: { 
      type: String, 
      enum: ['junior', 'mid', 'senior', 'expert'],
      default: 'mid' 
    },
    focus_areas: [{ 
      type: String, 
      enum: ['technical', 'behavioral', 'situational', 'coding', 'system_design'] 
    }],
    job_role: { 
      type: String, 
      enum: ['frontend', 'backend', 'fullstack', 'devops', 'data', 'mobile'],
      default: 'fullstack' 
    },
    question_count: { type: Number, default: 10, min: 5, max: 50 }
  },
  
  questions: [{
    questionId: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['technical', 'behavioral', 'coding', 'situational', 'system_design'],
      required: true 
    },
    difficulty: { 
      type: String, 
      enum: ['easy', 'medium', 'hard', 'expert'],
      required: true 
    },
    question: { type: String, required: true },
    context: { type: String },
    expected_answer_points: [{ type: String }],
    evaluation_criteria: [{ type: String }],
    time_limit_minutes: { type: Number, default: 5, min: 1, max: 30 }
  }],
  
  responses: [{
    questionId: { type: String, required: true },
    answer: { type: String },
    response_time_seconds: { type: Number, min: 0 },
    confidence_level: { type: Number, min: 1, max: 10, default: 5 },
    answered_at: { type: Date, default: Date.now }
  }],
  
  results: {
    overall_score: { type: Number, min: 0, max: 100, default: 0 },
    category_scores: [{
      category: { type: String, required: true },
      score: { type: Number, min: 0, max: 100, required: true },
      feedback: { type: String }
    }],
    strengths: [{ type: String }],
    improvement_areas: [{ type: String }],
    recommended_next_steps: [{ type: String }]
  },
  
  status: { 
    type: String, 
    enum: ['generated', 'in_progress', 'completed', 'abandoned'],
    default: 'generated' 
  },
  created_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  updated_at: { type: Date, default: Date.now }
});

interviewAssessmentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

interviewAssessmentSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: Date.now() });
  next();
});

interviewAssessmentSchema.statics.findByAssessmentId = function(assessmentId) {
  return this.findOne({ assessmentId });
};

interviewAssessmentSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ created_at: -1 });
};

interviewAssessmentSchema.statics.findByAnalysisId = function(analysisId) {
  return this.find({ analysisId }).sort({ created_at: -1 });
};

interviewAssessmentSchema.statics.findActive = function(userId) {
  return this.find({ 
    userId, 
    status: { $in: ['generated', 'in_progress'] } 
  }).sort({ created_at: -1 });
};

interviewAssessmentSchema.methods.getProgress = function() {
  if (this.questions.length === 0) return 0;
  const answeredCount = this.responses.length;
  return Math.round((answeredCount / this.questions.length) * 100);
};

interviewAssessmentSchema.methods.getNextQuestion = function() {
  const answeredQuestionIds = this.responses.map(r => r.questionId);
  return this.questions.find(q => !answeredQuestionIds.includes(q.questionId));
};

interviewAssessmentSchema.methods.submitAnswer = function(questionId, answer, confidenceLevel = 5) {
  const startTime = Date.now();
  
  const existingResponseIndex = this.responses.findIndex(r => r.questionId === questionId);
  
  if (existingResponseIndex >= 0) {
    this.responses[existingResponseIndex].answer = answer;
    this.responses[existingResponseIndex].confidence_level = confidenceLevel;
    this.responses[existingResponseIndex].answered_at = new Date();
  } else {
    this.responses.push({
      questionId,
      answer,
      confidence_level: confidenceLevel,
      answered_at: new Date()
    });
  }
  
  if (this.responses.length === this.questions.length) {
    this.status = 'completed';
    this.completed_at = new Date();
  } else if (this.status === 'generated') {
    this.status = 'in_progress';
  }
  
  return this.save();
};

module.exports = mongoose.model('InterviewAssessment', interviewAssessmentSchema);
