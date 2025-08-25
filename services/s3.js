const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function buildS3Client() {
  const region = getEnv('AWS_REGION', getEnv('AWS_DEFAULT_REGION', undefined));
  const accessKeyId = getEnv('AWS_ACCESS_KEY_ID', undefined);
  const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY', undefined);

  if (!region || !accessKeyId || !secretAccessKey) {
    return null; // Not configured; caller should handle fallback
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadBufferToS3({ buffer, contentType, bucket, keyPrefix = 'resumes/', filenameHint }) {
  const s3 = buildS3Client();
  if (!s3) {
    throw new Error('S3 is not configured');
  }
  if (!bucket) {
    throw new Error('S3 bucket is required');
  }
  const safeName = (filenameHint || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const random = crypto.randomBytes(8).toString('hex');
  const key = `${keyPrefix}${Date.now()}_${random}_${safeName}`;

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });
  await s3.send(cmd);
  const url = `https://${bucket}.s3.${getEnv('AWS_REGION', getEnv('AWS_DEFAULT_REGION', ''))}.amazonaws.com/${encodeURIComponent(key)}`;
  return { key, url };
}

module.exports = {
  uploadBufferToS3,
};


