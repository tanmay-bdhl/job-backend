/**
 * WhatsApp Channel Module
 * 
 * Currently using mock implementation for development.
 * Future integrations: Gupshup, 360dialog, Twilio WhatsApp API
 */

class WhatsAppChannel {
  constructor(config = {}) {
    this.config = {
      provider: 'mock', // 'gupshup', '360dialog', 'twilio'
      apiKey: config.apiKey || process.env.WHATSAPP_API_KEY,
      apiUrl: config.apiUrl || process.env.WHATSAPP_API_URL,
      fromNumber: config.fromNumber || process.env.WHATSAPP_FROM_NUMBER,
      appName: config.appName || process.env.WHATSAPP_APP_NAME || 'JobBackend',
      ...config
    };
    
    console.log(`📱 WhatsAppChannel initialized with provider: ${this.config.provider}`);
  }

  /**
   * Send WhatsApp notification
   * @param {string} userId - The user ID to send WhatsApp message to
   * @param {string} message - The message content
   * @param {Object} options - Additional options (template, media, etc.)
   */
  async send(userId, message, options = {}) {
    try {
      // Get user phone number (in real implementation, fetch from database)
      const userPhone = await this.getUserPhone(userId);
      
      const whatsappData = {
        to: userPhone,
        from: this.config.fromNumber,
        message: message,
        type: options.type || 'text', // 'text', 'template', 'media'
        template: options.template || null,
        media: options.media || null,
        ...options
      };

      // Route to appropriate provider
      switch (this.config.provider) {
        case 'gupshup':
          return await this.sendWithGupshup(whatsappData);
        case '360dialog':
          return await this.sendWith360Dialog(whatsappData);
        case 'twilio':
          return await this.sendWithTwilio(whatsappData);
        default:
          return await this.sendMock(whatsappData);
      }
    } catch (error) {
      console.error(`❌ WhatsAppChannel: Failed to send WhatsApp to user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Mock implementation for development
   */
  async sendMock(whatsappData) {
    console.log('📱 [MOCK] WhatsApp sent:');
    console.log(`   To: ${whatsappData.to}`);
    console.log(`   From: ${whatsappData.from || 'Job Backend'}`);
    console.log(`   Type: ${whatsappData.type}`);
    console.log(`   Message: ${whatsappData.message}`);
    if (whatsappData.template) {
      console.log(`   Template: ${whatsappData.template}`);
    }
    if (whatsappData.media) {
      console.log(`   Media: ${whatsappData.media}`);
    }
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return {
      success: true,
      provider: 'mock',
      messageId: `wa_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gupshup integration (future implementation)
   */
  async sendWithGupshup(whatsappData) {
    // TODO: Implement Gupshup integration
    // const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', {
    //   channel: 'whatsapp',
    //   source: this.config.fromNumber,
    //   destination: whatsappData.to,
    //   message: { type: 'text', text: whatsappData.message },
    //   'src.name': this.config.appName
    // }, {
    //   headers: {
    //     'apikey': this.config.apiKey,
    //     'Content-Type': 'application/x-www-form-urlencoded'
    //   }
    // });
    
    console.log('📱 [GUPSHUP] Would send WhatsApp with Gupshup API');
    return await this.sendMock(whatsappData);
  }

  /**
   * 360dialog integration (future implementation)
   */
  async sendWith360Dialog(whatsappData) {
    // TODO: Implement 360dialog integration
    // const response = await axios.post(`${this.config.apiUrl}/messages`, {
    //   to: whatsappData.to,
    //   type: 'text',
    //   text: { body: whatsappData.message }
    // }, {
    //   headers: {
    //     'D360-API-KEY': this.config.apiKey,
    //     'Content-Type': 'application/json'
    //   }
    // });
    
    console.log('📱 [360DIALOG] Would send WhatsApp with 360dialog API');
    return await this.sendMock(whatsappData);
  }

  /**
   * Twilio WhatsApp integration (future implementation)
   */
  async sendWithTwilio(whatsappData) {
    // TODO: Implement Twilio WhatsApp integration
    // const client = require('twilio')(accountSid, authToken);
    // const message = await client.messages.create({
    //   body: whatsappData.message,
    //   from: `whatsapp:${this.config.fromNumber}`,
    //   to: `whatsapp:${whatsappData.to}`
    // });
    
    console.log('📱 [TWILIO] Would send WhatsApp with Twilio API');
    return await this.sendMock(whatsappData);
  }

  /**
   * Send template message (for future use)
   */
  async sendTemplate(userId, templateName, parameters = [], options = {}) {
    return await this.send(userId, '', {
      type: 'template',
      template: templateName,
      parameters: parameters,
      ...options
    });
  }

  /**
   * Send media message (for future use)
   */
  async sendMedia(userId, mediaUrl, caption = '', options = {}) {
    return await this.send(userId, caption, {
      type: 'media',
      media: mediaUrl,
      ...options
    });
  }

  /**
   * Get user phone number by userId
   * Mock implementation - in real app, fetch from database
   */
  async getUserPhone(userId) {
    // TODO: Replace with actual database lookup
    // const user = await User.findById(userId);
    // return user.phone;
    
    // Return mock phone number with country code
    return `+1555000${userId.slice(-4)}`;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone) {
    // Basic validation - starts with + and contains only digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate WhatsApp configuration
   */
  validateConfig() {
    if (this.config.provider !== 'mock') {
      if (!this.config.apiKey) {
        throw new Error(`WhatsAppChannel: apiKey is required for provider ${this.config.provider}`);
      }
      
      if (!this.config.fromNumber) {
        throw new Error('WhatsAppChannel: fromNumber is required');
      }
      
      if (!this.validatePhoneNumber(this.config.fromNumber)) {
        throw new Error('WhatsAppChannel: fromNumber must be a valid phone number with country code');
      }
    }
    
    return true;
  }
}

module.exports = WhatsAppChannel; 