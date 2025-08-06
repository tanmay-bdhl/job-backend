# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env.production` file with the following variables:

```env
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=8000
API_BASE_URL=https://your-production-domain.com

# Frontend URLs (CORS)
FRONTEND_URL=https://d3e6zi0zo1k499.amplifyapp.com

# MongoDB Configuration
MONGODB_URI=mongodb://your-production-mongodb-uri

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-production-domain.com/api/auth/login/google/callback

# Email Configuration (for notifications)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name

# WhatsApp Configuration (for notifications)
WHATSAPP_PROVIDER=gupshup
WHATSAPP_API_KEY=your-gupshup-api-key
WHATSAPP_API_URL=https://api.gupshup.io
WHATSAPP_FROM_NUMBER=+1234567890
WHATSAPP_APP_NAME=YourApp

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 2. Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging

### 3. Infrastructure Requirements
- [ ] MongoDB database (Atlas recommended)
- [ ] Redis instance (for BullMQ)
- [ ] Node.js 18+ runtime
- [ ] PM2 for process management
- [ ] SSL certificate
- [ ] Domain configuration

## 🏗️ Deployment Steps

### Step 1: Server Setup
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Redis
sudo apt-get install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Step 2: Application Deployment
```bash
# Clone your repository
git clone https://github.com/your-username/job-backend.git
cd job-backend

# Install dependencies
npm install --production

# Copy environment file
cp .env.production.example .env.production
# Edit .env.production with your actual values

# Create uploads directory
mkdir uploads
chmod 755 uploads

# Start the application
npm run pm2:start
```

### Step 3: PM2 Configuration
The `ecosystem.config.js` file is already configured for production:

```javascript
module.exports = {
  apps: [
    {
      name: 'job-backend-server',
      script: 'index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    },
    {
      name: 'notification-worker',
      script: 'worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Step 4: Nginx Configuration (Optional)
If using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Production Commands

### PM2 Management
```bash
# Start all processes
npm run pm2:start

# Stop all processes
npm run pm2:stop

# Restart all processes
npm run pm2:restart

# View logs
npm run pm2:logs

# Monitor processes
npm run pm2:status

# Start only server
npm run pm2:server

# Start only worker
npm run pm2:worker
```

### Manual PM2 Commands
```bash
# Start with production environment
pm2 start ecosystem.config.js --env production

# Restart specific app
pm2 restart job-backend-server

# View logs
pm2 logs job-backend-server

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- `GET /api/health` - Basic health check
- `GET /api/status` - Connection status (Redis, MongoDB)

### Log Monitoring
```bash
# View real-time logs
pm2 logs --lines 100

# View specific app logs
pm2 logs job-backend-server

# View error logs
pm2 logs job-backend-server --err
```

### Performance Monitoring
```bash
# Monitor CPU and memory usage
pm2 monit

# View detailed process info
pm2 show job-backend-server
```

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env.production` to version control
- Use secure secret management
- Rotate secrets regularly

### 2. CORS Configuration
- Only allow specific origins in production
- Remove wildcard origins
- Log blocked origins for monitoring

### 3. Rate Limiting
- Enabled by default in production
- Configure based on your traffic patterns
- Monitor for abuse

### 4. File Uploads
- Validate file types and sizes
- Scan for malware
- Store files securely

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check allowed origins in `.env.production`
   - Verify frontend URL is correct
   - Check browser console for blocked origins

2. **Redis Connection Issues**
   - Verify Redis is running: `redis-cli ping`
   - Check Redis credentials
   - Ensure Redis port is accessible

3. **MongoDB Connection Issues**
   - Verify MongoDB URI is correct
   - Check network connectivity
   - Ensure database user has proper permissions

4. **PM2 Process Issues**
   - Check logs: `pm2 logs`
   - Restart processes: `pm2 restart all`
   - Check system resources: `pm2 monit`

### Emergency Commands
```bash
# Emergency restart
pm2 restart all

# Kill all processes
pm2 kill

# Start fresh
pm2 start ecosystem.config.js --env production

# Check system resources
htop
df -h
free -h
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer for multiple server instances
- Configure Redis clustering for high availability
- Use MongoDB replica sets

### Vertical Scaling
- Increase PM2 instances: `instances: 'max'`
- Optimize Node.js memory settings
- Use PM2 cluster mode

### Database Scaling
- Implement database connection pooling
- Use read replicas for read-heavy operations
- Consider database sharding for large datasets

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.4
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/your/app
            git pull origin main
            npm install --production
            pm2 restart all
```

## 📞 Support

For production issues:
1. Check logs first: `pm2 logs`
2. Verify environment variables
3. Test health endpoints
4. Check system resources
5. Review recent deployments

Remember: Always test in staging before deploying to production! 