# PRUTHVIRAJ Workforce & Business Management System
## Production-Grade Enterprise Backend

An industrial IoT, precision geofenced workforce, attendance, payroll, compliance, financial, and multi-business management platform engineered for **Pruthviraj Enterprises** and **Pruthviraj Facilities Pvt. Ltd.**.

Built with **JavaScript (Node.js 20+ LTS ES Modules)**, Express.js, MongoDB 7+ (GeoJSON `2dsphere`), Redis 7+, local uploads storage engine with MongoDB links, and a cryptographic SHA-256 chained attendance ledger.

---

## 1. System Architecture & Features

### Core Architectural Highlights
- **Pure JavaScript & Modern ES Modules**: 100% native ES modules (`"type": "module"`), `async/await`, no TypeScript, no compilation overhead.
- **Modular Monolith**: Strict clean layer architecture: `Routes → Controller → Service → Model/Database → External Infrastructure`.
- **Multi-Tenant Business Data Isolation**: Strict data segregation between **Pruthviraj Enterprises** and **Pruthviraj Facilities Pvt. Ltd.** with combined owner visibility and business-wise drill-downs.
- **Production Phone + OTP Authentication**: Cryptographically secure 6-digit OTP stored as SHA-256 hashes in Redis, with max 3 verification attempts and rate limiting (max 3 sends per 10 minutes).
- **JWT With Refresh Token Rotation & Reuse Detection**: 15-minute access tokens and 7-day refresh tokens. Stored as SHA-256 hashes. If a revoked refresh token is reused, all sessions for the affected user are immediately revoked.
- **Enterprise RBAC**: Role-based and granular permission-based authorization (`VIEW`, `ADD`, `EDIT`, `APPROVE`, `DELETE`, `EXPORT`, `MANAGE`) covering 8 distinct roles: `OWNER`, `HR`, `ACCOUNTS`, `MANAGER`, `STAFF`, `SUPERVISOR`, `EMPLOYEE`, `SUPER_SUPERVISOR`.
- **MongoDB 2dsphere Precision Geofencing**: Millisecond proximity queries via `$near` and multi-point perimeter boundary checks with `$geoIntersects` and secondary Haversine calculations. Automatic rejection of low-accuracy GPS readings (> 20m tolerance).
- **Redis Geofence Cache & Distributed Locks**: Active site geometries cached with 24-hour TTL. Redis distributed locking (`Redlock` pattern) to enforce the **1 Site = 1 Primary Supervisor** invariant during shift handover.
- **Cryptographic SHA-256 Attendance Ledger**: Every punch is hashed with its previous block (`prevRecordHash`), timestamp, coordinates, user ID, punch type, and selfie photo hash. Full ledger chain integrity verification prevents silent history modification.
- **Biometric Face Verification Abstraction**: Pluggable provider abstraction with facial vector match scoring against policy threshold (default 80%).
- **Statutory Indian Payroll Engine**: Zero floating-point drift calculations using integer minor units (paise). Supports Provident Fund (PF 12%), ESIC (0.75% for gross ≤ INR 21,000), Professional Tax (Maharashtra slabs), and overtime compensation.
- **PDFKit Payslip & Audit Generator**: Generates vector PDF payslips with employee summaries, attendance tables, earnings/deductions grids, and tamper-proof SHA-256 digital seals.
- **Excel Muster Attendance Parsing**: Full spreadsheet parsing via `xlsx` with pre-import validation, duplicate detection, and worker/site code resolution.
- **Tally ERP & Notifications Abstraction**: Out-of-the-box XML/JSON data interchange hooks for Tally accounting software and multichannel notification abstractions (SMS, WhatsApp, Email, In-App).
- **OpenAPI / Swagger Documentation**: Interactive API testing playground mounted live at `/api-docs`.

---

## 2. Mandatory Folder Structure

```
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── database.js          # Mongoose connection pooling & lifecycle
│   │   ├── redis.js             # ioredis client, fallback memory cache, distributed locks
│   │   ├── storage.js           # Local uploads directory storage engine
│   │   └── environment.js       # Strongly-typed Zod environment validation
│   │
│   ├── middleware/
│   │   ├── authenticate.js      # JWT Bearer verification & user injection
│   │   ├── authorize.js         # RBAC role & permission guards + business isolation
│   │   ├── rateLimiter.js       # Redis-backed sliding window rate limiters
│   │   ├── upload.js            # Multer memory storage & MIME validation
│   │   ├── validate.js          # Zod schema validation middleware
│   │   └── errorHandler.js      # Centralized error handler (Section 44 JSON envelope)
│   │
│   ├── common/
│   │   ├── ApiError.js          # Operational custom error class
│   │   ├── ApiResponse.js       # Unified response envelope class
│   │   └── utils/
│   │       ├── cryptoHash.js    # SHA-256 ledger chaining, hashing, and masking
│   │       ├── geoSpatial.js    # Haversine & polygon boundary calculations
│   │       └── pdfGenerator.js  # PDFKit payslip & master audit renderer
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/                # Phone OTP login, JWT rotation, Users & Roles
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validation.js
│   │   │   ├── auth.routes.js
│   │   │   └── user.model.js
│   │   │
│   │   ├── attendance/          # Geofenced punch, selfie verification, SHA-256 ledger, shifts
│   │   │   ├── attendance.controller.js
│   │   │   ├── attendance.service.js
│   │   │   ├── attendance.model.js
│   │   │   ├── attendance.validation.js
│   │   │   └── attendance.routes.js
│   │   │
│   │   ├── site/                # Sites (2dsphere), Clients, POs, Worker KYC
│   │   │   ├── site.controller.js
│   │   │   ├── site.service.js
│   │   │   ├── site.model.js
│   │   │   └── site.routes.js
│   │   │
│   │   ├── supervisor/          # 1:1 Governance handover, bulk attendance, live roster
│   │   │   ├── supervisor.controller.js
│   │   │   ├── supervisor.service.js
│   │   │   └── supervisor.routes.js
│   │   │
│   │   ├── leave/               # Quota balances, applications, approvals
│   │   │   ├── leave.controller.js
│   │   │   ├── leave.service.js
│   │   │   ├── leave.model.js
│   │   │   └── leave.routes.js
│   │   │
│   │   ├── payroll/             # Statutory engine (PF/ESIC/PT), Salary slips, PDFKit
│   │   │   ├── payroll.controller.js
│   │   │   ├── payroll.service.js
│   │   │   ├── payroll.model.js
│   │   │   └── payroll.routes.js
│   │   │
│   │   └── executive/           # Multi-business overview, heatmap, approvals, billing, policy
│   │       ├── executive.controller.js
│   │       ├── executive.service.js
│   │       ├── executive.model.js
│   │       └── executive.routes.js
│   │
│   ├── app.js                   # Express app setup, Swagger, Health probes
│   └── server.js                # Server entrypoint with graceful shutdown
│
├── tests/                       # Unit, Security, and Integration Test Suite
│   ├── unit/                    # CryptoHash, GeoSpatial, and Payroll engine tests
│   └── integration/             # Auth lifecycle, Security isolation, and API tests
│
├── package.json
├── .env.example
├── .gitignore
├── Dockerfile                   # Multi-stage production container
├── docker-compose.yml           # App + MongoDB 7 + Redis 7 + MinIO
├── PROJECT_STRUCTURE.txt
└── README.md
```

---

## 3. Prerequisites & Installation

### Requirements
- **Node.js**: v20+ LTS (Tested on Node v20 & v26)
- **MongoDB**: v7.0+ (Replica Set recommended for transactions)
- **Redis**: v7.0+

### Quick Installation

```bash
# Clone and enter backend directory
cd backend

# Install production and development dependencies
npm install
```

---

## 4. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment options:

```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pruthviraj_db
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=pruthviraj_access_secret_super_secure_key_2026
JWT_REFRESH_SECRET=pruthviraj_refresh_secret_super_secure_key_2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

OTP_TTL_SECONDS=300
OTP_MAX_VERIFY_ATTEMPTS=3
ALLOW_DEV_OTP=true

UPLOAD_DIR=uploads
APP_URL=http://localhost:5000

BIOMETRIC_THRESHOLD=80.0
DEFAULT_GEOFENCE_RADIUS_METERS=50
GPS_ACCURACY_THRESHOLD_METERS=20
```

---

## 5. Running the Application

### 1. Seed Initial Data (Section 64)
Populates both businesses (*Pruthviraj Enterprises* & *Pruthviraj Facilities Pvt. Ltd.*), owner, supervisors, operatives, clients, sites with 2dsphere centroids, and bank accounts:

```bash
npm run seed
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Run Production Server
```bash
npm start
```

### 4. Run Test Suite
Runs unit, security, and integration tests using Vitest:

```bash
npm test
```

### 5. Code Quality & Build Checks
```bash
npm run lint
npm run build
```

---

## 6. Docker & Container Deployment

Start the complete production stack (Node.js API, MongoDB 7, Redis 7, MinIO with persistent volumes):

```bash
docker-compose up --build -d
```

Check logs:
```bash
docker-compose logs -f app
```

---

## 7. Interactive API Documentation (OpenAPI / Swagger)

Once the backend is running, open your browser and navigate to:
```
http://localhost:5000/api-docs
```

---

## 8. Authentication & RBAC

### Primary Mobile Flow
1. **Send OTP**:
   `POST /api/v1/auth/otp/send`
   ```json
   { "phoneNumber": "+919800000001" }
   ```
2. **Verify OTP**:
   `POST /api/v1/auth/otp/verify`
   ```json
   { "phoneNumber": "+919800000001", "otpCode": "123456" }
   ```
   *Returns `{ accessToken, refreshToken, user }`.*
3. **Token Rotation**:
   `POST /api/v1/auth/refresh`
   ```json
   { "refreshToken": "..." }
   ```
4. **Logout & Session Revocation**:
   `POST /api/v1/auth/logout`

### User Roles
- `OWNER`: Full unrestricted access to both businesses.
- `HR`: Worker KYC, leave approvals, attendance muster, payroll preparation.
- `ACCOUNTS`: Billing, invoices, expenses, banking, payroll approvals.
- `MANAGER`: Site oversight, worker rosters, operational analytics.
- `SUPER_SUPERVISOR`: Multi-plant supervisor governance, leave approvals, shifts.
- `SUPERVISOR`: 1-to-1 site governance, crew roster, bulk marking, manual overrides.
- `STAFF` / `EMPLOYEE`: Geofenced punch, shift ledger, leave requests, payslip PDF download.

---

## 9. Error Handling Specification

Every operational error produces a consistent JSON envelope (Section 44):

```json
{
  "success": false,
  "status": 422,
  "error": "GEOFENCE_PERIMETER_BREACH",
  "message": "Physical presence verification failed: Worker is 320m away from site perimeter (Allowed radius: 50m).",
  "details": {
    "distanceMeters": 320.0,
    "maxRadiusMeters": 50.0,
    "siteId": "650000000000000000000001"
  },
  "timestamp": "2026-10-06T08:15:00.000Z",
  "requestId": "req_1728202500000"
}
```

---

## 10. Troubleshooting

| Issue | Resolution |
|---|---|
| `ECONNREFUSED 127.0.0.1:27017` | Ensure MongoDB is running locally (`mongod`) or start via `docker-compose up -d mongodb`. |
| `Redis server offline` | The backend automatically activates its in-memory fallback store without failing requests. Start Redis via `docker-compose up -d redis` for distributed persistence. |
| `GEOFENCE_PERIMETER_BREACH` | Ensure punch coordinates fall within the site's radius (`geofenceRadiusMeters`). Check `siteCentroid` in MongoDB. |
| `TOKEN_REUSE_DETECTED` | A revoked refresh token was submitted. All user sessions have been revoked for security; re-login via phone OTP. |
