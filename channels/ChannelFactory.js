
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

  getChannel(channelType) {
    const normalizedType = channelType.toLowerCase();
    
    if (this.channels.has(normalizedType)) {
      return this.channels.get(normalizedType);
    }

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

    this.channels.set(normalizedType, channel);
    return channel;
  }

  async send(channelType, userId, message, options = {}) {
    const channel = this.getChannel(channelType);
    return await channel.send(userId, message, options);
  }

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

  getAvailableChannels() {
    return ['email', 'whatsapp', 'sms', 'push'];
  }

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

    results.sms = { valid: true };
    results.push = { valid: true };

    return results;
  }

  reset() {
    this.channels.clear();
  }
}

const channelFactory = new ChannelFactory();

module.exports = channelFactory; 