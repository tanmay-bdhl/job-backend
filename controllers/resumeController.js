const Resume = require('../models/Resume');

exports.saveResume = async (req, res, next) => {
  try {
    const { s3Url } = req.body;
    if (!s3Url) {
      return res.status(400).json({ message: 's3Url is required' });
    }
    const resume = await Resume.create({
      userId: req.user.userId,
      s3Url,
    });
    res.status(201).json({ message: 'Resume saved', resume });
  } catch (err) {
    next(err);
  }
}; 