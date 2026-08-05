# AI-Based Student Management System

A modern, full-stack student management platform with AI-powered insights, role-based dashboards, and comprehensive academic management tools.

## Features

- **Multi-role Authentication**: JWT-based auth for Students, Teachers, Parents, and Admins
- **Attendance System**: Mark, track, and auto-alert on low attendance (< 75%)
- **Assignment Module**: Create, submit, grade assignments with file uploads
- **Fee Management**: Track fees, mark payments, generate PDF receipts
- **Exam & Practicals**: Schedule, manage marks, bulk upload results
- **Timetable Management**: Create and view class timetables
- **Leave Applications**: Submit and approve/reject leave requests
- **Notices & Notifications**: Broadcast notices, real-time notification bell
- **AI Chatbot**: Rule-based chatbot that queries live data
- **AI Insights**: ML-based performance prediction, attendance trend, study recommendations
- **Analytics Dashboards**: Role-specific analytics with charts (Chart.js)
- **Export**: Excel exports via openpyxl, PDF receipts via ReportLab
- **Dark Mode**: Full dark mode support via Tailwind CSS
- **Responsive Design**: Mobile-friendly sidebar drawer + desktop layout

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+) |
| Database | SQLAlchemy (SQLite / Supabase PostgreSQL) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| ML | scikit-learn, numpy, pandas |
| Email | aiosmtplib |
| PDF | ReportLab |
| Excel | openpyxl |
| Frontend | React 18 + React Router v6 |
| Styling | Tailwind CSS 3.4 |
| Charts | Chart.js + react-chartjs-2 |

---

## Prerequisites

- **Python** 3.11+
- **Node.js** 18+ & npm
- **MongoDB** 6.0+ (running locally or Atlas connection string)
- **Redis** (optional — for future caching)

---

## Installation

### Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env
# Edit .env with your MongoDB URL, JWT secret, SMTP credentials, etc.

# Start the backend server (http://localhost:8000)
python run.py
```

The API will be available at `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start the development server (http://localhost:3000)
npm start
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
APP_NAME=Student Management System
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=student_management

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

OPENAI_API_KEY=your-openai-key       # Optional
UPLOAD_DIR=uploads
FRONTEND_URL=http://localhost:3000
```

---

## Default Demo Accounts

After first run, register accounts via the API or UI. Use these role identifiers:

| Role | Register Endpoint |
|---|---|
| Student | `POST /api/auth/register/student` |
| Teacher | `POST /api/auth/register/teacher` |
| Parent | `POST /api/auth/register/parent` |
| Admin | `POST /api/auth/register/admin` |

---

## Project Structure

```
rag pipeline/
├── backend/
│   ├── app/
│   │   ├── models/          # Pydantic models
│   │   ├── routers/         # FastAPI route handlers (15 routers)
│   │   ├── services/        # Business logic (AI, PDF, email, chatbot)
│   │   ├── utils/           # Helpers, auth dependencies
│   │   ├── config.py        # Settings via pydantic-settings
│   │   ├── database.py      # MongoDB connection & indexes
│   │   └── main.py          # FastAPI app entry point
│   ├── run.py               # Uvicorn server entry point
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/      # Layout, Sidebar, Navbar, Chatbot, Modal, etc.
    │   ├── context/         # AuthContext, ThemeContext, NotificationContext
    │   ├── pages/
    │   │   ├── auth/        # Login, Register, ForgotPassword
    │   │   ├── student/     # Dashboard, Attendance, Assignments, Fees, Exams, etc.
    │   │   ├── teacher/     # Dashboard, AttendanceManagement, Assignments, Marks, etc.
    │   │   ├── parent/      # Dashboard
    │   │   ├── admin/       # Dashboard, StudentManagement, TeacherManagement, etc.
    │   │   └── common/      # Notices
    │   ├── services/        # Axios-based API service functions
    │   ├── App.jsx          # Root with React Router + lazy loading
    │   └── index.css        # Tailwind + custom component classes
    ├── package.json
    └── tailwind.config.js
```

---

## API Overview

| Module | Base Path |
|---|---|
| Auth | `/api/auth/` |
| Students | `/api/students/` |
| Teachers | `/api/teachers/` |
| Parents | `/api/parents/` |
| Attendance | `/api/attendance/` |
| Assignments | `/api/assignments/` |
| Fees | `/api/fees/` |
| Leaves | `/api/leaves/` |
| Notices | `/api/notices/` |
| Notifications | `/api/notifications/` |
| Timetable | `/api/timetable/` |
| Exams | `/api/exams/` |
| Chatbot | `/api/chatbot/` |
| AI Insights | `/api/ai/` |
| Analytics | `/api/analytics/` |

---

## License

MIT
