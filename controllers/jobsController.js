const JobNotificationLog = require('../models/JobNotificationLog');

exports.getJobHistory = async (req, res, next) => {
  try {
    const logs = await JobNotificationLog.find({ userId: req.user.userId }).sort({ notifiedAt: -1 });
    if (!logs.length) {
      return res.status(404).json({ message: 'No job notifications found' });
    }
    res.status(200).json({ history: logs });
  } catch (err) {
    next(err);
  }
}; 