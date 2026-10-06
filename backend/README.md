# GeoWork Backend

> **Enterprise Geo-Fenced Workforce & Attendance Management System**  
> Architected with Node.js, Express.js, MongoDB (Mongoose), Redis, and ES Modules.

---

## 🏗️ Architecture Overview

GeoWork Backend follows a strict **Layered MVC + Service Layer Architecture** ensuring high scalability, enterprise maintainability, and clean separation of concerns.

```
Client / Frontend (Mobile App / Web Dashboard)
       ↓
    API Route (/api/v1/...)
       ↓
   Middleware (Auth, RBAC, Rate Limiter, Multer, Zod Validation)
       ↓
   Controller (HTTP Request/Response Handling, Standard ApiResponse)
       ↓
    Service Layer (Pure Business Logic, Geofencing, Cryptographic Hashes)
       ↓
     Model (Mongoose Schemas, 2dsphere Geospatial Indexes)
       ↓
   MongoDB / Redis Cache
```

### Architectural Rules
1. **Routes**: Define REST API endpoints and wire middleware with controllers. Zero business logic.
2. **Controllers**: Handle HTTP `req` and `res`, invoke services, return standardized `ApiResponse`. Zero database queries.
3. **Services**: Pure business logic, calculations, and orchestrations. Zero direct Express `req`/`res` object access.
4. **Models**: Mongoose schemas defining MongoDB collections with GeoJSON coordinates and `2dsphere` spatial indexes.
5. **Middleware**: Centralized authentication, role-based authorization, rate limiting, request validation, and error handling.

---

## 📁 Exact Project Folder Structure

```
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── database.js          # MongoDB Mongoose connection & lifecycle
│   │   ├── redis.js             # Redis client initialization (ioredis)
│   │   ├── s3.js                # AWS S3 / MinIO client configuration
│   │   └── environment.js       # Typed environment variable registry
│   │
│   ├── middleware/
│   │   ├── authenticate.js      # JWT Bearer token authentication
│   │   ├── authorize.js         # Role-based access control (RBAC)
│   │   ├── rateLimiter.js       # Express rate limiting (API, Auth, OTP)
│   │   ├── upload.js            # Multer file and selfie image uploader
│   │   ├── validate.js          # Zod schema validation middleware
│   │   └── errorHandler.js      # Centralized error handler & status formatting
│   │
│   ├── routes/                  # Centralized Route Registry & Mounts
│   │   ├── index.js             # Root router aggregating all resource sub-routers
│   │   ├── auth.routes.js       # Authentication & user session routes
│   │   ├── attendance.routes.js # Attendance & geofenced punch-in/out routes
│   │   ├── site.routes.js       # Worksite configuration & boundary routes
│   │   ├── supervisor.routes.js # Crew supervision & monitoring routes
│   │   ├── leave.routes.js      # Leave requests & approval routes
│   │   ├── payroll.routes.js    # Payroll processing & salary slip routes
│   │   └── executive.routes.js  # Executive metrics & policy routes
│   │
│   ├── common/
│   │   ├── ApiError.js          # Standardized operational Error class
│   │   ├── ApiResponse.js       # Standardized JSON response envelope
│   │   └── utils/
│   │       ├── cryptoHash.js    # SHA-256 attendance signature & bcrypt hashing
│   │       ├── geoSpatial.js    # Haversine distance & Point-in-Polygon checks
│   │       └── pdfGenerator.js  # Salary slip PDF document generator
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/                # Authentication, OTP, JWT token lifecycle
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validation.js
│   │   │   ├── auth.routes.js
│   │   │   └── user.model.js
│   │   │
│   │   ├── attendance/          # Geofenced punch-in/out, GPS validation, audit trail
│   │   │   ├── attendance.controller.js
│   │   │   ├── attendance.service.js
│   │   │   ├── attendance.model.js
│   │   │   ├── attendance.validation.js
│   │   │   └── attendance.routes.js
│   │   │
│   │   ├── site/                # Worksite geofence boundaries & 2dsphere spatial indexing
│   │   │   ├── site.controller.js
│   │   │   ├── site.service.js
│   │   │   ├── site.model.js
│   │   │   └── site.routes.js
│   │   │
│   │   ├── supervisor/          # Crew assignment, live monitoring & supervisor operations
│   │   │   ├── supervisor.controller.js
│   │   │   ├── supervisor.service.js
│   │   │   └── supervisor.routes.js
│   │   │
│   │   ├── leave/               # Leave applications, balances & approval workflows
│   │   │   ├── leave.controller.js
│   │   │   ├── leave.service.js
│   │   │   ├── leave.model.js
│   │   │   └── leave.routes.js
│   │   │
│   │   ├── payroll/             # Automated salary processing & slip generation
│   │   │   ├── payroll.controller.js
│   │   │   ├── payroll.service.js
│   │   │   ├── payroll.model.js
│   │   │   └── payroll.routes.js
│   │   │
│   │   └── executive/           # Executive dashboards, policy enforcement & audit trail
│   │       ├── executive.controller.js
│   │       ├── executive.service.js
│   │       ├── executive.model.js
│   │       └── executive.routes.js
│   │
│   ├── app.js                   # Express application setup & middleware pipeline
│   └── server.js                # Server bootstrap, DB connection & graceful shutdown
│
├── package.json
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── PROJECT_STRUCTURE.txt
└── README.md
```

---

## 👥 System Roles & Permissions

| Role | Description | Access Scope |
| :--- | :--- | :--- |
| `EMPLOYEE` | Field worker or employee | Punch-in/out within geofence, view personal attendance, apply for leaves, view personal payroll slips. |
| `SUPERVISOR` | Field supervisor | Supervise assigned crew, live attendance monitoring, review leaves, manual attendance overrides, create/edit sites. |
| `SUPER_SUPERVISOR` | Executive / Org Director | Full system control: process monthly payroll, delete sites, executive dashboard analytics, geofence policy management, full audit trail. |

---

## 🔒 Security & Geofence Architecture

1. **Geofencing Engine**:
   - Uses the **Haversine Great-Circle Formula** and MongoDB **`2dsphere` spatial indexing**.
   - Validates that an employee is strictly within the radius of their assigned work site before allowing punch-in.
   - Supports Polygon geofence verification via ray-casting algorithms.
2. **Cryptographic Tamper-Proofing**:
   - Every punch-in and punch-out generates a unique **SHA-256 digital hash signature** incorporating `userId`, `siteId`, `coordinates`, `timestamp`, and `deviceId`.
3. **Authentication & Session Security**:
   - Access tokens (short-lived, 15 min) and Refresh tokens (long-lived, 7 days) signed using JWT.
   - Passwords hashed with `bcryptjs` using 12 salt rounds.
   - OTP support with time expiration and rate-limiting.
4. **Network & HTTP Security**:
   - `helmet` security headers.
   - Strict CORS policy.
   - `express-rate-limit` guards against brute-force and DDoS attacks.
   - `zod` input schema validation sanitizes and validates incoming payloads.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- MongoDB (v6.0 or higher)
- Redis (Optional, for production caching)

### 1. Installation

```bash
cd backend
npm install
```

### 2. Environment Setup

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/geowork_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=5
OTP_RATE_LIMIT=3
CORS_ORIGIN=*
```

### 3. Running the Server

```bash
# Development mode with hot-reload
npm run dev

# Production mode
npm start
```

### 4. Running with Docker Compose

To launch Backend, MongoDB, and Redis with a single command:

```bash
docker-compose up --build
```

---

## 📡 API Endpoints Reference (`/api/v1`)

### Health Check
- `GET /health` - System health check

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user account
- `POST /login` - Login with email and password
- `POST /otp/request` - Request mobile OTP
- `POST /otp/verify` - Verify OTP and receive JWT tokens
- `POST /refresh-token` - Refresh expired access token
- `GET /me` - Get current user profile (Authenticated)
- `POST /logout` - Invalidate session and logout (Authenticated)

### Attendance (`/api/v1/attendance`)
- `POST /punch-in` - Record punch-in within geofence (Employee)
- `POST /punch-out` - Record punch-out (Employee)
- `GET /me` - Retrieve my attendance history (Employee)
- `GET /today` - Check today's punch status (Employee)
- `GET /` - List all attendance records (Supervisor / Executive)
- `POST /override` - Manual attendance correction (Supervisor / Executive)

### Sites (`/api/v1/sites`)
- `GET /` - List all work sites with pagination
- `GET /:id` - Get site details
- `GET /nearby` - Find sites near GPS coordinates
- `POST /:siteId/verify-geofence` - Test if coordinate is inside geofence
- `POST /` - Create new work site (Supervisor / Executive)
- `PUT /:id` - Update work site (Supervisor / Executive)
- `DELETE /:id` - Delete work site (Executive only)

### Supervisor Operations (`/api/v1/supervisors`)
- `GET /crew` - List assigned crew members
- `GET /sites` - List supervised work sites
- `GET /attendance/live` - Real-time crew attendance tracking
- `GET /dashboard` - Supervisor dashboard overview metrics
- `POST /assign` - Assign employee to site and crew
- `PUT /leaves/:leaveId/review` - Approve or reject leave request

### Leaves (`/api/v1/leaves`)
- `POST /` - Submit leave application (Employee)
- `GET /me` - View personal leave history (Employee)
- `GET /balance` - View leave quota and balance (Employee)
- `PUT /:id/cancel` - Cancel pending leave (Employee)
- `GET /` - List all leave applications (Supervisor / Executive)
- `PUT /:id/status` - Update leave status (Supervisor / Executive)

### Payroll (`/api/v1/payroll`)
- `GET /me` - View personal payroll records (Employee)
- `GET /:id/slip` - Download official salary slip (Employee / Supervisor / Executive)
- `GET /` - List all organization payroll records (Supervisor / Executive)
- `POST /process` - Calculate and process monthly salary (Executive only)
- `PUT /:id/pay` - Mark salary as disbursed (Executive only)

### Executive (`/api/v1/executive`)
- `GET /dashboard` - Organization-level dashboard metrics (Executive only)
- `GET /analytics/attendance` - Workforce attendance trends & compliance (Executive only)
- `GET /analytics/payroll` - Financial payroll analytics (Executive only)
- `GET /policy` - Retrieve geofence and operations policy (Executive only)
- `PUT /policy` - Update geofence policy and append audit log (Executive only)
- `GET /audit-trail` - View organization operational audit logs (Executive only)

---

## 📄 License
ISC License. Built for enterprise geo-fenced workforce management.
