const multer = require('multer');
const { uploadBufferToS3 } = require('./s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`), false);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

function generateAnalysisId() {
  return `analysis_${uuidv4()}`;
}

async function uploadResumeFile(file) {
  const analysisId = generateAnalysisId();
  
  if (!process.env.AWS_ACCESS_KEY_ID || 
      !process.env.AWS_SECRET_ACCESS_KEY || 
      (!process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION) || 
      !process.env.S3_BUCKET) {
    throw new Error('S3 configuration is missing. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET environment variables.');
  }
  
  try {
    const { url, key } = await uploadBufferToS3({
      buffer: file.buffer,
      contentType: file.mimetype,
      bucket: process.env.S3_BUCKET,
      keyPrefix: 'analysis/',
      filenameHint: `${analysisId}_${file.originalname}`
    });
    
    return {
      analysisId,
      fileUrl: url,
      fileName: file.originalname,
      fileSize: file.size,
      storageType: 's3',
      storageKey: key
    };
  } catch (error) {
    console.error('[UPLOAD][ERROR]', error.message);
    
    if (error.message.includes('S3 is not configured')) {
      throw new Error('S3 service is not properly configured. Please check your AWS credentials and region settings.');
    } else if (error.message.includes('S3 bucket is required')) {
      throw new Error('S3 bucket is not configured. Please set the S3_BUCKET environment variable.');
    } else if (error.message.includes('Access Denied') || error.message.includes('Forbidden')) {
      throw new Error('Access denied to S3 bucket. Please check your AWS credentials and bucket permissions.');
    } else if (error.message.includes('NoSuchBucket')) {
      throw new Error('S3 bucket does not exist. Please check your S3_BUCKET environment variable.');
    } else if (error.message.includes('InvalidAccessKeyId')) {
      throw new Error('Invalid AWS access key. Please check your AWS_ACCESS_KEY_ID environment variable.');
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      throw new Error('Invalid AWS secret key. Please check your AWS_SECRET_ACCESS_KEY environment variable.');
    } else {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }
}

function validateFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid MIME type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`);
  }

  return true;
}

module.exports = {
  upload,
  uploadResumeFile,
  validateFile,
  generateAnalysisId,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES
};
