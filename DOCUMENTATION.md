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
9. [Contributing](#contributing)

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
- **Owner** - Full control (create, update, delete, manage collaborators)
- **Collaborator** - Can edit content, view workspace
- **Viewer** - Read-only access

**How Roles Are Assigned:**

1. **When Creating Workspace:**
   - Project owner automatically has OWNER permissions
   - No collaborator record needed (checked via `project.ownerId`)

2. **When Inviting Collaborators:**
   ```bash
   POST /api/v1/workspaces/{workspaceId}/collaborators
   {
     "email": "user@example.com",
     "role": "collaborator"  ← Set role here
   }
   ```
   Valid roles: `owner`, `collaborator`, `viewer`

3. **Changing Roles:**
   ```bash
   PUT /api/v1/workspaces/{workspaceId}/collaborators/{collaboratorId}
   {
     "role": "viewer"  ← Update role
   }
   ```

4. **Default Role:** If not specified, defaults to `viewer`

**Role Permissions:**

| Action | Owner | Collaborator | Viewer |
|--------|-------|--------------|--------|
| View workspace | ✅ | ✅ | ✅ |
| Edit content | ✅ | ✅ | ❌ |
| Update settings | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |
| Invite/remove users | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |

**Testing Roles (Swagger):**
```
1. Register 3 users (owner, collab, viewer)
2. Owner: Create workspace
3. Owner: Invite collab with role="collaborator"
4. Owner: Invite viewer with role="viewer"
5. Test as collab: Can view ✅, Can't delete ❌ (403)
6. Test as viewer: Can view ✅, Can't edit ❌ (403)
```

**Database Storage:**
- Table: `workspace_collaborators`
- Column: `role` (enum: owner/collaborator/viewer)
- Location: `src/database/entities/WorkspaceCollaborator.ts`
- Type Definition: `src/types/index.ts` (UserRole enum)


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
https://collaborative-workspace-production.up.railway.app/api-docs
```

**Features:**
- 📖 Complete API reference
- Test endpoints directly in browser
- Request/response examples
- JWT authentication support
- No additional tools needed

### Swagger/OpenAPI Testing Guide

#### Accessing Swagger UI

**Local Development:**
```
http://localhost:3000/api-docs
```

**Production (Railway):**
```
https://collaborative-workspace-production.up.railway.app/api-docs
```

#### Testing Flow

**1. Authentication:**
```
Step 1: Expand "Authentication" section
Step 2: Click "POST /api/v1/auth/register"
Step 3: Click "Try it out"
Step 4: Fill in request body:
{
  "email": "test@example.com",
  "password": "Test123!@#",
  "firstName": "Test",
  "lastName": "User"
}
Step 5: Click "Execute"
Step 6: Copy the accessToken from response
```

**2. Authorize Requests:**
```
Step 1: Click "Authorize" button (top right, 🔓 icon)
Step 2: Enter: Bearer YOUR_ACCESS_TOKEN
Step 3: Click "Authorize"
Step 4: Click "Close"
```

Now all protected endpoints will include your token automatically!

**3. Test Projects:**
```
POST /api/v1/projects - Create project
GET /api/v1/projects - List your projects
GET /api/v1/projects/{id} - Get specific project
PUT /api/v1/projects/{id} - Update project
DELETE /api/v1/projects/{id} - Delete project
```

**4. Test Workspaces:**
```
POST /api/v1/workspaces - Create workspace
GET /api/v1/workspaces/{id} - Get workspace
POST /api/v1/workspaces/{id}/collaborators - Add collaborator
PUT /api/v1/workspaces/{id}/collaborators/{collabId} - Update role
```

**5. Test Jobs:**
```
POST /api/v1/jobs - Submit job
GET /api/v1/jobs/{id} - Check job status
GET /api/v1/jobs - List all jobs
```

#### Testing RBAC (Role-Based Access Control)

**Scenario: Test workspace roles**

1. **Register 3 users:**
   - owner@test.com
   - collab@test.com
   - viewer@test.com

2. **Login as owner:**
   ```json
   POST /auth/login
   { "email": "owner@test.com", "password": "..." }
   ```
   → Copy owner's token → Authorize

3. **Create project and workspace:**
   ```json
   POST /projects
   { "name": "Test Project", "description": "..." }
   
   POST /workspaces
   { "name": "Test Workspace", "projectId": "..." }
   ```

4. **Invite collaborators:**
   ```json
   POST /workspaces/{id}/collaborators
   { "email": "collab@test.com", "role": "collaborator" }
   
   POST /workspaces/{id}/collaborators
   { "email": "viewer@test.com", "role": "viewer" }
   ```

5. **Test permissions:**
   - Login as collaborator → Try to delete workspace (should fail)
   - Login as viewer → Try to update workspace (should fail)
   - Login as owner → Delete workspace (should succeed)

#### Common Testing Scenarios

**Test Rate Limiting:**
```
1. Make 10 rapid requests to /auth/login
2. Should see 429 Too Many Requests after limit
```

**Test Validation:**
```
1. Try POST /projects with empty name
2. Should see 400 Bad Request with validation errors
```

**Test Caching:**
```
1. GET /projects (first call - slow)
2. GET /projects again (cached - fast)
3. POST new project
4. GET /projects (cache invalidated - slow)
```

#### Swagger Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input/validation error |
| 401 | Unauthorized | No token or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

#### Tips for Swagger Testing

 **Do:**
- Use "Try it out" for quick testing
- Save tokens from responses
- Use "Authorize" button for JWT auth
- Check response schemas
- Test error cases
- Clear authorization between users

 **Don't:**
- Forget to authorize after login
- Test with production data in demo
- Share your access tokens
- Leave browser tab open with valid token

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

**Two Ways to Test This Application:**

1. **API Testing (Swagger UI)** - Test backend endpoints directly in browser
2. **Frontend Testing (Demo Page)** - Test complete user experience with real-time features

---

## 1. API Testing with Swagger UI

### What is Swagger Testing?

Swagger UI provides **interactive API documentation** where you can:
- Test all API endpoints directly in your browser
- No code or additional tools required  
- Authenticate with JWT tokens
- See request/response examples in real-time
- Test validation, errors, and edge cases

**When to use:** Testing individual endpoints, authentication, RBAC, debugging API responses

**Access Swagger:**
- Local: `http://localhost:3000/api-docs`
- Production: `https://collaborative-workspace-production.up.railway.app/api-docs`

### Quick Start with Swagger

**Step 1: Register & Get Token**
1. Open Swagger UI
2. Find `POST /api/v1/auth/register`
3. Click "Try it out"
4. Enter JSON:
   ```json
   {
     "email": "demo@example.com",
     "password": "Demo123!@#",
     "firstName": "Demo",
     "lastName": "User"
   }
   ```
5. Click "Execute"
6. Copy `accessToken` from response

**Step 2: Authorize**
1. Click  "Authorize" button (top right)
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click "Authorize" → "Close"

**Step 3: Test Endpoint**
1. Try `POST /api/v1/projects`
2. Enter: `{"name": "Test Project", "description": "..."}`
3. Click "Execute"
4. See 201 Created!

### Swagger Testing Scenarios

**Test RBAC:**
- Register 3 users (owner, collaborator, viewer)
- Create workspace as owner
- Invite others with different roles
- Test permissions (viewer can't delete = 403)

**Test Rate Limiting:**
- Make 10 rapid login attempts
- Should see 429 after limit

**Test Caching:**
- GET /projects (first call ~50ms)
- GET /projects again (cached ~5ms)

---

## 2. Frontend Testing with Demo Page

### What is Demo Page Testing?

The demo page is a **fully functional frontend** that lets you:
- Test complete user experience
- See real-time collaboration
- Test WebSocket connections
- Simulate multiple users

**When to use:** Testing real-time features, UI/UX, multi-user collaboration, recording demos

**Access Demo:**
- Local: `http://localhost:3000/demo.html`
- Production: `https://collaborative-workspace-production.up.railway.app/demo.html`

### Quick Start with Demo Page

**Step 1: Setup**
1. Open demo page
2. Open DevTools (F12) → Console tab

**Step 2: Register**
1. Fill in email, password, name
2. Click "Register"
3. Check console: `✅ Registration successful!`
4. Check: `🔌 WebSocket connected!`

**Step 3: Create Workspace**
1. Create project → copy Project ID
2. Create workspace → copy Workspace ID
3. Click "Join Workspace"
4. Check console: `👤 User joined`

**Step 4: Test Real-Time (2 Windows)**
1. Open second browser window (incognito)
2. Register different user
3. Both join same workspace
4. In Window 1: Click "File Changed"
5. In Window 2: See instant update!

### Demo Page Testing Scenarios

**Multi-User Collaboration:**
```
Window 1 (User A):
- Create & join workspace
- Send file change

Window 2 (User B):  
- Join same workspace
- Receive User A's changes instantly!
- Send cursor movement

Both see:
- Real-time messages
- Activity feed updates
- User presence
```

**What to Check:**
- ✅ Console logs (emojis show success)
- ✅ Network tab (WebSocket connection)
- ✅ No 404 or connection errors

---

## Swagger vs Demo Page

| Feature | Swagger | Demo Page |
|---------|---------|-----------|
| Test API endpoints | ✅ Best | ❌ Can't |
| Test WebSockets | ❌ Can't | ✅ Best |
| Test RBAC | ✅ Best | ⚠️ Limited |
| Multi-user test | ❌ Can't | ✅ Best |
| Error debugging | ✅ Best | ⚠️ Limited |
| Demo to clients | ❌ Technical | ✅ Best |

---

## Automated Unit Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- authMiddleware.test.ts

# Verbose output
npm test -- --verbose
```

### Test Coverage

**Target: 70%+ coverage achieved!**

Current coverage:
- Statements: 70%+
- Branches: 69%+  
- Functions: 70%+
- Lines: 70%+

**Test Files:**
- authService.test.ts (11 tests)
- cacheService.test.ts (5 tests)
- authController.test.ts (14 tests)
- authMiddleware.test.ts (18 tests - includes RBAC)
- errorHandler.test.ts (13 tests)
- validator.test.ts (12 tests)
- config.test.ts (11 tests)
- logger.test.ts (10 tests)
- mongodb.test.ts (4 tests)
- redis.test.ts (15 tests)
- rateLimiter.test.ts (6 tests)

**Total: 100+ test cases**

### Swagger API Testing

#### Access Swagger UI

**Local Development:**
```
http://localhost:3000/api-docs
```

**Production (Railway):**
```
https://collaborative-workspace-production.up.railway.app/api-docs
```

#### Quick Start - Test Your First API

**Step 1: Register User**
1. Open Swagger UI
2. Find `POST /api/v1/auth/register`
3. Click "Try it out"
4. Enter request body:
   ```json
   {
     "email": "demo@example.com",
     "password": "Demo123!@#",
     "firstName": "Demo",
     "lastName": "User"
   }
   ```
5. Click "Execute"
6. Copy the `accessToken` from response

**Step 2: Authorize Future Requests**
1. Click 🔓 "Authorize" button (top right)
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
   (Replace YOUR_ACCESS_TOKEN with copied token)
3. Click "Authorize"
4. Click "Close"

Now all protected endpoints are authenticated!

**Step 3: Test Protected Endpoints**
1. Try `POST /api/v1/projects`
2. Enter:
   ```json
   {
     "name": "My First Project",
     "description": "Testing via Swagger"
   }
   ```
3. Click "Execute"
4. Should see 201 Created!

#### Complete Testing Workflows

**Workflow 1: Project Management**
```
1. POST /auth/register → Create account
2. POST /auth/login → Get fresh token
3. Authorize with token
4. POST /projects → Create project
5. GET /projects → List projects (cache test)
6. GET /projects/{id} → Get specific project
7. PUT /projects/{id} → Update project
8. DELETE /projects/{id} → Delete project
```

**Workflow 2: Workspace & Collaboration**
```
1. Register 2 users (owner, collaborator)
2. Login as owner
3. Create project
4. Create workspace
5. POST /workspaces/{id}/collaborators
   Body: { "email": "collab@example.com", "role": "collaborator" }
6. Login as collaborator
7. GET /workspaces/{id} → View workspace
8. Try DELETE /workspaces/{id} → Should fail (403 Forbidden)
```

**Workflow 3: RBAC Testing**
```
Register 3 users:
- owner@test.com
- collab@test.com  
- viewer@test.com

Test Owner (all permissions):
 Create workspace
 Update workspace
 Delete workspace
 Invite collaborators
 Change roles

Test Collaborator:
 View workspace
 Edit content
 Delete workspace (403)
 Change roles (403)

Test Viewer:
 View workspace only
 Everything else (403)
```

**Workflow 4: Background Jobs**
```
1. POST /jobs
   {
     "type": "code_execution",
     "data": {
       "code": "print('Hello from Swagger!')",
       "language": "python"
     }
   }
2. Copy jobId from response
3. GET /jobs/{id} → Check status
4. GET /jobs → List all your jobs
```

#### Testing Edge Cases

**1. Rate Limiting**
```
- Make 10 rapid POST /auth/login requests
- After 5 attempts: 429 Too Many Requests
- Response: "Too many authentication attempts"
```

**2. Validation Errors**
```
- POST /projects with empty name
- Response: 400 Bad Request
- Body includes: { "errors": ["name is required"] }
```

**3. Caching Performance**
```
- GET /projects (first call - ~50-100ms)
- GET /projects again (cached - ~5-10ms)
- POST new project (invalidates cache)
- GET /projects (cache miss - ~50-100ms)
```

**4. Unauthorized Access**
```
- Clear authorization (Authorize → Logout)
- Try GET /projects
- Response: 401 Unauthorized
- Message: "No token provided"
```

**5. Token Expiration**
```
- Wait 15+ minutes with same token
- Try any protected endpoint
- Response: 401 Unauthorized
- Message: "Invalid or expired token"
- Use POST /auth/refresh to get new token
```

#### Response Status Codes

| Code | Status | Meaning | Example |
|------|--------|---------|---------|
| 200 | OK | Success | GET /projects |
| 201 | Created | Resource created | POST /projects |
| 400 | Bad Request | Validation failed | Empty required field |
| 401 | Unauthorized | No/invalid token | Missing Authorization |
| 403 | Forbidden | Insufficient permissions | Viewer tries to delete |
| 404 | Not Found | Resource doesn't exist | GET /projects/fake-id |
| 429 | Too Many Requests | Rate limit exceeded | >5 login attempts |
| 500 | Internal Server Error | Server issue | Database down |

#### Swagger Pro Tips

✅ **Do:**
- Save tokens from login responses
- Use "Authorize" button for JWT auth
- Test both success and error cases
- Check response schemas
- Test with realistic data
- Clear auth between different users

❌ **Don't:**
- Forget Bearer prefix in auth
- Use expired tokens (refresh every 15min)
- Share tokens publicly
- Test production with fake data
- Leave sensitive data in examples

### Demo Page Testing

1. Open demo page:
   - Local: `http://localhost:3000/demo.html`
   - Production: `https://collaborative-workspace-production.up.railway.app/demo.html`

2. Open browser DevTools (F12) → Console tab

3. **Test Registration:**
   - Enter email, password, name
   - Click Register
   - Check console: "✅ Registration successful!"

4. **Test Real-Time:**
   - Open second browser window (incognito)
   - Register different user
   - Both join same workspace
   - Type in one window
   - See updates in other window instantly!

5. **Test Collaboration Features:**
   - File changes
   - Cursor position
   - User presence
   - Activity feed

### Testing Checklist

Before deployment, verify:

#### API Tests (Swagger)
- [ ] User registration works
- [ ] Login returns valid token
- [ ] Token authorization works
- [ ] Projects CRUD operations
- [ ] Workspaces CRUD operations
- [ ] Collaborator management
- [ ] Role-based access control
- [ ] Background jobs submit
- [ ] Rate limiting triggers
- [ ] Validation catches errors
- [ ] Cache improves performance

#### Real-Time Tests (Demo)
- [ ] WebSocket connects
- [ ] Users can join workspaces
- [ ] Real-time updates work
- [ ] Multiple users sync
- [ ] Activity logs record
- [ ] Presence tracking works

#### Security Tests
- [ ] JWT required for protected routes
- [ ] Expired tokens rejected
- [ ] RBAC permissions enforced
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] SQL injection prevented
- [ ] XSS protection enabled





## Deployment

### Why Railway? 

This project is deployed on **Railway** instead of Vercel for critical architectural reasons:

#### **Railway Advantages:**
1. **Full Backend Support** - Runs Node.js processes (not serverless)
2. **WebSocket Support** - Real-time Socket.io connections stay alive
3. **Background Workers** - Supports separate worker processes for Bull queue
4. **Built-in Databases** - PostgreSQL and Redis included (MongoDB via Atlas)
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

**Railway Databases (Built-in):**

Via Railway Dashboard:
1. Go to https://railway.app/
2. Click your project
3. Click "New" → "Database"
4. Add:
   - ✅ **PostgreSQL** (Railway provides)
   - ✅ **Redis** (Railway provides)

Via CLI:
```bash
railway add postgresql
railway add redis
```

Railway automatically sets:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

**MongoDB Atlas (External Service):**

 **Important:** Railway does NOT provide MongoDB. Use MongoDB Atlas instead:

1. Go to https://mongodb.com/cloud/atlas
2. Create free account
3. Create free cluster (M0 - 512MB)
4. Database Access → Add User (username/password)
5. Network Access → Add IP: `0.0.0.0/0` (allow all)
6. Get connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password

**Add to Railway Environment Variables:**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/workspace?retryWrites=true&w=majority
```

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
