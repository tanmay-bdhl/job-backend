const User = require('../models/User');

const FREQUENCY_ENUM = ["daily", "weekly once", "monthly",'once in two weeks'];
const CHANNEL_ENUM = ["Whatsapp", "Email"];
const COMPANY_SIZE_ENUM = ["1-10", "11-50", "51-200", "201-500", "500+"];
const LOCATION_ENUM = ["Onsite", "Remote", "Hybrid"];

exports.jobPreferences = async (req, res) => {
  const userId = req.user?.id;
  const { frequency, channel, companySize, location } = req.body;

  if (!FREQUENCY_ENUM.includes(frequency)) {
    return res.status(400).json({ message: 'Invalid frequency' });
  }
  if (!Array.isArray(channel) || channel.some(c => !CHANNEL_ENUM.includes(c))) {
    return res.status(400).json({ message: 'Invalid channel' });
  }
  if (!Array.isArray(companySize) || companySize.some(c => !COMPANY_SIZE_ENUM.includes(c))) {
    return res.status(400).json({ message: 'Invalid companySize' });
  }
  if (!Array.isArray(location) || location.some(l => !LOCATION_ENUM.includes(l))) {
    return res.status(400).json({ message: 'Invalid location' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { jobPreferences: { frequency, channel, companySize, location } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ success: true, jobPreferences: user.jobPreferences });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getJobPreferences = async (req, res) => {
  const userId = req.user?.id;
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}; 