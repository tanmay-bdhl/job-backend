
class WhatsAppChannel {
  constructor(config = {}) {
    this.config = {
      provider: 'mock', 
      apiKey: config.apiKey || process.env.WHATSAPP_API_KEY,
      apiUrl: config.apiUrl || process.env.WHATSAPP_API_URL,
      fromNumber: config.fromNumber || process.env.WHATSAPP_FROM_NUMBER,
      appName: config.appName || process.env.WHATSAPP_APP_NAME || 'JobBackend',
      ...config
    };
    
    console.log(`📱 WhatsAppChannel initialized with provider: ${this.config.provider}`);
  }

  async send(userId, message, options = {}) {
    try {
      const userPhone = await this.getUserPhone(userId);
      
      const whatsappData = {
        to: userPhone,
        from: this.config.fromNumber,
        message: message,
        type: options.type || 'text', 
        template: options.template || null,
        media: options.media || null,
        ...options
      };

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
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return {
      success: true,
      provider: 'mock',
      messageId: `wa_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  }

  async sendWithGupshup(whatsappData) {
    
    console.log('📱 [GUPSHUP] Would send WhatsApp with Gupshup API');
    return await this.sendMock(whatsappData);
  }

  async sendWith360Dialog(whatsappData) {
    
    console.log('📱 [360DIALOG] Would send WhatsApp with 360dialog API');
    return await this.sendMock(whatsappData);
  }

  async sendWithTwilio(whatsappData) {
    
    console.log('📱 [TWILIO] Would send WhatsApp with Twilio API');
    return await this.sendMock(whatsappData);
  }

  async sendTemplate(userId, templateName, parameters = [], options = {}) {
    return await this.send(userId, '', {
      type: 'template',
      template: templateName,
      parameters: parameters,
      ...options
    });
  }

  async sendMedia(userId, mediaUrl, caption = '', options = {}) {
    return await this.send(userId, caption, {
      type: 'media',
      media: mediaUrl,
      ...options
    });
  }

  async getUserPhone(userId) {
    
    return `+1555000${userId.slice(-4)}`;
  }

  validatePhoneNumber(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

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