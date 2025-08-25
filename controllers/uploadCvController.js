const User = require('../models/User');
const { uploadBufferToS3 } = require('../services/s3');

exports.uploadCv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file is not a PDF' });
  }
  // Upload file to S3 if S3 is configured; otherwise keep mock URL
  let s3Url = 'https://mock-s3-bucket.amazonaws.com/' + req.file.originalname;
  try {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) && process.env.S3_BUCKET) {
      const { url } = await uploadBufferToS3({
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
        bucket: process.env.S3_BUCKET || 'jobs-resume-bucket-levi',
        keyPrefix: 'resumes/',
        filenameHint: req.file.originalname,
      });
      s3Url = url;
    }
  } catch (e) {
    console.error('[UPLOAD][S3][ERR]', e.message);
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        resumeName: req.file.originalname,
        s3Location: s3Url
      },
      { new: true }
    ).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ success: true, resumeName: user.resumeName, s3Location: user.s3Location });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}; 