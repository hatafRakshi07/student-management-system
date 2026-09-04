# 🎓 Enterprise Student Management & College ERP System

[![Production Ready](https://img.shields.io/badge/Production-Ready-emerald?style=for-the-badge&logo=shield)](https://college-erp-management1.vercel.app/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

A state-of-the-art, enterprise-grade College ERP and Student Management System built for modern higher education institutions. Features multi-role authentication (Admin, Teacher, Student, Parent), AI insights, event financial budgeting, digital study notes, biometric attendance, double-entry accounting, and cloud object storage.

---

## 🌟 Key Modules & Capabilities

### 1. 👨‍🎓 Student Portal
* **Real-Time Academic Dashboard:** Attendance %, current SGPA/CGPA, fee ledger, and upcoming class timetable.
* **Study Notes & Materials (`/student/notes`):** Search, filter by semester/subject, and download lecture notes and question banks uploaded by professors.
* **Fee Payment & Receipts:** Live fee balance, online payment receipts with PDF generation.
* **Assignments & Exams:** View assignments, submit files directly to cloud storage, and view graded marksheets.
* **AI Campus Assistant:** Integrated AI study coach and academic predictive insights (NVIDIA NIM / Google Gemini).

### 2. 👩‍🏫 Faculty & Teacher Portal
* **Study Notes Management (`/teacher/notes`):** Upload lecture PDFs, Word files, and PPTs with class/semester targeting directly to cloud storage.
* **Attendance Management:** Daily student attendance with instant auto-alerts on low attendance (<75%).
* **Assignment Grading:** Create homework, set deadlines, and grade student submissions with custom feedback.
* **Marks & Practicals:** Internal assessments, practical evaluations, and exam mark entries.
* **Biometric Attendance:** Faculty check-in tracking and leave application management.

### 3. 🏛️ Admin Command Center & Accounting
* **Event & Function Financial Ledger (`/admin/accounting` $\rightarrow$ Event Ledger):**
  * Manage College Events (*Fresher's Party*, *Farewell Gala*, *Annual Fest*, *Sports Meet*).
  * Track **Amount Collections (Revenue & Inflows):** Student pass contributions, sponsorships, college grants.
  * Track **Expenditures & Outflows:** DJ & Sound, Catering & Buffet, Stage Decoration, Photography, Gifts & Sashes.
  * Live **Net Balance (Surplus / Deficit)** and itemized ledger audit.
* **Double-Entry General Ledger:** Cash book, chart of accounts, bank accounts liquidity, and trial balance statements.
* **Comprehensive Fee ERP:** Demand generation, fee concessions, scholar registration tracking, and reconciliation.
* **Academic Planner & Timetable:** Section allocation, classroom scheduling, and workload optimization.
* **HR & Payroll:** Staff payroll calculation, bank details, and leave balances.
* **Campus Facilities:** Central library management, hostel room allotments, and inventory asset tracking.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client[React 18 + Tailwind PWA Client] --> |HTTPS / JSON| API[FastAPI High-Performance Gateway]
    Client --> |WSS| WebSocket[FastAPI Real-Time WebSocket]
    
    API --> Security[JWT Auth + Bcrypt + Rate Limiter]
    Security --> Router[FastAPI Routers: Auth, Notes, Fees, Events, Attendance]
    
    Router --> DB[(Supabase PostgreSQL Database)]
    Router --> CloudStorage[Supabase Object Storage / S3]
    Router --> Cache[(Redis Cache & Token Blacklist)]
    Router --> AI[NVIDIA NIM & Google Gemini AI]
```

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, React Router v6, Lucide Icons, Radix UI, Recharts, Tailwind CSS |
| **PWA** | Vite PWA Plugin, Offline Service Worker, Web App Manifest |
| **Backend** | FastAPI (Python 3.10+ / 3.11+), Pydantic v2 Settings |
| **Database** | Supabase Cloud PostgreSQL, SQLAlchemy 2.0 ORM, SQLite fallback |
| **Distributed Cache** | Redis (for distributed rate limiting & token revocation blacklist) |
| **Object Storage** | Supabase Storage / S3 / Cloudinary for PDFs, avatars, submissions |
| **AI Providers** | NVIDIA NIM (`nemotron-3.5-lightning`) & Google Gemini 1.5 |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Python** 3.10 or higher
* **Node.js** 18+ & npm
* **PostgreSQL** database (or [Supabase](https://supabase.com))

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
# Fill in your DATABASE_URL, SECRET_KEY, SUPABASE_URL, etc.

# Start backend dev server
uvicorn app.main:app --reload --port 8000
```
* **API Documentation (Swagger):** `http://localhost:8000/docs`
* **Alternative Docs (ReDoc):** `http://localhost:8000/redoc`

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
* **Frontend App:** `http://localhost:5173`

---

## 🔐 Environment Variables (`.env`)

```env
APP_NAME=Student Management System
DEBUG=False

# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-32-char-strong-random-secret-key

# Production security: MUST be false in live deployments
ENABLE_DEMO_AUTH=false

# Database connection string
DATABASE_URL=postgresql+psycopg2://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase API & Cloud Object Storage
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=sms-uploads

# Redis (optional — for distributed rate limiting & token invalidation)
REDIS_URL=redis://localhost:6379/0

# AI Configuration
NVIDIA_API_KEY=your-nvidia-api-key
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL for CORS
FRONTEND_URL=https://college-erp-management1.vercel.app
```

---

## 🧪 Testing & Verification

```bash
# Run backend automated pytest suite
pytest backend/tests/ -v

# Run frontend production build test
cd frontend
npm run build
```

---

## 📦 Production Deployment

### Deploying Frontend on Vercel
1. Link your GitHub repository to [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`, Output Directory: `dist`.

### Deploying Backend on Render / VPS / Docker
1. Deploy with `Dockerfile` or Render Web Service using `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
2. Configure all environment variables in your hosting provider's dashboard.

---

## 📄 License
This project is licensed under the MIT License.
