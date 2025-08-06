const { notificationQueue } = require('../config/queue');

/**
 * Add notification to queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addNotification = async (req, res) => {
  try {
    const { userId, channels, message } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'channels must be a non-empty array',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }

    // Add job to queue
    const job = await notificationQueue.add(
      'sendNotification',
      {
        userId,
        channels,
        message,
        timestamp: new Date().toISOString(),
      },
      {
        // Override default options if needed
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Notification added to queue successfully',
      jobId: job.id,
      data: {
        userId,
        channels,
        message,
      },
    });
  } catch (error) {
    console.error('Error adding notification to queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add notification to queue',
      error: error.message,
    });
  }
}; 