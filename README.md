# Job Backend

A Node.js backend server using Express and MongoDB for job notifications and resume processing.

## Features
- User authentication (JWT)
- Resume and job preference management
- Daily job notification cron
- Email and WhatsApp notifications
- Real-time resume analysis with AWS Lambda
- WebSocket support for live updates
- Queue-based notification processing

## Setup
1. Copy `.env.example` to `.env` and fill in your secrets
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Redis server:
   ```bash
   brew services start redis
   ```
4. Start in dev mode:
   ```bash
   npm run dev
   ```

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/status` - Connection status
- `POST /api/auth/*` - Authentication routes
- `POST /api/upload-cv/*` - Resume upload
- `GET /api/job-preferences/*` - Job preferences
- `POST /api/notifications` - Send notifications
- `POST /api/analysis/*` - Resume analysis

## Folder Structure
- `routes/` - Express route definitions
- `controllers/` - Route logic
- `models/` - Mongoose schemas
- `services/` - Business logic services
- `channels/` - Notification channel implementations
- `workers/` - Background job workers
- `utils/` - Middleware and helpers
- `cron/` - Scheduled jobs
- `config/` - Database and app configuration

## Development
- Run `npm run dev` for development with auto-reload
- Run `npm run worker` to start the notification worker
- Run `npm run pm2:start` for production with PM2 