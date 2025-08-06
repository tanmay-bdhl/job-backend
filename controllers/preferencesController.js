const JobPreference = require('../models/JobPreference');

exports.savePreferences = async (req, res, next) => {
  try {
    const { skills, location, jobType } = req.body;
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }
    const pref = await JobPreference.findOneAndUpdate(
      { userId: req.user.userId },
      { skills, location, jobType },
      { new: true, upsert: true }
    );
    res.status(200).json({ message: 'Preferences saved', preferences: pref });
  } catch (err) {
    next(err);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const pref = await JobPreference.findOne({ userId: req.user.userId });
    if (!pref) {
      return res.status(404).json({ message: 'Preferences not found' });
    }
    res.status(200).json({ preferences: pref });
  } catch (err) {
    next(err);
  }
}; 