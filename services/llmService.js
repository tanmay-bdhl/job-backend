const axios = require('axios');
const { llmConfig } = require('../config/llm');

class LLMService {
  constructor() {
    this.config = llmConfig;
    
    // Validate configuration on startup
    const validation = this.config.validateConfiguration();
    if (!validation.isValid) {
      console.warn('⚠️  LLM Service Configuration Issues:');
      validation.issues.forEach(issue => console.warn(`   - ${issue}`));
    }
  }

  async generateInterviewQuestions(extractedSections) {
    try {
      // Check if LLM is configured
      if (!this.config.config.isConfigured) {
        throw new Error(`LLM not configured. Please set ${this.config.config.providerName} API key.`);
      }

      const prompt = this._createQuestionGenerationPrompt(extractedSections);
      
      const requestBody = {
        model: this.config.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer. Generate personalized interview questions based on the candidate\'s resume content. Return ONLY valid JSON without any markdown formatting or additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: Math.min(2000, this.config.config.maxTokens)
      };

      const response = await axios.post(this.config.config.apiUrl, requestBody, {
        headers: this.config.config.headers
      });

      const content = response.data.choices[0].message.content.trim();
      
      // Clean up any markdown formatting if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const questionData = JSON.parse(cleanedContent);
      
      // Generate unique IDs for questions
      const timestamp = Date.now();
      questionData.questions = questionData.questions.map((question, index) => ({
        ...question,
        id: `q_${timestamp}_${index + 1}`
      }));
      
      return questionData;
    } catch (error) {
      console.error(`Error generating interview questions:`, error.message);
      throw new Error(`Failed to generate interview questions: ${error.message}`);
    }
  }

  async scoreAnswer(question, answer, expectedCriteria = null) {
    try {
      // Check if LLM is configured
      if (!this.config.config.isConfigured) {
        throw new Error(`LLM not configured. Please set ${this.config.config.providerName} API key.`);
      }

      const prompt = this._createScoringPrompt(question, answer, expectedCriteria);
      
      const requestBody = {
        model: this.config.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer. Score the candidate\'s answer objectively and provide constructive feedback. Return ONLY valid JSON without any markdown formatting or additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: Math.min(1000, this.config.config.maxTokens)
      };

      const response = await axios.post(this.config.config.apiUrl, requestBody, {
        headers: this.config.config.headers
      });

      const content = response.data.choices[0].message.content.trim();
      
      // Clean up any markdown formatting if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error(`Error scoring answer:`, error.message);
      throw new Error(`Failed to score answer: ${error.message}`);
    }
  }

  // Method to switch LLM provider
  switchProvider(provider, model = null) {
    try {
      this.config.switchProvider(provider, model);
      return this.config.config;
    } catch (error) {
      console.error(`Failed to switch LLM provider:`, error.message);
      throw error;
    }
  }

  // Method to get current configuration
  getCurrentConfig() {
    return {
      provider: this.config.config.provider,
      providerName: this.config.config.providerName,
      model: this.config.config.model,
      isConfigured: this.config.config.isConfigured,
      maxTokens: this.config.config.maxTokens,
      contextWindow: this.config.config.contextWindow
    };
  }

  // Method to list available providers
  getAvailableProviders() {
    return this.config.listAvailableProviders();
  }

  _createQuestionGenerationPrompt(extractedSections) {
    return `Based on the following resume sections, generate 4 personalized interview questions. Each question should be relevant to the candidate's specific experience and skills.

Resume Content:
${JSON.stringify(extractedSections, null, 2)}

Generate questions in this EXACT JSON format:
{
  "questions": [
    {
      "id": "q1",
      "category": "Technical Skills",
      "difficulty": "Medium",
      "question": "How do you optimize React performance?",
      "time_estimate": "3-5 minutes",
      "tags": ["React", "JavaScript", "Frontend", "Component Architecture"],
      "ai_answer": "Use React.memo, useMemo, useCallback, code splitting, lazy loading, and avoid unnecessary re-renders."
    }
  ],
  "metadata": {
    "total_questions": 4,
    "total_time": 20,
    "difficulty_distribution": {
      "Easy": 0,
      "Medium": 2,
      "Hard": 2
    },
    "categories": ["Technical Skills", "Problem Solving", "Leadership", "System Design"]
  }
}

Requirements:
- Make questions specific to their actual experience
- Include a mix of difficulty levels
- Vary question categories
- Provide realistic time estimates
- Generate helpful AI answers that demonstrate good responses
- Tags should be specific technologies, frameworks, or concepts mentioned in the question (e.g., "React", "Node.js", "Database Design", "API Development", "Microservices", "AWS", "Docker", etc.)
- Avoid generic tags like "relevant", "skills", "from", "resume"
- Keep questions concise and under 25 words
- Keep AI answers concise and under 25 words
- Focus on key points and essential information only`;
  }

  _createScoringPrompt(question, answer, expectedCriteria) {
    return `Score this interview answer on a scale of 0-100 for each criteria:

Question: ${question}
Answer: ${answer}

Provide scoring in this EXACT JSON format:
{
  "overall_score": 85,
  "breakdown": {
    "technical_accuracy": 90,
    "completeness": 80,
    "clarity": 85,
    "relevance": 85
  },
  "feedback": "Detailed constructive feedback explaining the score and suggestions for improvement"
}

Scoring Guidelines:
- Technical Accuracy: How technically correct is the answer?
- Completeness: How thoroughly does it address the question?
- Clarity: How well is it communicated?
- Relevance: How relevant is the answer to the question?`;
  }

}

module.exports = new LLMService();
