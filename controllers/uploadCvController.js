const User = require('../models/User');

exports.uploadCv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file is not a PDF' });
  }
  // TODO: Upload file to S3
  // const s3Url = await uploadToS3(req.file);
  const s3Url = 'https://mock-s3-bucket.amazonaws.com/' + req.file.originalname; // mock value
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