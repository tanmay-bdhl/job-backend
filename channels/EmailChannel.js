
class EmailChannel {
  constructor(config = {}) {
    this.config = {
      provider: 'mock', 
      apiKey: config.apiKey || process.env.EMAIL_API_KEY,
      fromEmail: config.fromEmail || process.env.FROM_EMAIL || 'noreply@example.com',
      fromName: config.fromName || process.env.FROM_NAME || 'Job Backend',
      ...config
    };
    
    console.log(`📧 EmailChannel initialized with provider: ${this.config.provider}`);
  }

  async send(userId, message, options = {}) {
    try {
      const userEmail = await this.getUserEmail(userId);
      
      const emailData = {
        to: userEmail,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        subject: options.subject || 'Notification',
        message: message,
        ...options
      };

      switch (this.config.provider) {
        case 'resend':
          return await this.sendWithResend(emailData);
        case 'brevo':
          return await this.sendWithBrevo(emailData);
        case 'sendgrid':
          return await this.sendWithSendGrid(emailData);
        case 'nodemailer':
          return await this.sendWithNodemailer(emailData);
        default:
          return await this.sendMock(emailData);
      }
    } catch (error) {
      console.error(`❌ EmailChannel: Failed to send email to user ${userId}:`, error.message);
      throw error;
    }
  }

  async sendMock(emailData) {
    console.log('📧 [MOCK] Email sent:');
    console.log(`   To: ${emailData.to}`);
    console.log(`   From: ${emailData.from.name} <${emailData.from.email}>`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Message: ${emailData.message}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      provider: 'mock',
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  }

  async sendWithResend(emailData) {
    
    console.log('📧 [RESEND] Would send email with Resend API');
    return await this.sendMock(emailData);
  }

  async sendWithBrevo(emailData) {
    
    console.log('📧 [BREVO] Would send email with Brevo API');
    return await this.sendMock(emailData);
  }

  async sendWithSendGrid(emailData) {
    
    console.log('📧 [SENDGRID] Would send email with SendGrid API');
    return await this.sendMock(emailData);
  }

  async sendWithNodemailer(emailData) {
    
    console.log('📧 [NODEMAILER] Would send email with Nodemailer');
    return await this.sendMock(emailData);
  }

  async getUserEmail(userId) {
    
    return `user${userId}@example.com`;
  }

  validateConfig() {
    if (!this.config.fromEmail) {
      throw new Error('EmailChannel: fromEmail is required');
    }
    
    if (this.config.provider !== 'mock' && !this.config.apiKey) {
      throw new Error(`EmailChannel: apiKey is required for provider ${this.config.provider}`);
    }
    
    return true;
  }
}

module.exports = EmailChannel; 