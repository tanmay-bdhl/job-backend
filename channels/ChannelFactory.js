/**
 * Channel Factory
 * 
 * Centralized factory for creating and managing notification channels
 */

const EmailChannel = require('./EmailChannel');
const WhatsAppChannel = require('./WhatsAppChannel');

class ChannelFactory {
  constructor() {
    this.channels = new Map();
    this.config = {
      email: {
        provider: process.env.EMAIL_PROVIDER || 'mock',
        apiKey: process.env.EMAIL_API_KEY,
        fromEmail: process.env.FROM_EMAIL,
        fromName: process.env.FROM_NAME
      },
      whatsapp: {
        provider: process.env.WHATSAPP_PROVIDER || 'mock',
        apiKey: process.env.WHATSAPP_API_KEY,
        apiUrl: process.env.WHATSAPP_API_URL,
        fromNumber: process.env.WHATSAPP_FROM_NUMBER,
        appName: process.env.WHATSAPP_APP_NAME
      },
      sms: {
        provider: process.env.SMS_PROVIDER || 'mock',
        apiKey: process.env.SMS_API_KEY,
        fromNumber: process.env.SMS_FROM_NUMBER
      },
      push: {
        provider: process.env.PUSH_PROVIDER || 'mock',
        apiKey: process.env.PUSH_API_KEY,
        appId: process.env.PUSH_APP_ID
      }
    };
  }

  /**
   * Get or create a channel instance
   * @param {string} channelType - The type of channel (email, whatsapp, sms, push)
   * @returns {Object} Channel instance
   */
  getChannel(channelType) {
    const normalizedType = channelType.toLowerCase();
    
    // Return cached instance if exists
    if (this.channels.has(normalizedType)) {
      return this.channels.get(normalizedType);
    }

    // Create new channel instance
    let channel;
    switch (normalizedType) {
      case 'email':
        channel = new EmailChannel(this.config.email);
        break;
        
      case 'whatsapp':
        channel = new WhatsAppChannel(this.config.whatsapp);
        break;
        
      case 'sms':
        channel = this.createSMSChannel();
        break;
        
      case 'push':
        channel = this.createPushChannel();
        break;
        
      default:
        throw new Error(`Unknown channel type: ${channelType}`);
    }

    // Cache and return
    this.channels.set(normalizedType, channel);
    return channel;
  }

  /**
   * Send notification through specified channel
   * @param {string} channelType - The channel type (email, whatsapp, sms, push)
   * @param {string} userId - The user ID
   * @param {string} message - The message content
   * @param {Object} options - Additional options
   */
  async send(channelType, userId, message, options = {}) {
    const channel = this.getChannel(channelType);
    return await channel.send(userId, message, options);
  }

  /**
   * Send notification to multiple channels
   * @param {Array} channels - Array of channel types
   * @param {string} userId - The user ID
   * @param {string} message - The message content
   * @param {Object} options - Additional options
   */
  async sendMultiple(channels, userId, message, options = {}) {
    const results = [];
    
    for (const channelType of channels) {
      try {
        const result = await this.send(channelType, userId, message, options);
        results.push({
          channel: channelType,
          success: true,
          result: result
        });
      } catch (error) {
        console.error(`Failed to send ${channelType} notification:`, error.message);
        results.push({
          channel: channelType,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Create SMS channel (placeholder for future implementation)
   */
  createSMSChannel() {
    return {
      send: async (userId, message, options = {}) => {
        console.log(`📱 [MOCK] SMS sent to user ${userId}: ${message}`);
        return {
          success: true,
          provider: 'mock',
          messageId: `sms_mock_${Date.now()}`,
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  /**
   * Create Push notification channel (placeholder for future implementation)
   */
  createPushChannel() {
    return {
      send: async (userId, message, options = {}) => {
        console.log(`🔔 [MOCK] Push notification sent to user ${userId}: ${message}`);
        return {
          success: true,
          provider: 'mock',
          messageId: `push_mock_${Date.now()}`,
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  /**
   * Get list of available channels
   */
  getAvailableChannels() {
    return ['email', 'whatsapp', 'sms', 'push'];
  }

  /**
   * Validate all channel configurations
   */
  validateConfigurations() {
    const results = {};
    
    try {
      const emailChannel = this.getChannel('email');
      emailChannel.validateConfig();
      results.email = { valid: true };
    } catch (error) {
      results.email = { valid: false, error: error.message };
    }

    try {
      const whatsappChannel = this.getChannel('whatsapp');
      whatsappChannel.validateConfig();
      results.whatsapp = { valid: true };
    } catch (error) {
      results.whatsapp = { valid: false, error: error.message };
    }

    // SMS and Push are always valid in mock mode
    results.sms = { valid: true };
    results.push = { valid: true };

    return results;
  }

  /**
   * Reset channels (useful for testing)
   */
  reset() {
    this.channels.clear();
  }
}

// Create singleton instance
const channelFactory = new ChannelFactory();

module.exports = channelFactory; 