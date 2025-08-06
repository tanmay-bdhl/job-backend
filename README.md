# Job Backend

A Node.js backend server using Express and MongoDB for job notifications and resume processing.

## Features
- User authentication (JWT)
- Resume and job preference management
- Daily job notification cron
- Email (and optional WhatsApp) notifications
- Swagger API docs
- Dockerized for local development

## Setup
1. Copy `.env.example` to `.env` and fill in your secrets.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start in dev mode:
   ```bash
   npm run dev
   ```
4. Or use Docker Compose:
   ```bash
   docker-compose up --build
   ```

## API Docs
Visit [http://localhost:5000/api-docs](http://localhost:5000/api-docs) after running the server.

## Folder Structure
- `routes/` - Express route definitions
- `controllers/` - Route logic
- `models/` - Mongoose schemas
- `services/` - Email/notification logic
- `utils/` - Middleware, helpers
- `cron/` - Scheduled jobs
- `config/` - DB and app config

## Linting & Formatting
- Run `npx eslint .` to lint
- Run `npx prettier --write .` to format 