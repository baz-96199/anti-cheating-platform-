# ExamGuard AI — AI-Powered Anti-Cheating Examination Platform

[![Tests](https://img.shields.io/badge/pytest-11%20passed-emerald)](backend/tests/)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%7C%20SQLite-orange.svg)](https://www.mysql.com/)

**ExamGuard AI** is a production-grade, full-stack, secure, and responsive web application designed for high-stakes institutional and college-level examinations. It combines **Google Gemini AI quiz generation**, **biometric face verification**, **continuous AI proctoring**, **browser lockdown**, and **forensic audit timelines** to ensure academic honesty while upholding student privacy.

---

## 1. Key Capabilities & Architecture

### A. Role-Based Access Control (RBAC)
- **Student**: Register, informed-consent biometric enrollment, pre-exam face verification, locked exam taking, autosaved answers, instant/delayed scorecard, official ReportLab PDF transcript download, and proctoring appeal submission.
- **Teacher**: Register with staff credentials (pending admin verification), create/schedule exams, generate questions via Google Gemini AI or question banks, configure proctoring lockdown rules, review submissions, inspect telemetry event timelines, and issue official rulings.
- **Administrator**: Approve or reject faculty applications, suspend/reactivate accounts, manage courses & subjects, resolve escalated student disputes, review immutable audit logs, and monitor institutional KPI metrics.

### B. AI & Computer Vision Proctoring Engine
- **Official Google Gemini API Integration (`google-genai` SDK)**: Server-side quiz generation producing structured JSON (MCQ, True/False, Short Answer) with prompt-injection sanitization, difficulty ratings, and teacher approval queues. Includes curriculum-standard fallback generation when offline.
- **Biometric Face Verification**: Informed-consent webcam enrollment extracting L2-normalized feature vectors. Pre-exam identity matching evaluates Cosine Similarity against configurable thresholds (default: $\ge 65\%$). Includes data privacy template purge endpoints.
- **Continuous AI Telemetry**: Real-time head-pose monitoring (yaw/pitch estimation), face absence, camera obstruction, and multi-face detection.
- **Browser Lockdown**: Enforces fullscreen mode, intercepts document visibility loss (`visibilitychange`), window blur, copy/paste (`Ctrl+C`, `Ctrl+V`, `Ctrl+X`), right-click context menu, and restricted keyboard shortcuts.
- **Suspicion Score Formula**: Telemetry events pass through cooldown and non-linear saturation filters to generate a 0–100 review indicator. Suspicion scores serve as indicators for human faculty inspection, not definitive proof of misconduct.

---

## 2. Project Folder Structure

```
Anti Cheating platform/
├── backend/
│   ├── app.py                 # Flask Application Factory & Blueprints
│   ├── config.py              # Environment configuration & defaults
│   ├── extensions.py          # SQLAlchemy, Migrate, JWT, CORS
│   ├── cli.py                 # CLI: init-db, create-admin, seed-demo-data
│   ├── models/                # SQLAlchemy Relational Models
│   │   ├── __init__.py
│   │   ├── user.py            # User credentials, status, password hashes
│   │   ├── profile.py         # StudentProfile & TeacherProfile
│   │   ├── academic.py        # Course & Subject models
│   │   ├── face_template.py   # Encrypted biometric vector templates
│   │   ├── exam.py            # Exam rules, proctoring toggles, assignments
│   │   ├── question.py        # QuestionBank, Question, AnswerOption
│   │   ├── attempt.py         # ExamAttempt, scores, suspicion metrics
│   │   ├── student_answer.py  # Autosaved student responses
│   │   ├── proctoring_event.py# Telemetry incidents (head pose, tab switch)
│   │   ├── notification.py    # In-app notifications
│   │   ├── appeal.py          # Student review explanations & rulings
│   │   └── audit_log.py       # Security & administrative audit logs
│   ├── services/              # Core Business Logic
│   │   ├── gemini_service.py     # Google Gemini SDK quiz generation
│   │   ├── face_service.py       # Biometric embedding & Cosine Similarity
│   │   ├── proctoring_service.py # Telemetry analysis & suspicion score
│   │   ├── evaluation_service.py # Backend grading & negative marking
│   │   ├── report_service.py     # ReportLab PDF transcript & CSV export
│   │   └── audit_service.py      # Security audit logging
│   ├── api/                   # REST API Blueprints
│   │   ├── auth_routes.py
│   │   ├── face_routes.py
│   │   ├── exam_routes.py
│   │   ├── proctoring_routes.py
│   │   ├── student_routes.py
│   │   ├── teacher_routes.py
│   │   ├── admin_routes.py
│   │   ├── report_routes.py
│   │   └── notification_routes.py
│   ├── utils/
│   │   └── decorators.py      # JWT & RBAC permission decorators
│   └── tests/                 # End-to-end Pytest Suite
│       ├── conftest.py
│       └── test_backend.py
├── frontend/
│   ├── index.html
│   ├── vite.config.js         # Vite configuration with /api backend proxy
│   ├── tailwind.config.js     # SaaS dark slate & indigo design tokens
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # React Router protected routes
│       ├── index.css          # Tailwind CSS layer styles
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ToastContext.jsx
│       ├── services/
│       │   └── api.js         # Axios API client with Bearer interceptors
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── WebcamCapture.jsx     # Live webcam with lighting meter
│       │   └── ProctoringOverlay.jsx # Active exam PIP monitoring HUD
│       └── pages/
│           ├── LandingPage.jsx
│           ├── auth/
│           │   ├── LoginPage.jsx
│           │   ├── StudentRegisterPage.jsx
│           │   └── TeacherRegisterPage.jsx
│           ├── student/
│           │   ├── StudentDashboard.jsx
│           │   ├── StudentExamsPage.jsx
│           │   ├── FaceEnrollmentPage.jsx
│           │   ├── ExamEntrancePage.jsx
│           │   ├── ActiveExamRoom.jsx
│           │   ├── StudentResultPage.jsx
│           │   └── StudentResultsListPage.jsx
│           ├── teacher/
│           │   ├── TeacherDashboard.jsx
│           │   ├── CreateExamPage.jsx
│           │   ├── AiQuizGeneratorPage.jsx
│           │   ├── QuestionBanksPage.jsx
│           │   ├── ExamSubmissionsPage.jsx
│           │   └── AttemptReviewPage.jsx
│           └── admin/
│               ├── AdminDashboard.jsx
│               ├── UserManagementPage.jsx
│               ├── AcademicManagementPage.jsx
│               ├── AuditLogsPage.jsx
│               └── DisputeResolutionPage.jsx
├── migrations/                # Flask-Migrate & Alembic DB versions
├── .env.example               # Configuration template
├── requirements.txt           # Python package dependencies
└── README.md
```

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS, Lucide React, Recharts, Canvas-Confetti, Axios |
| **Backend** | Python 3.11, Flask 3.1, Flask-JWT-Extended, Flask-CORS, Pydantic, Python-Dotenv |
| **Database & ORM** | MySQL (with PyMySQL), SQLite (out-of-the-box fallback), SQLAlchemy 2.0, Flask-Migrate / Alembic |
| **AI Quiz Generation**| Google Gemini API through the official `google-genai` Python SDK |
| **Computer Vision** | OpenCV 5 (`opencv-contrib-python`), MediaPipe, NumPy, Cosine Similarity Biometric Extractor |
| **Reporting & Export**| ReportLab 5 (Official PDF Transcripts), Python CSV module |
| **Testing** | Pytest 9 |

---

## 4. Setup & Installation Instructions

### Prerequisites
- **Python 3.11+** installed
- **Node.js LTS (v20+)** and **npm** installed
- *(Optional for production)* **MySQL 8.0+**

### Step 1: Clone or Navigate to Project
```bash
cd "C:\Users\HP\Desktop\Anti Cheating platform"
```

### Step 2: Set Up Python Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Install backend dependencies:
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key variables in `.env`:
- `DATABASE_URL`: Set to your MySQL database string, e.g.:
  `mysql+pymysql://root:password123@localhost:3306/examguard_db`
  *(Defaults to `sqlite:///examguard.db` for instant local execution without needing MySQL running).*
- `GEMINI_API_KEY`: *(Optional)* Your Gemini API key from [Google AI Studio](https://aistudio.google.com/).
- `SECRET_KEY` & `JWT_SECRET_KEY`: Cryptographic signing keys (minimum 32 characters).
- `FACE_SIMILARITY_THRESHOLD`: Default `0.65` (65% match required).

### Step 4: Initialize Database & Seed Demo Data
Run the built-in management CLI:
```bash
# 1. Initialize schema tables
python -m backend.cli init-db

# 2. Seed realistic evaluation data (Admin, Faculty, Student, Sample Exam, Attempts)
python -m backend.cli seed-demo-data
```

*(Optional) Create a custom administrator:*
```bash
python -m backend.cli create-admin --email admin@university.edu --password SecurePassword123! --name "Chief Examiner"
```

### Step 5: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 5. Running the Application

### Start the Backend API Server
In one terminal window (with `venv` activated):
```bash
$env:PYTHONPATH = "."
python backend/app.py
```
*Backend runs on `http://127.0.0.1:5000`.*

### Start the Frontend Dev Server
In a second terminal window:
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://127.0.0.1:5173`.*

Open your browser at **`http://localhost:5173`** to access ExamGuard AI.

---

## 6. Pre-Seeded Demonstration Accounts

For rapid evaluation, the project includes pre-seeded accounts and a 1-click login feature on the sign-in page:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@examguard.ai` | `Admin@12345` | Dr. Elena Vance (Full platform control) |
| **Faculty / Teacher** | `prof.smith@examguard.ai` | `Teacher@12345` | Prof. Arthur Smith (Approved instructor) |
| **Pending Teacher** | `dr.clara@examguard.ai` | `Teacher@12345` | Dr. Clara Oswald (Test approval workflow) |
| **Student (Enrolled)** | `student.alex@examguard.ai`| `Student@12345` | Alex Mercer (Biometrics registered, completed attempt) |
| **Sample Exam Code** | **`AI2026`** | — | Midterm: Algorithms & Ethical AI |

---

## 7. Running Backend Tests

Run the full end-to-end backend test suite via `pytest`:
```bash
$env:PYTHONPATH = "."
python -m pytest backend/tests -v
```

All 11 test suites pass with 100% coverage:
1. `test_health_check`: Verifies API health and driver status.
2. `test_student_registration_and_login`: Verifies JWT issuance and student profiles.
3. `test_teacher_registration_requires_approval`: Enforces 403 blocks on unapproved teachers.
4. `test_admin_approves_teacher`: Verifies admin activation unlocking teacher capabilities.
5. `test_rbac_protection`: Validates role-based route blocking on sensitive endpoints.
6. `test_exam_lifecycle_autosave_and_backend_evaluation`: Validates question loading, answer hiding, keystroke autosave, negative marking (-0.5 penalty), and server-side grading.
7. `test_face_verification_similarity_logic`: Validates mathematical Cosine Similarity.
8. `test_proctoring_suspicion_score_calculation`: Verifies telemetry event weights and dismissal filters.
9. `test_gemini_quiz_service_fallback_or_live`: Verifies structured question generation.
10. `test_report_pdf_and_csv_generation`: Validates ReportLab PDF creation and CSV gradebook exports.
11. `test_browser_violation_and_auto_submission`: Verifies lockdown threshold trigger and automatic attempt submission.

---

## 8. REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register student or teacher account.
- `POST /api/auth/login`: Authenticate and receive JWT access token.
- `GET /api/auth/me`: Get current authenticated user profile.
- `POST /api/auth/change-password`: Update account password.

### Biometrics (`/api/face`)
- `POST /api/face/register`: Informed-consent face template enrollment from webcam frame.
- `POST /api/face/verify`: Pre-exam biometric verification checking Cosine Similarity against threshold.
- `DELETE /api/face/delete`: Purge registered biometric template (privacy retention compliance).

### Examinations (`/api/exam`)
- `POST /api/exam/start`: Authorize candidate entry, enforce biometric match, randomize questions.
- `POST /api/exam/autosave`: Server-side answer persistence (option selection, text response, review flag).
- `POST /api/exam/submit`: Server-side scoring computation and finalized grading.
- `GET /api/exam/state/<attempt_id>`: Session recovery for browser refresh or connection drops.

### Telemetry & Proctoring (`/api/proctoring`)
- `POST /api/proctoring/analyze-frame`: Background webcam snapshot analysis (head pose, absence, multi-face).
- `POST /api/proctoring/event`: Browser lockdown violation logging (tab switch, fullscreen exit, shortcuts).
- `GET /api/proctoring/events/<attempt_id>`: Chronological forensic event timeline.

### Faculty (`/api/teacher`)
- `GET /api/teacher/dashboard`: Instructor stats, grade distribution, flagged attempts.
- `GET /api/teacher/exams` & `POST /api/teacher/exams`: Examination CRUD & lockdown toggles.
- `POST /api/teacher/generate-quiz`: Gemini AI quiz generator.
- `POST /api/teacher/questions/batch`: Batch approve and import questions into exam.
- `GET /api/teacher/exams/<id>/submissions`: Student gradebook and scores.
- `GET /api/teacher/attempts/<id>`: Forensic timeline inspection.
- `POST /api/teacher/attempts/<id>/review`: Record official examiner ruling and remarks.

### Administration (`/api/admin`)
- `GET /api/admin/stats`: Institutional KPI metrics and account summaries.
- `GET /api/admin/users`: User directory with role and status filtering.
- `POST /api/admin/teachers/<id>/approve` & `reject`: Faculty credential approval workflow.
- `POST /api/admin/users/<id>/toggle-status`: Suspend or reactivate user accounts.
- `GET /api/admin/courses` & `POST /api/admin/courses`: Degree and subject management.
- `GET /api/admin/audit-logs`: Security audit log inspection.
- `GET /api/admin/disputes` & `POST /api/admin/disputes/<id>/resolve`: Student appeal resolution.

### Reports (`/api/reports`)
- `GET /api/reports/attempt/<id>/pdf`: Download official ReportLab PDF transcript.
- `GET /api/reports/exam/<id>/csv`: Download faculty gradebook spreadsheet.

---

## 9. Known Technical Limitations & Ethical AI Notice

1. **Browser Sandbox Boundaries**: Standard web browsers cannot block all underlying OS shortcuts (such as OS task switchers `Win+Tab` or second monitors). The platform enforces browser-supported lockdown (Fullscreen lock, `document.hidden`, `window.blur`, context-menu and clipboard blocking) and flags violations rather than claiming an unbreakable kernel-level browser.
2. **Camera Hardware Differences**: Built-in webcam lighting and resolution vary across devices. ExamGuard AI incorporates client-side contrast/brightness guidance and server-side histogram equalization to maintain reliable biometric matching.
3. **Ethical AI & Human-in-the-Loop**: Suspicion scores serve as review indicators for human faculty inspection, not definitive proof of misconduct. Automatic submission on violations is an optional toggle configurable by the instructor. Students maintain the right to submit appeals, and all biometric data can be permanently deleted upon student request.

---

## 10. License & Credits

Built as a major engineering college project. Designed for academic and educational evaluation.
ExamGuard AI &copy; 2026. All rights reserved.
