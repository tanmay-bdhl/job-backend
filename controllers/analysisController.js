const AnalysisEvent = require('../models/AnalysisEvent');
const { uploadResumeFile, validateFile } = require('../services/analysisUploadService');
const { triggerLambdaAnalysis } = require('../services/lambdaService');
const websocketService = require('../services/websocketService');


async function startRealATSAnalysis(analysisId, fileUrl, fileName, userId, jobDescription = null) {
  try {
    console.log(`🚀 Starting real ATS analysis for: ${analysisId}`);
    
    const lambdaResult = await triggerLambdaAnalysis({
      analysisId,
      fileUrl,
      fileName,
      userId,
      jobDescription
    });

    if (lambdaResult.success) {
      console.log(`✅ Lambda analysis triggered successfully for: ${analysisId}`);
      console.log(`📊 Lambda response:`, {
        hasResults: !!lambdaResult.data?.results,
        status: lambdaResult.data?.status,
        analysisId: lambdaResult.data?.analysisId
      });
      
      // Update database with completed status and results
      await AnalysisEvent.findOneAndUpdate(
        { analysisId },
        { 
          status: 'completed',
          currentStage: 'completed',
          progress: 100,
          results: lambdaResult.data,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      // Broadcast Lambda response via websocket
      websocketService.broadcastStatusUpdate(analysisId, {
        status: 'completed',
        progress: 100,
        currentStage: 'completed',
        results: lambdaResult.data
      });

      console.log(`Analysis completed and database updated for: ${analysisId}`);
      
    } else {
      console.error(`Lambda failed for: ${analysisId}`, lambdaResult.error);
      
      await AnalysisEvent.findOneAndUpdate(
        { analysisId },
        { 
          status: 'error',
          currentStage: 'error',
          progress: 0,
          error: `Lambda ATS analysis failed: ${lambdaResult.error}`,
          updatedAt: new Date()
        }
      );

      websocketService.broadcastStatusUpdate(analysisId, {
        status: 'error',
        progress: 0,
        currentStage: 'error',
        error: lambdaResult.error
      });
    }
    
  } catch (error) {
    console.error(`Error in ATS analysis for ${analysisId}:`, error.message);
    
    try {
      await AnalysisEvent.findOneAndUpdate(
        { analysisId },
        { 
          status: 'error',
          currentStage: 'error',
          progress: 0,
          error: `ATS analysis failed: ${error.message}`,
          updatedAt: new Date()
        }
      );

      websocketService.broadcastStatusUpdate(analysisId, {
        status: 'error',
        progress: 0,
        currentStage: 'error',
        error: error.message
      });
    } catch (updateError) {
      console.error(`Failed to update error status for ${analysisId}:`, updateError.message);
    }
  }
}


exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    validateFile(req.file);

    const userId = req.user ? req.user.id : null;
    
    const jobDescription = req.body.jobDescription || null;

    const uploadResult = await uploadResumeFile(req.file);

    let analysisEvent = null;
    try {
      analysisEvent = new AnalysisEvent({
        analysisId: uploadResult.analysisId,
        userId: userId,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        fileUrl: uploadResult.fileUrl,
        status: 'queued',
        currentStage: 'queued',
        progress: 10
      });

      await analysisEvent.save();
      console.log(`[ANALYSIS] Created analysis event: ${uploadResult.analysisId}`);
      console.log(`[ANALYSIS] File URL: ${uploadResult.fileUrl}`);
      console.log(`[ANALYSIS] User ID: ${userId || 'anonymous'}`);
      console.log(`[ANALYSIS] Job Description: ${jobDescription ? 'provided' : 'none'}`);
      
      websocketService.broadcastStatusUpdate(uploadResult.analysisId, {
        status: 'queued',
        progress: 10,
        currentStage: 'queued'
      });
      console.log(`[ANALYSIS] Broadcasted initial status for: ${uploadResult.analysisId}`);
      
      startRealATSAnalysis(
        uploadResult.analysisId,
        uploadResult.fileUrl,
        uploadResult.fileName,
        userId,
        jobDescription
      );
      
    } catch (mongoError) {
      console.warn('[ANALYSIS] MongoDB save failed, continuing without database:', mongoError.message);
    }

    res.status(200).json({
      success: true,
      analysisId: uploadResult.analysisId,
      status: 'queued',
      message: analysisEvent ? 'Real ATS analysis started with AWS Lambda' : 'File uploaded successfully (database not available)',
      fileUrl: uploadResult.fileUrl,
      hasJobDescription: !!jobDescription
    });

  } catch (error) {
    console.error('[ANALYSIS][UPLOAD][ERROR]', error.message);
    
    if (error.message.includes('Invalid file') || 
        error.message.includes('File too large') || 
        error.message.includes('No file provided')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during file upload'
    });
  }
};

exports.getAnalysisStatus = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysisEvent = await AnalysisEvent.findOne({ analysisId });

    if (!analysisEvent) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    res.status(200).json({
      success: true,
      analysisId: analysisEvent.analysisId,
      status: analysisEvent.status,
      progress: analysisEvent.progress,
      currentStage: analysisEvent.currentStage,
      updatedAt: analysisEvent.updatedAt,
      error: analysisEvent.error
    });

  } catch (error) {
    console.error('[ANALYSIS][STATUS][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getAnalysisResults = async (req, res) => {
  try {
    const { analysisId } = req.params;

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

    res.status(200).json({
      success: true,
      analysisId: analysisEvent.analysisId,
      results: analysisEvent.results,
      completedAt: analysisEvent.completedAt,
      status: analysisEvent.status
    });

  } catch (error) {
    console.error('[ANALYSIS][RESULTS][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.cancelAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysisEvent = await AnalysisEvent.findOne({ analysisId });

    if (!analysisEvent) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    if (analysisEvent.status === 'completed' || analysisEvent.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel analysis. Current status: ${analysisEvent.status}`
      });
    }

    await AnalysisEvent.findOneAndUpdate(
      { analysisId },
      { 
        status: 'cancelled',
        currentStage: 'cancelled',
        updatedAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'Analysis cancelled'
    });

  } catch (error) {
    console.error('[ANALYSIS][CANCEL][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getUserAnalyses = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const analyses = await AnalysisEvent.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-results') 
      .limit(50); 

    res.status(200).json({
      success: true,
      analyses
    });

  } catch (error) {
    console.error('[ANALYSIS][HISTORY][ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
