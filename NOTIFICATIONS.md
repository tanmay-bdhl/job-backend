# Notifications System

This project includes a notification system using BullMQ and Redis for reliable, scalable notification processing with **centralized connection management**.

## Features

- **Queue-based Processing**: Uses BullMQ for reliable job processing
- **Redis Backend**: Local Redis instance for queue storage
- **Centralized Initialization**: All Redis and BullMQ connections managed from one place
- **Retry Logic**: 3 retry attempts with exponential backoff
- **Multiple Channels**: Support for email, SMS, and push notifications
- **Graceful Shutdown**: Proper cleanup of all connections
- **Connection Monitoring**: Real-time connection status endpoints

## Setup

### Prerequisites

1. **Redis Server**: Make sure Redis is running locally
   ```bash
   # Install Redis (macOS)
   brew install redis
   
   # Start Redis
   brew services start redis
   
   # Or run manually
   redis-server
   ```

2. **Environment Variables**: Add to your `.env` file (optional, defaults provided):
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Dependencies

The following packages are automatically installed:
- `bullmq` - Queue management
- `ioredis` - Redis client

## Centralized Connection Management

The system now uses centralized initialization in `config/init.js`:

### Startup Sequence
1. **MongoDB Connection** - Database connectivity
2. **Redis Connection** - Establishes Redis connection with immediate connection
3. **BullMQ Queue Setup** - Initializes notification queue
4. **Worker Initialization** - Starts the notification worker
5. **Express Server** - Starts the HTTP server

### Connection Status
Monitor connections in real-time:
```bash
curl http://localhost:8000/api/status
```

Response:
```json
{
  "success": true,
  "message": "Connection status retrieved",
  "redis": {
    "status": "ready",
    "connected": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## API Endpoints

### POST `/api/notifications`

Add a notification to the processing queue.

**Headers:**
```
Content-Type: application/json
# Authorization: Bearer <your-jwt-token>  # Currently disabled for testing
```

**Request Body:**
```json
{
  "userId": "686d7e14d894c0938087669d",
  "channels": ["email", "sms", "push"],
  "message": "Your notification message here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification added to queue successfully",
  "jobId": "1",
  "data": {
    "userId": "686d7e14d894c0938087669d",
    "channels": ["email", "sms", "push"],
    "message": "Your notification message here"
  }
}
```

### GET `/api/status`

Get current connection status for Redis and BullMQ.

## Testing

### Quick Verification

Run the comprehensive verification script:

```bash
# 1. Start Redis
brew services start redis

# 2. Start the application
npm run dev

# 3. Run verification (in another terminal)
node verify-setup.js
```

This will test:
- ✅ Redis connectivity
- ✅ Server status
- ✅ Notification endpoint functionality

### Manual Testing with curl

```bash
curl -X POST http://localhost:8000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "channels": ["email", "sms"],
    "message": "Test notification"
  }'
```

## Startup Logs

When you start the server, you'll see detailed initialization logs:

```
🚀 Starting Job Backend Server...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  Connecting to MongoDB...
MongoDB connected
2️⃣  Initializing Redis and BullMQ...
🚀 Starting Redis and BullMQ initialization...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  Waiting for Redis connection...
✅ Redis: Connected successfully
✅ Redis: Ready to receive commands
2️⃣  Setting up BullMQ queues...
🚀 Initializing BullMQ notification queue...
✅ BullMQ: Notification queue initialized successfully
3️⃣  Starting notification worker...
🚀 Initializing notification worker...
✅ Notification Worker: Ready to process jobs
✅ Notification worker initialized successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 All Redis and BullMQ services initialized successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣  Starting daily job check cron...
4️⃣  Starting Express server...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Server running successfully on port 8000
📚 API Documentation: http://localhost:8000/api-docs
🏥 Health Check: http://localhost:8000/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Queue Configuration

- **Queue Name**: `notifications`
- **Retry Attempts**: 3
- **Backoff Strategy**: Exponential (starts at 2 seconds)
- **Concurrency**: 5 jobs processed simultaneously
- **Job Retention**: 100 completed jobs, 50 failed jobs

## Architecture

### File Structure
```
config/
├── redis.js          # Redis connection configuration
├── queue.js           # BullMQ queue setup and monitoring
└── init.js            # Centralized initialization system

workers/
└── notificationWorker.js  # Job processing worker

controllers/
└── notificationsController.js  # API endpoint handler

routes/
└── notifications.js   # Route definitions
```

### Connection Flow
1. `config/redis.js` - Creates Redis connection
2. `config/queue.js` - Sets up BullMQ queue using Redis connection
3. `workers/notificationWorker.js` - Creates worker using same Redis connection
4. `config/init.js` - Orchestrates initialization of all components
5. `index.js` - Uses centralized init for startup

## Production Considerations

### Re-enable Authentication
Before deploying to production, uncomment the auth middleware:

```javascript
// In routes/notifications.js
router.post('/', authMiddleware, addNotification);  // Uncomment authMiddleware
```

### Monitoring
Consider adding:
- Queue dashboard (Bull Dashboard)
- Metrics collection
- Error tracking
- Dead letter queues
- Health checks for Redis connection

### Scaling
- Multiple worker instances
- Redis Cluster for high availability
- Load balancing for Express servers 