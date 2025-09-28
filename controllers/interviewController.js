const AnalysisEvent = require('../models/AnalysisEvent');
const llmService = require('../services/llmService');

// GET /api/analysis/{analysisId}/interview-questions
exports.getInterviewQuestions = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { refresh } = req.query;
    const userId = req.user ? req.user.id : null;

    // Check if analysis exists and is completed
    const analysisEvent = await AnalysisEvent.findOne({ analysisId });
    
    if (!analysisEvent) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    if (analysisEvent.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Analysis not completed. Current status: ${analysisEvent.status}`,
        status: analysisEvent.status,
        progress: analysisEvent.progress
      });
    }

    // Check if we should use cached questions (refresh=false or missing)
    const shouldUseCache = refresh !== 'true';
    
    if (shouldUseCache && analysisEvent.interviewQuestions && analysisEvent.interviewQuestions.questions.length > 0) {
      console.log(`📋 Returning cached questions for analysis: ${analysisId}`);
      return res.status(200).json({
        success: true,
        data: {
          analysis_id: analysisId,
          questions: analysisEvent.interviewQuestions.questions,
          metadata: analysisEvent.interviewQuestions.metadata,
          generated: false,
          refresh_requested: refresh === 'true'
        }
      });
    }

    if (!analysisEvent.results || !analysisEvent.results.content || !analysisEvent.results.content.extracted_sections) {
      return res.status(400).json({
        success: false,
        message: 'Analysis results do not contain extracted sections needed for question generation'
      });
    }

    try {
      const extractedSections = analysisEvent.results.content.extracted_sections;
      
      if (refresh === 'true') {
        console.log(`🔄 Generating new questions for analysis: ${analysisId} (refresh=true)`);
      } else {
        console.log(`🆕 Generating questions for analysis: ${analysisId} (no cached questions found)`);
      }
      
      const questionData = await llmService.generateInterviewQuestions(extractedSections);

      // Get existing questions or initialize empty array
      const existingQuestions = analysisEvent.interviewQuestions?.questions || [];
      const existingMetadata = analysisEvent.interviewQuestions?.metadata || {
        total_questions: 0,
        total_time: 0,
        difficulty_distribution: { Easy: 0, Medium: 0, Hard: 0 },
        categories: []
      };

      // Append new questions to existing ones
      const allQuestions = [...existingQuestions, ...questionData.questions];
      
      // Update metadata to reflect total counts
      const updatedMetadata = {
        total_questions: allQuestions.length,
        total_time: allQuestions.reduce((total, q) => {
          const timeMatch = q.time_estimate?.match(/(\d+)/);
          return total + (timeMatch ? parseInt(timeMatch[1]) : 0);
        }, 0),
        difficulty_distribution: allQuestions.reduce((dist, q) => {
          dist[q.difficulty] = (dist[q.difficulty] || 0) + 1;
          return dist;
        }, { Easy: 0, Medium: 0, Hard: 0 }),
        categories: [...new Set([...existingMetadata.categories, ...questionData.metadata.categories])]
      };

      // Save updated questions to AnalysisEvent collection
      await AnalysisEvent.findOneAndUpdate(
        { analysisId },
        { 
          interviewQuestions: {
            questions: allQuestions,
            metadata: updatedMetadata,
            generated_at: new Date(),
            last_refresh: refresh === 'true' ? new Date() : analysisEvent.interviewQuestions?.generated_at || new Date()
          },
          updatedAt: new Date()
        }
      );

      // Return only new questions if refresh=true, otherwise return all questions
      const responseQuestions = refresh === 'true' ? questionData.questions : allQuestions;
      const responseMetadata = refresh === 'true' ? {
        ...questionData.metadata,
        total_questions: questionData.questions.length,
        is_refresh: true
      } : updatedMetadata;

      res.status(200).json({
        success: true,
        data: {
          analysis_id: analysisId,
          questions: responseQuestions,
          metadata: responseMetadata,
          generated: true,
          refresh_requested: refresh === 'true',
          new_questions_count: questionData.questions.length,
          total_questions_count: allQuestions.length
        }
      });
    } catch (llmError) {
      console.error(`LLM failed to generate questions for analysis ${analysisId}:`, llmError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to generate interview questions',
        error: llmError.message
      });
    }

  } catch (error) {
    console.error('[INTERVIEW][QUESTIONS][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating interview questions'
    });
  }
};

// POST /api/analysis/{analysisId}/questions/{questionId}/answer
exports.submitAnswer = async (req, res) => {
  try {
    const { analysisId, questionId } = req.params;
    const { answer, submitted_at } = req.body;
    const userId = req.user ? req.user.id : null;

    // Validate input
    if (!answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required'
      });
    }

    if (!submitted_at) {
      return res.status(400).json({
        success: false,
        message: 'submitted_at timestamp is required'
      });
    }

    // Check if analysis exists
    const analysisEvent = await AnalysisEvent.findOne({ analysisId });
    
    if (!analysisEvent) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Check if questions exist for this analysis
    if (!analysisEvent.interviewQuestions || !analysisEvent.interviewQuestions.questions.length) {
      return res.status(404).json({
        success: false,
        message: 'Interview questions not found for this analysis'
      });
    }

    // Find the specific question
    const question = analysisEvent.interviewQuestions.questions.find(q => q.id === questionId);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Score the answer using LLM
    let scoreData;
    try {
      scoreData = await llmService.scoreAnswer(question.question, answer);
    } catch (llmError) {
      console.error(`LLM failed to score answer for question ${questionId}:`, llmError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to score answer',
        error: llmError.message
      });
    }

    // Check if answer already exists in AnalysisEvent
    const existingAnswerIndex = analysisEvent.interviewAnswers.findIndex(a => a.questionId === questionId);
    
    const answerData = {
      questionId,
      answer: answer.trim(),
      score: scoreData,
      submitted_at: new Date(submitted_at),
      scored_at: new Date()
    };
    
    let savedAnswer;
    
    if (existingAnswerIndex >= 0) {
      // Update existing answer in AnalysisEvent
      analysisEvent.interviewAnswers[existingAnswerIndex] = answerData;
      savedAnswer = await analysisEvent.save();
    } else {
      // Add new answer to AnalysisEvent
      analysisEvent.interviewAnswers.push(answerData);
      savedAnswer = await analysisEvent.save();
    }

    // Find the saved answer from the updated analysis event
    const savedAnswerData = savedAnswer.interviewAnswers.find(a => a.questionId === questionId);
    
    res.status(200).json({
      success: true,
      data: {
        question_id: questionId,
        analysis_id: analysisId,
        score: savedAnswerData.score,
        submitted_at: savedAnswerData.submitted_at,
        scored_at: savedAnswerData.scored_at
      }
    });

  } catch (error) {
    console.error('[INTERVIEW][ANSWER][ERROR]', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting answer'
    });
  }
};

// GET /api/analysis/{analysisId}/questions/{questionId}/answer (bonus endpoint for getting existing answers)
exports.getAnswer = async (req, res) => {
  try {
    const { analysisId, questionId } = req.params;

    const analysisEvent = await AnalysisEvent.findOne({ analysisId });
    
    if (!analysisEvent) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const answer = analysisEvent.interviewAnswers.find(a => a.questionId === questionId);
    
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        question_id: questionId,
        analysis_id: analysisId,
        answer: answer.answer,
        score: answer.score,
        submitted_at: answer.submitted_at,
        scored_at: answer.scored_at
      }
    });

  } catch (error) {
    console.error('[INTERVIEW][GET_ANSWER][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /api/analysis/{analysisId}/answers (bonus endpoint for getting all answers for an analysis)
exports.getAllAnswers = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysisEvent = await AnalysisEvent.findOne({ analysisId });
    
    if (!analysisEvent) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const answers = analysisEvent.interviewAnswers || [];

    res.status(200).json({
      success: true,
      data: {
        analysis_id: analysisId,
        answers: answers.map(answer => ({
          question_id: answer.questionId,
          answer: answer.answer,
          score: answer.score,
          submitted_at: answer.submitted_at,
          scored_at: answer.scored_at
        })),
        total_answers: answers.length
      }
    });

  } catch (error) {
    console.error('[INTERVIEW][GET_ALL_ANSWERS][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
