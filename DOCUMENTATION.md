# Complete Documentation - Collaborative Workspace Backend

**Project:** Real-Time Collaborative Workspace Backend  
**Version:** 1.0.0  
**Last Updated:** December 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Setup & Installation](#setup--installation)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Submission Guide](#submission-guide)
10. [Contributing](#contributing)

---

## Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+

### Installation (5 minutes)

```bash
# 1. Clone repository
git clone <your-repo-url>
cd Collaborative-Workspace

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Start databases (macOS with Homebrew)
brew services start postgresql@14
brew services start mongodb-community@6
brew services start redis

# 5. Start application
npm run dev

# 6. Start worker (in new terminal)
npm run worker

# 7. Open demo
open http://localhost:3000/demo.html
```

---

## Project Overview

### What Is This?

A comprehensive **Real-Time Collaborative Workspace Backend** that enables multiple users to:
- Collaborate in real-time on shared workspaces
- Securely authenticate and manage permissions
- Create and manage projects with role-based access
- Receive instant updates via WebSockets
- Process long-running tasks asynchronously

### Technology Stack

**Backend Framework:**
- Node.js (v18+)
- TypeScript
- Express.js

**Databases:**
- PostgreSQL - Users, Projects, Workspaces
- MongoDB - Activities, Jobs
- Redis - Caching, Sessions, Pub/Sub

**Real-Time:**
- Socket.io - WebSocket connections
- Redis Pub/Sub - Multi-server scaling

**Job Processing:**
- Bull - Message queue
- Background workers

**Security:**
- JWT authentication
- bcrypt password hashing
- Helmet security headers
- Rate limiting

**Testing:**
- Jest - Testing framework
- Supertest - HTTP assertions
- 70%+ code coverage

**DevOps:**
- Docker & Docker Compose
- GitHub Actions CI/CD
- Railway deployment

---

## Features

### 1. Authentication & Authorization

**Endpoints:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout & token blacklist

**Features:**
- JWT access tokens (15 min expiry)
- JWT refresh tokens (7 days expiry)
- Token blacklisting on logout
- Password hashing with bcrypt
- Rate limiting on auth endpoints

### 2. Project Management

**Endpoints:**
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List projects (paginated)
- `GET /api/v1/projects/:id` - Get project details
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

**Features:**
- Project ownership tracking
- Metadata support (JSON)
- Pagination (page, limit)
- Redis caching
- Soft delete capability

### 3. Workspace Management

**Endpoints:**
- `POST /api/v1/workspaces` - Create workspace
- `GET /api/v1/workspaces/:id` - Get workspace
- `PUT /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace
- `POST /api/v1/workspaces/:id/collaborators` - Add collaborator
- `DELETE /api/v1/workspaces/:id/collaborators/:userId` - Remove collaborator

**Roles:**
- **Owner** - Full control
- **Collaborator** - Can edit
- **Viewer** - Read-only

### 4. Real-Time Collaboration

**WebSocket Events:**

**Client → Server:**
- `join_workspace` - Join a workspace
- `leave_workspace` - Leave workspace
- `file_change` - Broadcast code changes
- `cursor_move` - Share cursor position

**Server → Client:**
- `user_joined` - User joined workspace
- `user_left` - User left workspace
- `file_changed` - File was edited
- `cursor_moved` - Cursor position updated

**Features:**
- Real-time updates via Socket.io
- Redis Pub/Sub for scaling
- Activity logging in MongoDB
- User presence tracking

### 5. Asynchronous Job Processing

**Endpoints:**
- `POST /api/v1/jobs` - Submit job
- `GET /api/v1/jobs/:id` - Get job status
- `GET /api/v1/jobs` - List user jobs

**Job Types:**
- `code_execution` - Execute code
- `data_processing` - Process data
- `report_generation` - Generate reports

**Features:**
- Bull message queue
- Background worker process
- Progress tracking (0-100%)
- Automatic retries
- Error handling

### 6. Caching Strategy

**Cache Keys:**
```
projects:user:{userId}:{page}:{limit}
workspace:{workspaceId}
user:profile:{userId}
```

**TTL (Time To Live):**
- User profiles: 5 minutes
- Project lists: 5 minutes
- Workspace data: 10 minutes

**Cache Invalidation:**
- CREATE → Delete list caches
- UPDATE → Delete specific cache
- DELETE → Delete all related caches

**Performance:**
- Database: 50-200ms
- Cache hit: 5-10ms
- **95% faster responses**

---

## Architecture

### System Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
┌──────▼──────────────────┐
│   Load Balancer/Nginx   │
└──────┬──────────────────┘
       │
┌──────┴────────┐
│               │
▼               ▼
┌─────────┐  ┌──────────┐
│   API   │  │ WebSocket│
│ Servers │  │  Servers │
└────┬────┘  └────┬─────┘
     │            │
┌────┴────────────┴────┬────────┬─────────┐
│                      │        │         │
▼                      ▼        ▼         ▼
┌──────────┐  ┌──────────┐  ┌───────┐  ┌────────┐
│PostgreSQL│  │ MongoDB  │  │ Redis │  │  Bull  │
│          │  │          │  │       │  │ Queue  │
└──────────┘  └──────────┘  └───────┘  └────┬───┘
                                             │
                                             ▼
                                        ┌─────────┐
                                        │ Workers │
                                        └─────────┘
```

### Project Structure

```
Collaborative-Workspace/
├── src/
│   ├── config/              # Configuration
│   │   └── index.ts
│   ├── controllers/         # Request handlers
│   │   ├── authController.ts
│   │   ├── projectController.ts
│   │   ├── workspaceController.ts
│   │   └── jobController.ts
│   ├── database/            # Database setup
│   │   ├── entities/        # TypeORM entities
│   │   ├── models/          # Mongoose models
│   │   ├── postgres.ts
│   │   ├── mongodb.ts
│   │   └── redis.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts
│   │   ├── validator.ts
│   │   ├── rateLimiter.ts
│   │   └── errorHandler.ts
│   ├── routes/              # API routes
│   │   ├── authRoutes.ts
│   │   ├── projectRoutes.ts
│   │   ├── workspaceRoutes.ts
│   │   └── jobRoutes.ts
│   ├── services/            # Business logic
│   │   ├── authService.ts
│   │   └── websocketService.ts
│   ├── queue/               # Job queue
│   │   └── jobQueue.ts
│   ├── workers/             # Background workers
│   │   └── jobWorker.ts
│   ├── tests/               # Tests
│   │   ├── setup.ts
│   │   ├── authService.test.ts
│   │   └── auth.integration.test.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utilities
│   │   └── logger.ts
│   ├── app.ts               # Express app
│   └── server.ts            # Entry point
├── basicfrontend/
│   └── demo.html            # Interactive demo
├── scripts/                 # Utility scripts
├── .github/workflows/       # CI/CD
│   └── ci-cd.yml
├── Dockerfile               # API container
├── Dockerfile.worker        # Worker container
├── docker-compose.yml       # Multi-container setup
├── package.json
├── tsconfig.json
└── .env.example
```

### Data Models

**PostgreSQL (Relational):**

```typescript
// Users
{
  id: UUID
  email: string (unique)
  password: string (hashed)
  firstName: string
  lastName: string
  createdAt: Date
  updatedAt: Date
}

// Projects
{
  id: UUID
  name: string
  description: string
  ownerId: UUID (FK → Users)
  metadata: JSON
  createdAt: Date
  updatedAt: Date
}

// Workspaces
{
  id: UUID
  name: string
  description: string
  projectId: UUID (FK → Projects)
  metadata: JSON
  createdAt: Date
  updatedAt: Date
}

// WorkspaceCollaborators
{
  id: UUID
  workspaceId: UUID (FK → Workspaces)
  userId: UUID (FK → Users)
  role: enum (owner, collaborator, viewer)
  addedAt: Date
}
```

**MongoDB (Flexible):**

```javascript
// Activities
{
  workspaceId: string
  userId: string
  type: enum (join, leave, file_change, cursor_move)
  payload: mixed
  timestamp: Date
}

// Jobs
{
  userId: string
  type: string
  status: enum (queued, processing, completed, failed)
  progress: number (0-100)
  data: mixed
  result: mixed
  error: string
  createdAt: Date
  updatedAt: Date
}
```

---

## Setup & Installation

### 1. Local Development Setup

#### Install Databases (macOS - Homebrew)

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb workspace_db

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@6
brew services start mongodb-community@6

# Install Redis
brew install redis
brew services start redis
```

#### Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env file
nano .env
```

**.env Configuration:**

```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=workspace_db

# MongoDB
MONGODB_URI=mongodb://localhost:27017/workspace

# Redis
REDISHOST=localhost
REDISPORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Install Dependencies & Run

```bash
# Install packages
npm install

# Run in development mode
npm run dev

# In a new terminal, start worker
npm run worker
```

### 2. Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

### 3. Testing the Demo

Open browser to: `http://localhost:3000/demo.html`

**Test Flow:**
1. Register user (e.g., demo@example.com)
2. Create project
3. Create workspace
4. Open second window (different user)
5. Both join same workspace
6. Test real-time collaboration
7. Submit background jobs

---

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Interactive Documentation
```
http://localhost:3000/api-docs
```

### Authentication Header
```
Authorization: Bearer <access_token>
```

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

### Endpoints Summary

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Logout user |

#### Projects
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/projects` | Create project | Required |
| GET | `/projects` | List projects | Required |
| GET | `/projects/:id` | Get project | Required |
| PUT | `/projects/:id` | Update project | Required |
| DELETE | `/projects/:id` | Delete project | Required |

#### Workspaces
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/workspaces` | Create workspace | Required |
| GET | `/workspaces/:id` | Get workspace | Required |
| PUT | `/workspaces/:id` | Update workspace | Required |
| DELETE | `/workspaces/:id` | Delete workspace | Required |
| POST | `/workspaces/:id/collaborators` | Add collaborator | Required |
| DELETE | `/workspaces/:id/collaborators/:userId` | Remove collaborator | Required |

#### Jobs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/jobs` | Submit job | Required |
| GET | `/jobs/:id` | Get job status | Required |
| GET | `/jobs` | List jobs | Required |

### Example API Calls

**Register User:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Create Project:**
```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Project",
    "description": "Project description"
  }'
```

**Submit Job:**
```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "code_execution",
    "data": {
      "code": "print(\"Hello\")",
      "language": "python"
    }
  }'
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- authService.test.ts
```

### Test Coverage

Target: **70%+ coverage**

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   73.45 |    65.23 |   71.89 |   74.12 |
 services           |   85.67 |    78.45 |   83.33 |   86.21 |
 controllers        |   68.92 |    61.87 |   70.45 |   69.34 |
 middleware         |   76.34 |    68.92 |   75.00 |   77.56 |
--------------------|---------|----------|---------|---------|
```

### Test Types

**Unit Tests:**
- Service logic
- Utility functions
- Isolated components

**Integration Tests:**
- API endpoints
- Database operations
- Full request/response flow

### Manual Testing with Demo

1. Open `http://localhost:3000/demo.html`
2. Open browser DevTools (F12)
3. Check console for errors
4. Test all features:
   - Registration
   - Login
   - Project creation
   - Workspace creation
   - Real-time collaboration
   - Job submission

---

## Deployment

### Why Railway? 

This project is deployed on **Railway** instead of Vercel for critical architectural reasons:

#### **Railway Advantages:**
1. **Full Backend Support** - Runs Node.js processes (not serverless)
2. **WebSocket Support** - Real-time Socket.io connections stay alive
3. **Background Workers** - Supports separate worker processes for Bull queue
4. **Built-in Databases** - PostgreSQL, MongoDB, Redis included
5. **No Timeouts** - Long-running processes work perfectly
6. **Docker Support** - Full containerization with Dockerfile
7. **Environment Variables** - Easy configuration management
8. **Auto-scaling** - Handles traffic spikes

####  **Why NOT Vercel:**
1. **Serverless Only** - Can't run persistent WebSocket servers
2. **Timeout Limits** - 10s (hobby) / 60s (pro) max execution time
3. **Cold Starts** - Kills real-time performance
4. **No Workers** - Can't run background job processors
5. **No Built-in Databases** - Requires external services
6. **Not Designed for This** - Built for Next.js/static sites

### Railway Deployment (Recommended)

#### 1. Setup Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project (if already created on web)
railway link
```

#### 2. Add Database Services

**Via Railway Dashboard:**
1. Go to https://railway.app/
2. Click your project
3. Click "New" → "Database"
4. Add:
   - PostgreSQL
   - MongoDB  
   - Redis

**Via CLI:**
```bash
railway add postgresql
railway add mongodb  
railway add redis
```

Railway automatically sets environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string

#### 3. Configure Environment Variables

In Railway Dashboard → Variables, add:

```bash
NODE_ENV=production
PORT=3000
API_VERSION=v1

# JWT (generate secure keys)
JWT_SECRET=your_super_secret_key_min_32_chars_here
JWT_REFRESH_SECRET=another_super_secret_key_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS (use your Railway domain)
CORS_ORIGIN=https://collaborative-workspace-production.up.railway.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_CODE_EXECUTION=true

# Job Queue
JOB_QUEUE_CONCURRENCY=5
JOB_QUEUE_MAX_RETRIES=3
```

**Note:** Database URLs are auto-populated by Railway services!

#### 4. Deploy

```bash
# Deploy from CLI
railway up

# Or connect GitHub and auto-deploy
# Settings → Connect GitHub → Enable auto-deploy on push
```

#### 5. Verify Deployment

```bash
# Check logs
railway logs

# Open application
railway open

# Get deployment URL
railway status
```

### Alternative: Docker Compose (Self-Hosted)

```bash
# Production build
docker-compose -f docker-compose.yml up -d

# With custom env
docker-compose --env-file .env.production up -d
```

### CI/CD Pipeline

GitHub Actions automatically:
1. Lints code
2. Runs tests
3. Builds TypeScript
4. Deploys to Railway (on main branch push)

**Workflow:** `.github/workflows/ci-cd.yml`

**Note:** Configure Railway GitHub integration to enable auto-deployments.

---

## Submission Guide

### For Assessment Submission

#### 1. Prepare GitHub Repository

```bash
# Initialize git
git init
git add .
git commit -m "feat: complete collaborative workspace backend"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/repo.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Railway

1. Sign up at https://railway.app
2. Create new project
3. Add databases (PostgreSQL, MongoDB, Redis)
4. Connect GitHub repository
5. Add environment variables
6. Deploy

**Your Deployment:**
- **Live App:** https://collaborative-workspace-production.up.railway.app/
- **Demo Page:** https://collaborative-workspace-production.up.railway.app/demo.html
- **API Docs:** https://collaborative-workspace-production.up.railway.app/api-docs

#### 3. Create Submission Document

Use the template in `ASSESSMENT_SUBMISSION.md`:
- Replace all placeholders with your information
- Add GitHub URL
- Add Vercel URL
- Convert to Word and PDF

#### 4. Send Submission Email

**To:** career@purplemerit.com  
**Subject:** Backend Developer_Assessment_[Your_Name]_December 2025

**Attach:**
- Word document
- PDF document

**Include:**
- GitHub repository URL
- Live Railway deployment URL
- Demo page URL
- API docs URL

**Example:**
- GitHub: https://github.com/yourusername/collaborative-workspace
- Live App: https://collaborative-workspace-production.up.railway.app/
- Demo: https://collaborative-workspace-production.up.railway.app/demo.html
- API Docs: https://collaborative-workspace-production.up.railway.app/api-docs

**Deadline:** 28th December 2025, 10:30 AM IST

---

## Contributing

### Code Style

- **ESLint** for linting
- **Prettier** for formatting
- **TypeScript** strict mode

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push
git push origin feature/new-feature

# Create pull request
```

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `style:` Formatting
- `chore:` Maintenance

---

## Support & Contact

### Issues
- GitHub Issues: [Repository URL]/issues

### Documentation
- API Docs: https://collaborative-workspace-production.up.railway.app/api-docs
- Demo: https://collaborative-workspace-production.up.railway.app/demo.html
- GitHub: [Repository URL]

### Resources
- Node.js: https://nodejs.org/
- TypeScript: https://www.typescriptlang.org/
- Express: https://expressjs.com/
- Socket.io: https://socket.io/
- Bull: https://github.com/OptimalBits/bull

---

## License

This project is licensed under the MIT License.

---

## Summary

This is a production-ready, scalable, real-time collaborative workspace backend featuring:

- Secure authentication with JWT  
- RESTful API design  
- Real-time WebSocket collaboration  
- Asynchronous job processing  
- Multi-database architecture  
- Comprehensive testing (70%+)  
- Docker containerization  
- CI/CD pipeline  
- Complete documentation  
- Interactive demo  

**Perfect for team collaboration, real-time editing, and scalable applications!**

---

*Last Updated: December 2025*  
*Version: 1.0.0*
