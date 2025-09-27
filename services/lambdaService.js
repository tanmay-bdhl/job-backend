const axios = require('axios');

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

async function triggerLambdaAnalysis({ analysisId, fileUrl, fileName, userId, jobDescription = null }) {
  const lambdaEndpoint = getEnv('LAMBDA_ATS_ENDPOINT', 'https://x6mxdypopf.execute-api.ap-south-1.amazonaws.com/default/resume-ats');
  
  const payload = {
    analysisId,
    fileUrl,
    fileName,
    userId: userId || 'anonymous',
    jobDescription: jobDescription || 'General software development position requiring technical skills',
    timestamp: new Date().toISOString()
  };

  try {
    console.log(`[LAMBDA] Triggering ATS analysis for: ${analysisId}`);

    const response = await axios.post(lambdaEndpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 
    });
    if (response.status === 200) {
      console.log(`[LAMBDA] Successfully completed ATS analysis for ${analysisId}`);
      
      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        lambdaTriggered: true
      };
    } else {
      throw new Error(`Lambda endpoint returned status code: ${response.status}`);
    }
  } catch (error) {
    console.error('[LAMBDA][ERROR] Failed to trigger ATS analysis:', error.message);
    
    if (error.response) {
      console.error('[LAMBDA][ERROR] Response status:', error.response.status);
      console.error('[LAMBDA][ERROR] Response data:', error.response.data);
    }
    
    return {
      success: false,
      error: error.message,
      lambdaTriggered: false
    };
  }
}

module.exports = {
  triggerLambdaAnalysis
};
