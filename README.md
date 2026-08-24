# Cloud Student Management System
**Semester 5 — Cloud Computing Academic Project**

[![Platform](https://img.shields.io/badge/Platform-Google%20Cloud-blue.svg)](https://cloud.google.com)
[![Compute](https://img.shields.io/badge/Compute-Cloud%20Run-blue.svg)](https://cloud.google.com/run)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Cloud%20SQL-336791.svg)](https://cloud.google.com/sql)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb.svg)](https://react.dev)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-68a063.svg)](https://expressjs.com)
[![Security](https://img.shields.io/badge/Security-JWT%20%2B%20RBAC%20%2B%20Helmet-4338ca.svg)](#security-and-rbac)

---

## 1. System Overview & Architecture

The **Cloud Student Management System** is an enterprise-grade academic administration platform designed for high-availability cloud deployment. Built as a stateless containerized service running on **Google Cloud Run**, it connects to a managed **Google Cloud SQL for PostgreSQL** relational database instance, retrieves production credentials dynamically from **Google Secret Manager**, and streams structured JSON logs into **Google Cloud Logging**.

### Cloud Architecture Diagram

```
                                [ HTTPS / Browser Client ]
                                             │
                                             ▼
                      ┌─────────────────────────────────────────────┐
                      │     Google Cloud Run (Stateless Service)    │
                      │  ┌───────────────────────────────────────┐  │
                      │  │ React + Vite Multi-Page Frontend SPA  │  │
                      │  └───────────────────────────────────────┘  │
                      │                      │ (REST API / JSON)    │
                      │  ┌───────────────────────────────────────┐  │
                      │  │ Node.js / Express API Backend         │  │
                      │  │ - Helmet & Rate Limiting Security     │  │
                      │  │ - JWT Auth & Role-Based Guard (RBAC)  │  │
                      │  │ - Centralized Error & Audit Logger    │  │
                      │  └───────────────────────────────────────┘  │
                      └──────────────────────┬──────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      │                                             │
                      ▼                                             ▼
       ┌─────────────────────────────┐               ┌─────────────────────────────┐
       │ Google Cloud SQL (Postgres) │               │ Google Secret Manager & Log │
       │ - ACID Relational Schema    │               │ - Runtime Secrets Ingestion │
       │ - Foreign Key Cascading     │               │ - Cloud Logging (JSON)      │
       │ - Migrations & Seed Scripts │               │ - Cloud Monitoring Uptime   │
       └─────────────────────────────┘               └─────────────────────────────┘
```

---

## 2. Core Features & Capabilities

- **Role-Based Access Control (RBAC)**: Strictly enforced server-side authentication for `ADMIN`, `FACULTY`, and `STUDENT` roles.
- **Dedicated Multi-Page Routing**: Separate pages for `/dashboard`, `/students`, `/students/:id`, `/faculty`, `/faculty/:id`, `/courses`, `/courses/:id`, `/attendance`, `/marks`, `/reports`, `/audit-logs`, and `/settings`.
- **Relational Integrity**: PostgreSQL ACID transactions, foreign keys, unique composite keys, and indexing.
- **Daily Attendance Tracking**: Date-wise class attendance recording with batch upserts and aggregated percentages.
- **Assessment Gradebook**: Configurable assessment scoring, score validation (score <= maxScore), and class statistics.
- **Academic Analytics & Reports**: Live database aggregations calculating department pass rates and student rankings.
- **Security Audit Logging**: Comprehensive immutable audit trail tracking actor, action, timestamp, IP address, and payload.
- **Cloud Observability**: Structured JSON logging matching GCP severity standards and an active `/api/health` readiness probe.

---

## 3. Technology Stack

| Layer | Technologies Used | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, React Router 6, Lucide Icons | Responsive client-side routed enterprise interface |
| **Backend** | Node.js 20, Express 4, Zod, Helmet, bcrypt, jsonwebtoken | RESTful API, validation, security, and authentication |
| **Database** | PostgreSQL 15 / 16, pg connection pool | Relational data persistence with strict foreign keys |
| **Compute** | Google Cloud Run (Containerized stateless) | Serverless execution, auto-scaling, zero disk persistence |
| **Cloud DB** | Google Cloud SQL for PostgreSQL | Managed enterprise database with automated backups |
| **Secrets** | Google Secret Manager | Zero-secret-leak credential injection |
| **Monitoring** | Google Cloud Logging & Monitoring | Centralized telemetry, metrics, and health probes |

---

## 4. Directory Structure

```
STUDENT MANAGEMENT SYSTEM/
├── backend/
│   ├── src/
│   │   ├── config/             # DB pool, environment variables
│   │   ├── constants/          # Role enums, HTTP status codes
│   │   ├── controllers/        # Request handling and HTTP logic
│   │   ├── middleware/         # Auth, RBAC, validation, error handlers
│   │   ├── routes/             # Express sub-routers
│   │   ├── scripts/            # Migration & seed runners
│   │   ├── utils/              # Password hashing, JWT, structured logger
│   │   └── server.js           # Server bootstrap
│   ├── tests/                  # Automated test suites
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # AppShell, Modal, Badge, Spinner, EmptyState
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # Dedicated multi-page views
│   │   ├── services/           # API wrapper module
│   │   ├── styles/             # Enterprise CSS design tokens
│   │   ├── App.jsx             # React Router hierarchy
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── database/
│   ├── migrations/             # Sequential SQL migration files (001 to 004)
│   └── seeds/                  # Initial academic seed dataset
├── scripts/
│   ├── deploy-gcp.sh           # Automated Google Cloud deployment script
│   └── test-all.sh             # Full test execution script
├── docker-compose.yml          # Local multi-container Docker environment
├── Dockerfile                  # Unified multi-stage production container
└── .env.example                # Documented configuration template
```

---

## 5. Local Setup & Installation

### Prerequisites
- Node.js (v18+) and npm (v9+)
- PostgreSQL (v14+) running locally OR Docker Desktop

### Option A: Running with Local Node.js & PostgreSQL

1. **Clone and Install Dependencies**:
   ```bash
   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   cd ..
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env to set your PostgreSQL DB credentials and JWT secret
   ```

3. **Run Database Migrations & Seeds**:
   ```bash
   npm run migrate
   npm run seed
   ```

4. **Start Development Servers**:
   ```bash
   # Starts backend on :8080 and frontend on :5173 concurrently
   npm run dev
   ```

5. **Access Application**:
   Open browser at [http://localhost:5173](http://localhost:5173)

---

### Option B: Running with Docker Compose

```bash
docker-compose up --build
```
Open [http://localhost:8080](http://localhost:8080) to access the production container.

---

## 6. Demonstration Accounts

The database seed provides predefined accounts for demonstration and evaluation:

| Role | Email | Password | Description |
|---|---|---|---|
| **Administrator** | `admin@university.edu` | `Admin@123` | Full university administrative & audit access |
| **Faculty** | `dr.smith@university.edu` | `Faculty@123` | Prof. Dr. Robert Smith (Computer Science Lead) |
| **Faculty** | `prof.davis@university.edu` | `Faculty@123` | Prof. Sarah Davis (Information Technology) |
| **Student** | `student.alex@university.edu` | `Student@123` | Alex Johnson (CS Sem 5, Roll: `CS2024-001`) |
| **Student** | `student.emma@university.edu` | `Student@123` | Emma Williams (CS Sem 5, Roll: `CS2024-002`) |

*(Quick-login buttons are also available directly on the login screen for instant demonstration).*

---

## 7. REST API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials, returns JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated session profile |
| `POST` | `/api/auth/logout` | Authenticated | Invalidates session and logs audit event |
| `GET` | `/api/dashboard` | Authenticated | Role-tailored dynamic KPIs from database |
| `GET` | `/api/students` | Admin, Faculty | Paginated student list with search and filters |
| `GET` | `/api/students/:id` | Admin, Faculty, Student (Self) | Complete student academic details and enrollments |
| `POST` | `/api/students` | Admin | Atomic creation of student user and academic profile |
| `PATCH` | `/api/students/:id` | Admin | Updates student profile and semester |
| `DELETE` | `/api/students/:id` | Admin | Deactivates student account |
| `GET` | `/api/faculty` | Admin, Faculty | List faculty members and assigned courses |
| `GET` | `/api/faculty/:id` | Admin, Faculty (Self) | Faculty profile and teaching load |
| `POST` | `/api/faculty` | Admin | Registers new faculty member |
| `GET` | `/api/courses` | Authenticated | Course curriculum catalog |
| `GET` | `/api/courses/:id` | Authenticated | Course details and enrolled student roster |
| `POST` | `/api/courses` | Admin | Creates new course with credits and faculty lead |
| `POST` | `/api/enrollments` | Admin | Enrolls a student in a course for an academic year |
| `GET` | `/api/attendance` | Authenticated | Queries attendance records for date/course/student |
| `POST` | `/api/attendance` | Admin, Faculty (Assigned) | Bulk submits or updates daily attendance |
| `GET` | `/api/marks` | Authenticated | Retrieves marks roster for a course & assessment |
| `POST` | `/api/marks` | Admin, Faculty (Assigned) | Bulk records or updates student assessment marks |
| `GET` | `/api/reports` | Admin, Faculty | Aggregate analytics: pass rates, attendance averages |
| `GET` | `/api/audit-logs` | Admin | System audit trail with action, actor, and date filters |
| `GET` | `/api/health` | Public | Liveness probe and Cloud SQL connectivity check |

---

## 8. Google Cloud Deployment Guide

An automated deployment script is provided at `scripts/deploy-gcp.sh`.

### Manual Step-by-Step GCP Deployment:

1. **Set Active Project**:
   ```bash
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```

2. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     sqladmin.googleapis.com \
     secretmanager.googleapis.com \
     cloudbuild.googleapis.com
   ```

3. **Provision Cloud SQL for PostgreSQL**:
   ```bash
   gcloud sql instances create cloud-sms-postgres-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1

   gcloud sql databases create cloud_sms --instance=cloud-sms-postgres-db
   ```

4. **Store Secrets in Google Secret Manager**:
   ```bash
   echo -n "YOUR_SUPER_SECURE_JWT_SECRET_KEY" | gcloud secrets create SMS_JWT_SECRET --data-file=-
   ```

5. **Build and Deploy to Cloud Run**:
   ```bash
   # Submit build to Google Cloud Build
   gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/cloud-student-management-system:latest

   # Deploy to Cloud Run with Cloud SQL connection
   gcloud run deploy cloud-student-management-system \
     --image gcr.io/YOUR_GCP_PROJECT_ID/cloud-student-management-system:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --add-cloudsql-instances=YOUR_GCP_PROJECT_ID:us-central1:cloud-sms-postgres-db \
     --set-env-vars="NODE_ENV=production,PORT=8080,DB_NAME=cloud_sms,DB_USER=postgres,DB_SOCKET_PATH=/cloudsql/YOUR_GCP_PROJECT_ID:us-central1:cloud-sms-postgres-db" \
     --set-secrets="JWT_SECRET=SMS_JWT_SECRET:latest"
   ```

---

## 9. Testing & Verification

To execute backend security and unit tests:
```bash
npm test
```

To validate frontend production bundling:
```bash
npm run build
```

---

## 10. Security & Compliance Checklist

- [x] Passwords securely hashed with `bcrypt` (10 rounds).
- [x] Role-Based Access Control enforced at the API route level via middleware.
- [x] Database queries strictly parameterized using `pg` (Zero SQL injection vulnerability).
- [x] Security headers enforced with `helmet`.
- [x] Rate limiting configured on authentication endpoints (brute-force defense).
- [x] Sensitive parameters (`password`, `token`, `secret`) automatically redacted from Cloud logs.
- [x] Cloud Run instances run 100% statelessly without relying on container disk storage.
