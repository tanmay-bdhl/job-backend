# Notification Channels System

A modular notification system supporting multiple communication channels with pluggable providers.

## Overview

The channel system is designed with modularity and extensibility in mind:

- **EmailChannel** - Ready for Resend, Brevo, SendGrid, Nodemailer
- **WhatsAppChannel** - Ready for Gupshup, 360dialog, Twilio
- **SMS & Push** - Placeholder implementations
- **ChannelFactory** - Centralized management and configuration

## Current Status

✅ **Working with Mock Implementations**
```
📧 EmailChannel initialized with provider: mock
📱 WhatsAppChannel initialized with provider: mock
📋 Available channels: email, whatsapp, sms, push
✅ Successfully sent via: email, whatsapp
```

## Usage

### Basic Usage

```javascript
// Send to single channel
await channelFactory.send('email', 'user123', 'Hello World!');

// Send to multiple channels
await channelFactory.sendMultiple(
  ['email', 'whatsapp'], 
  'user123', 
  'Hello World!',
  { subject: 'Notification' }
);
```

### API Usage

```bash
curl -X POST http://localhost:8000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "channels": ["email", "whatsapp"],
    "message": "Your notification message"
  }'
```

## Channel Implementations

### EmailChannel

**Current**: Mock implementation  
**Future**: Resend, Brevo, SendGrid, Nodemailer

```javascript
const emailChannel = new EmailChannel({
  provider: 'resend', // 'mock', 'resend', 'brevo', 'sendgrid', 'nodemailer'
  apiKey: 'your-api-key',
  fromEmail: 'noreply@yourdomain.com',
  fromName: 'Your App'
});

await emailChannel.send('user123', 'Hello!', {
  subject: 'Welcome',
  template: 'welcome-template'
});
```

**Mock Output:**
```
📧 [MOCK] Email sent:
   To: usertest-user-123@example.com
   From: Job Backend <noreply@example.com>
   Subject: Job Backend Notification
   Message: Testing the new modular channel system!
```

### WhatsAppChannel

**Current**: Mock implementation  
**Future**: Gupshup, 360dialog, Twilio

```javascript
const whatsappChannel = new WhatsAppChannel({
  provider: 'gupshup', // 'mock', 'gupshup', '360dialog', 'twilio'
  apiKey: 'your-api-key',
  fromNumber: '+1234567890',
  appName: 'YourApp'
});

await whatsappChannel.send('user123', 'Hello!');

// Template message
await whatsappChannel.sendTemplate('user123', 'welcome_template', ['John']);

// Media message
await whatsappChannel.sendMedia('user123', 'https://example.com/image.jpg', 'Caption');
```

**Mock Output:**
```
📱 [MOCK] WhatsApp sent:
   To: +1555000-123
   From: Job Backend
   Type: text
   Message: Testing the new modular channel system!
```

## Configuration

### Environment Variables

```env
# Email Configuration
EMAIL_PROVIDER=mock        # mock, resend, brevo, sendgrid, nodemailer
EMAIL_API_KEY=your-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name

# WhatsApp Configuration
WHATSAPP_PROVIDER=mock     # mock, gupshup, 360dialog, twilio
WHATSAPP_API_KEY=your-key
WHATSAPP_API_URL=https://api.provider.com
WHATSAPP_FROM_NUMBER=+1234567890
WHATSAPP_APP_NAME=YourApp

# SMS Configuration (future)
SMS_PROVIDER=mock          # mock, twilio, aws-sns
SMS_API_KEY=your-key
SMS_FROM_NUMBER=+1234567890

# Push Configuration (future)
PUSH_PROVIDER=mock         # mock, firebase, apn
PUSH_API_KEY=your-key
PUSH_APP_ID=your-app-id
```

### Channel Validation

```javascript
const validationResults = channelFactory.validateConfigurations();
// Returns:
{
  email: { valid: false, error: 'EmailChannel: fromEmail is required' },
  whatsapp: { valid: true },
  sms: { valid: true },
  push: { valid: true }
}
```

## Adding Real Providers

### Email - Resend Integration

1. Install Resend: `npm install resend`
2. Update `EmailChannel.js`:

```javascript
async sendWithResend(emailData) {
  const { Resend } = require('resend');
  const resend = new Resend(this.config.apiKey);
  
  return await resend.emails.send({
    from: `${emailData.from.name} <${emailData.from.email}>`,
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.message,
    // html: emailData.html // for HTML emails
  });
}
```

3. Set environment variables:
```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_your_api_key
```

### WhatsApp - Gupshup Integration

1. Install axios: `npm install axios`
2. Update `WhatsAppChannel.js`:

```javascript
async sendWithGupshup(whatsappData) {
  const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', {
    channel: 'whatsapp',
    source: this.config.fromNumber,
    destination: whatsappData.to,
    message: { type: 'text', text: whatsappData.message },
    'src.name': this.config.appName
  }, {
    headers: {
      'apikey': this.config.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  return response.data;
}
```

3. Set environment variables:
```env
WHATSAPP_PROVIDER=gupshup
WHATSAPP_API_KEY=your_gupshup_key
WHATSAPP_FROM_NUMBER=+1234567890
```

## Architecture

### File Structure
```
channels/
├── EmailChannel.js       # Email provider implementations
├── WhatsAppChannel.js    # WhatsApp provider implementations
└── ChannelFactory.js     # Central channel management

workers/
└── notificationWorker.js # Uses ChannelFactory for processing
```

### Data Flow
```
API Request → Queue → Worker → ChannelFactory → Specific Channel → Provider API
```

### Provider Switching

Each channel can switch providers via configuration:

```javascript
// Development
const emailChannel = new EmailChannel({ provider: 'mock' });

// Production
const emailChannel = new EmailChannel({ 
  provider: 'resend',
  apiKey: process.env.EMAIL_API_KEY 
});
```

## Testing

### Mock Mode (Default)
All channels work with mock implementations - perfect for development and testing.

### Integration Testing
```javascript
// Test specific provider
const emailChannel = new EmailChannel({ 
  provider: 'resend',
  apiKey: 'test-key' 
});

const result = await emailChannel.send('user123', 'Test message');
console.log(result);
```

## Production Checklist

- [ ] Set real provider credentials in environment variables
- [ ] Update provider settings from 'mock' to actual providers
- [ ] Test with real API endpoints
- [ ] Set up monitoring for channel failures
- [ ] Configure retry policies for failed deliveries
- [ ] Set up webhook endpoints for delivery confirmations

## Future Enhancements

- **Template System** - Rich template support for all channels
- **A/B Testing** - Test different providers and messages
- **Analytics** - Delivery rates, open rates, click tracking
- **Scheduling** - Delayed and scheduled notifications
- **Personalization** - Dynamic content based on user data
- **Fallback Chains** - Try multiple providers if one fails 