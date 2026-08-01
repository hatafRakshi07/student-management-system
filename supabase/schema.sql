-- =============================================================
--  AKLANK COLLEGE — SUPABASE DATABASE SCHEMA
--  Paste this entire file into Supabase → SQL Editor → Run
-- =============================================================


-- =============================================================
-- 0. EXTENSIONS
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- 1. ENUM TYPES
-- =============================================================
CREATE TYPE user_role         AS ENUM ('student', 'teacher', 'admin', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE exam_type         AS ENUM ('midterm', 'final', 'quiz', 'practical');
CREATE TYPE fee_status        AS ENUM ('paid', 'unpaid', 'partial', 'overdue');
CREATE TYPE leave_status      AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'late');
CREATE TYPE target_role       AS ENUM ('all', 'student', 'teacher', 'parent', 'admin');


-- =============================================================
-- 2. HELPER: auto-update updated_at column
-- =============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- =============================================================
-- 3. TABLES
-- =============================================================

-- ── 3.1  users ──────────────────────────────────────────────
CREATE TABLE users (
  id                  BIGSERIAL PRIMARY KEY,
  email               VARCHAR(255) UNIQUE NOT NULL,
  hashed_password     VARCHAR(255) NOT NULL,
  full_name           VARCHAR(255) NOT NULL,
  role                user_role    NOT NULL,
  phone               VARCHAR(20),
  profile_photo       TEXT,
  is_active           BOOLEAN      DEFAULT TRUE,
  reset_token         VARCHAR(255),
  reset_token_expiry  TIMESTAMPTZ,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ── 3.2  student_profiles ───────────────────────────────────
CREATE TABLE student_profiles (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roll_number   VARCHAR(50) UNIQUE NOT NULL,
  department    VARCHAR(100),
  class_name    VARCHAR(100),
  section       VARCHAR(20),
  semester      SMALLINT,
  year          SMALLINT,
  parent_email  VARCHAR(255),
  date_of_birth DATE,
  address       TEXT
);


-- ── 3.3  teacher_profiles ───────────────────────────────────
CREATE TABLE teacher_profiles (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id      VARCHAR(50) UNIQUE NOT NULL,
  department       VARCHAR(100),
  qualification    VARCHAR(255),
  experience_years SMALLINT,
  subjects_taught  TEXT
);


-- ── 3.4  subjects ───────────────────────────────────────────
CREATE TABLE subjects (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50) UNIQUE NOT NULL,
  teacher_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  class_name  VARCHAR(100),
  section     VARCHAR(20),
  semester    SMALLINT,
  credits     SMALLINT DEFAULT 3
);


-- ── 3.5  timetable ──────────────────────────────────────────
CREATE TABLE timetable (
  id          BIGSERIAL PRIMARY KEY,
  class_name  VARCHAR(100) NOT NULL,
  section     VARCHAR(20),
  subject_id  BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  day_of_week VARCHAR(15) NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  room        VARCHAR(50)
);


-- ── 3.6  attendance ─────────────────────────────────────────
CREATE TABLE attendance (
  id           BIGSERIAL PRIMARY KEY,
  student_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id   BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  date         DATE NOT NULL,
  status       attendance_status NOT NULL DEFAULT 'present',
  marked_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, date)
);


-- ── 3.7  exams ──────────────────────────────────────────────
CREATE TABLE exams (
  id               BIGSERIAL PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  subject_id       BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  exam_date        TIMESTAMPTZ NOT NULL,
  exam_type        exam_type NOT NULL DEFAULT 'midterm',
  total_marks      NUMERIC(6,2) DEFAULT 100,
  passing_marks    NUMERIC(6,2) DEFAULT 40,
  duration_minutes SMALLINT DEFAULT 180,
  class_name       VARCHAR(100),
  section          VARCHAR(20),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3.8  marks ──────────────────────────────────────────────
CREATE TABLE marks (
  id             BIGSERIAL PRIMARY KEY,
  student_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id        BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(6,2) NOT NULL,
  grade          VARCHAR(5),
  remarks        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, exam_id)
);


-- ── 3.9  fees ───────────────────────────────────────────────
CREATE TABLE fees (
  id             BIGSERIAL PRIMARY KEY,
  student_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  fee_type       VARCHAR(100) DEFAULT 'tuition',
  description    TEXT,
  due_date       TIMESTAMPTZ NOT NULL,
  payment_date   TIMESTAMPTZ,
  status         fee_status DEFAULT 'unpaid',
  transaction_id VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3.10  assignments ───────────────────────────────────────
CREATE TABLE assignments (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  deadline    TIMESTAMPTZ NOT NULL,
  subject_id  BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path   TEXT,
  max_marks   NUMERIC(6,2) DEFAULT 100,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3.11  submissions ───────────────────────────────────────
CREATE TABLE submissions (
  id             BIGSERIAL PRIMARY KEY,
  assignment_id  BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path      TEXT,
  text_content   TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT NOW(),
  grade          VARCHAR(10),
  feedback       TEXT,
  marks_obtained NUMERIC(6,2),
  status         submission_status DEFAULT 'submitted',
  UNIQUE(assignment_id, student_id)
);


-- ── 3.12  leaves ────────────────────────────────────────────
CREATE TABLE leaves (
  id             BIGSERIAL PRIMARY KEY,
  student_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  from_date      DATE NOT NULL,
  to_date        DATE NOT NULL,
  status         leave_status DEFAULT 'pending',
  applied_at     TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  review_remarks TEXT
);


-- ── 3.13  notices ───────────────────────────────────────────
CREATE TABLE notices (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  target_role   target_role DEFAULT 'all',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3.14  notifications ─────────────────────────────────────
CREATE TABLE notifications (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'general',
  is_read           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3.15  audit_logs ────────────────────────────────────────
CREATE TABLE audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  details    TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- 4. INDEXES
-- =============================================================
CREATE INDEX idx_users_role            ON users(role);
CREATE INDEX idx_users_is_active       ON users(is_active);
CREATE INDEX idx_student_roll          ON student_profiles(roll_number);
CREATE INDEX idx_student_class         ON student_profiles(class_name, section);
CREATE INDEX idx_teacher_dept          ON teacher_profiles(department);
CREATE INDEX idx_subjects_code         ON subjects(code);
CREATE INDEX idx_subjects_class        ON subjects(class_name, semester);
CREATE INDEX idx_timetable_class       ON timetable(class_name, day_of_week);
CREATE INDEX idx_attendance_student    ON attendance(student_id);
CREATE INDEX idx_attendance_date       ON attendance(date);
CREATE INDEX idx_attendance_subject    ON attendance(subject_id);
CREATE INDEX idx_attendance_student_dt ON attendance(student_id, date);
CREATE INDEX idx_exams_subject         ON exams(subject_id);
CREATE INDEX idx_exams_date            ON exams(exam_date);
CREATE INDEX idx_marks_student         ON marks(student_id);
CREATE INDEX idx_marks_exam            ON marks(exam_id);
CREATE INDEX idx_fees_student          ON fees(student_id);
CREATE INDEX idx_fees_status           ON fees(status);
CREATE INDEX idx_fees_due_date         ON fees(due_date);
CREATE INDEX idx_assignments_teacher   ON assignments(teacher_id);
CREATE INDEX idx_assignments_subject   ON assignments(subject_id);
CREATE INDEX idx_submissions_student   ON submissions(student_id);
CREATE INDEX idx_leaves_student        ON leaves(student_id);
CREATE INDEX idx_leaves_status         ON leaves(status);
CREATE INDEX idx_notices_role          ON notices(target_role);
CREATE INDEX idx_notifs_user           ON notifications(user_id);
CREATE INDEX idx_notifs_unread         ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_audit_user            ON audit_logs(user_id);
CREATE INDEX idx_audit_created         ON audit_logs(created_at DESC);


-- =============================================================
-- 5. VIEWS (useful for analytics)
-- =============================================================

-- Attendance summary per student
CREATE VIEW v_attendance_summary AS
SELECT
  u.id            AS student_id,
  u.full_name,
  sp.roll_number,
  sp.class_name,
  sp.section,
  COUNT(*)                                          AS total_classes,
  COUNT(*) FILTER (WHERE a.status = 'present')      AS present_count,
  COUNT(*) FILTER (WHERE a.status = 'absent')       AS absent_count,
  ROUND(
    COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 2
  )                                                 AS attendance_pct
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
LEFT JOIN attendance a ON a.student_id = u.id
GROUP BY u.id, u.full_name, sp.roll_number, sp.class_name, sp.section;


-- Fee summary per student
CREATE VIEW v_fee_summary AS
SELECT
  u.id                                                            AS student_id,
  u.full_name,
  sp.roll_number,
  COALESCE(SUM(f.amount), 0)                                     AS total_amount,
  COALESCE(SUM(f.amount) FILTER (WHERE f.status = 'paid'), 0)    AS paid_amount,
  COALESCE(SUM(f.amount) FILTER (WHERE f.status != 'paid'), 0)   AS pending_amount
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
LEFT JOIN fees f ON f.student_id = u.id
GROUP BY u.id, u.full_name, sp.roll_number;


-- =============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- NOTE: The FastAPI backend uses the SERVICE_ROLE key which
--       bypasses RLS. Policies below protect direct client access.
-- =============================================================

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's DB row id from JWT email claim
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS BIGINT
LANGUAGE sql STABLE AS $$
  SELECT id FROM users WHERE email = auth.jwt() ->> 'email' LIMIT 1;
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_user_role() RETURNS user_role
LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE email = auth.jwt() ->> 'email' LIMIT 1;
$$;

-- ── users ──
-- Users can read their own row; admins read all
CREATE POLICY "users_select_own"  ON users FOR SELECT USING (
  id = auth_user_id() OR auth_user_role() = 'admin'
);
CREATE POLICY "users_update_own"  ON users FOR UPDATE USING (
  id = auth_user_id()
);

-- ── student_profiles ──
CREATE POLICY "sp_select" ON student_profiles FOR SELECT USING (
  user_id = auth_user_id()
  OR auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "sp_update_own" ON student_profiles FOR UPDATE USING (
  user_id = auth_user_id()
);

-- ── teacher_profiles ──
CREATE POLICY "tp_select" ON teacher_profiles FOR SELECT USING (
  user_id = auth_user_id()
  OR auth_user_role() = 'admin'
);

-- ── subjects — all authenticated users can read ──
CREATE POLICY "subjects_read" ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "subjects_write" ON subjects FOR ALL USING (
  auth_user_role() IN ('admin', 'teacher')
);

-- ── timetable — all can read ──
CREATE POLICY "timetable_read"  ON timetable FOR SELECT USING (TRUE);
CREATE POLICY "timetable_write" ON timetable FOR ALL USING (
  auth_user_role() = 'admin'
);

-- ── attendance ──
CREATE POLICY "attendance_student_read" ON attendance FOR SELECT USING (
  student_id = auth_user_id()
  OR auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "attendance_teacher_write" ON attendance FOR INSERT WITH CHECK (
  auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "attendance_teacher_update" ON attendance FOR UPDATE USING (
  auth_user_role() IN ('admin', 'teacher')
);

-- ── exams — all can read ──
CREATE POLICY "exams_read"  ON exams FOR SELECT USING (TRUE);
CREATE POLICY "exams_write" ON exams FOR ALL USING (
  auth_user_role() IN ('admin', 'teacher')
);

-- ── marks ──
CREATE POLICY "marks_student_read" ON marks FOR SELECT USING (
  student_id = auth_user_id()
  OR auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "marks_write" ON marks FOR ALL USING (
  auth_user_role() IN ('admin', 'teacher')
);

-- ── fees ──
CREATE POLICY "fees_student_read" ON fees FOR SELECT USING (
  student_id = auth_user_id()
  OR auth_user_role() = 'admin'
);
CREATE POLICY "fees_admin_write" ON fees FOR ALL USING (
  auth_user_role() = 'admin'
);

-- ── assignments — all can read active ones ──
CREATE POLICY "assignments_read" ON assignments FOR SELECT USING (
  is_active = TRUE OR auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "assignments_write" ON assignments FOR ALL USING (
  auth_user_role() IN ('admin', 'teacher')
);

-- ── submissions ──
CREATE POLICY "submissions_student" ON submissions FOR SELECT USING (
  student_id = auth_user_id()
  OR auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "submissions_insert" ON submissions FOR INSERT WITH CHECK (
  student_id = auth_user_id()
);

-- ── leaves ──
CREATE POLICY "leaves_student" ON leaves FOR SELECT USING (
  student_id = auth_user_id()
  OR auth_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "leaves_insert" ON leaves FOR INSERT WITH CHECK (
  student_id = auth_user_id()
);
CREATE POLICY "leaves_review" ON leaves FOR UPDATE USING (
  auth_user_role() IN ('admin', 'teacher')
);

-- ── notices — all authenticated users read active notices ──
CREATE POLICY "notices_read" ON notices FOR SELECT USING (
  is_active = TRUE
  AND (target_role = 'all' OR target_role::TEXT = auth_user_role()::TEXT)
);
CREATE POLICY "notices_write" ON notices FOR ALL USING (
  auth_user_role() = 'admin'
);

-- ── notifications — own only ──
CREATE POLICY "notifs_own" ON notifications FOR ALL USING (
  user_id = auth_user_id()
);

-- ── audit_logs — admin only ──
CREATE POLICY "audit_admin" ON audit_logs FOR SELECT USING (
  auth_user_role() = 'admin'
);


-- =============================================================
-- 7. STORAGE BUCKETS
-- Run this in Supabase Dashboard → Storage OR via SQL
-- =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-photos', 'profile-photos', TRUE,  2097152,  ARRAY['image/jpeg','image/png','image/webp']),
  ('assignments',    'assignments',    FALSE, 10485760, ARRAY['application/pdf','image/jpeg','image/png','application/zip']),
  ('submissions',    'submissions',    FALSE, 10485760, ARRAY['application/pdf','image/jpeg','image/png','application/zip'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: students upload their own submission files
CREATE POLICY "submissions_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

CREATE POLICY "submissions_own_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "profile_photos_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');


-- =============================================================
-- 8. SEED: Default admin (update password after first login)
-- Generate real bcrypt hash:  python -c "from passlib.hash import bcrypt; print(bcrypt.hash('Admin@123'))"
-- =============================================================
INSERT INTO users (email, hashed_password, full_name, role, is_active)
VALUES (
  'admin@aklankcollege.com',
  '$2b$12$mQWGfbwqtL6QXwpSLG1Q6ei2gZL1LOIbSBtSsZASgBcU1hhRGgTeO',
  'College Admin',
  'admin',
  TRUE
);
