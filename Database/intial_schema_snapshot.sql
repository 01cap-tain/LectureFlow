

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE lecture_status AS ENUM (
    'scheduled',
    'cancelled',
    'postponed',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at current
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- faculties
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS faculties (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_faculties_updated_at ON faculties;
CREATE TRIGGER trg_faculties_updated_at
  BEFORE UPDATE ON faculties
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  faculty_id    INTEGER NOT NULL REFERENCES faculties (id) ON DELETE RESTRICT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_departments_name_faculty UNIQUE (name, faculty_id)
);

CREATE INDEX IF NOT EXISTS idx_departments_faculty_id ON departments (faculty_id);

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS venues (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  location      VARCHAR(255) NOT NULL,
  capacity      INTEGER NOT NULL CHECK (capacity > 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_venues_updated_at ON venues;
CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
  id              SERIAL PRIMARY KEY,
  course_code     VARCHAR(20) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  department_id   INTEGER NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  level           SMALLINT NOT NULL CHECK (level IN (100, 200, 300, 400, 500, 600)),
  semester        SMALLINT NOT NULL CHECK (semester IN (1, 2)),
  type            VARCHAR(50) NOT NULL,
  academic_year   VARCHAR(9) NOT NULL, -- e.g. 2025/2026
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_courses_code_year UNIQUE (course_code, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses (department_id);
CREATE INDEX IF NOT EXISTS idx_courses_student_filter
  ON courses (department_id, level, semester, academic_year)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(150), -- optional for students; required for admin/moderator
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL,
  department_id     INTEGER REFERENCES departments (id) ON DELETE SET NULL,
  matric_no         VARCHAR(50) UNIQUE,
  level             SMALLINT CHECK (level IS NULL OR level IN (100, 200, 300, 400, 500, 600)),
  current_semester  SMALLINT CHECK (current_semester IS NULL OR current_semester IN (1, 2)),
  phone             VARCHAR(30),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Name is required for admin/moderator only (not for students)
  CONSTRAINT chk_staff_name CHECK (
    role = 'student' OR name IS NOT NULL
  ),

  -- Students: matric_no required at signup (department/level/semester filled later on profile)
  CONSTRAINT chk_student_profile CHECK (
    role <> 'student' OR matric_no IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_users_department_id ON users (department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_student_filter
  ON users (department_id, level, current_semester)
  WHERE role = 'student' AND is_active = TRUE;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- lectures
-- One-off daily scheduling only (no recurrence).
-- Prefer status changes over hard deletes.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lectures (
  id              SERIAL PRIMARY KEY,
  course_id       INTEGER NOT NULL REFERENCES courses (id) ON DELETE RESTRICT,
  lecturer_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  venue_id        INTEGER NOT NULL REFERENCES venues (id) ON DELETE RESTRICT,
  department_id   INTEGER NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  date            DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  status          lecture_status NOT NULL DEFAULT 'scheduled',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_lectures_time_order CHECK (end_time > start_time)
);

-- Conflict detection / live status: look up by venue + day among active schedules
CREATE INDEX IF NOT EXISTS idx_lectures_venue_date_status
  ON lectures (venue_id, date, status)
  WHERE status IN ('scheduled', 'postponed');

CREATE INDEX IF NOT EXISTS idx_lectures_lecturer_id ON lectures (lecturer_id);
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures (course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_department_date ON lectures (department_id, date);
CREATE INDEX IF NOT EXISTS idx_lectures_date_status ON lectures (date, status);

DROP TRIGGER IF EXISTS trg_lectures_updated_at ON lectures;
CREATE TRIGGER trg_lectures_updated_at
  BEFORE UPDATE ON lectures
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
