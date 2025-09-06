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
    console.log(`[LAMBDA] Endpoint: ${lambdaEndpoint}`);
    console.log(`[LAMBDA] Payload:`, {
      analysisId: payload.analysisId,
      fileName: payload.fileName,
      userId: payload.userId,
      hasJobDescription: !!payload.jobDescription,
      fileUrlLength: payload.fileUrl.length
    });

    const response = await axios.post(lambdaEndpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 
    });
    console.log("lambda respose>>>>>>>", response?.data)
    if (response.status === 200) {
      console.log(`[LAMBDA] Successfully completed ATS analysis for ${analysisId}`);
      console.log(`[LAMBDA] Response status: ${response.status}`);
      console.log(`[LAMBDA] Response data structure:`, {
        hasStatus: !!response.data?.status,
        hasResults: !!response.data?.results,
        hasError: !!response.data?.error,
        status: response.data?.status,
        dataKeys: Object.keys(response.data || {})
      });
      
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
