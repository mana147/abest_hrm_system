-- =============================================================
-- HRM System - SQLite Schema
-- Hệ thống quản lý trung tâm đào tạo (ngoại ngữ / kỹ năng)
-- =============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- -----------------------------------------------------------
-- NHÓM 1: NGƯỜI DÙNG & PHÂN QUYỀN
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        VARCHAR(50)  NOT NULL UNIQUE,   -- admin, operator, teacher, accountant, sales
    description TEXT,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id       INTEGER      NOT NULL REFERENCES roles(id),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    phone         VARCHAR(20),
    email         VARCHAR(150),
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active | inactive | suspended
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- -----------------------------------------------------------
-- NHÓM 2: CƠ SỞ / CHI NHÁNH
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS branches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_code VARCHAR(20)  NOT NULL UNIQUE,
    branch_name VARCHAR(150) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',   -- active | inactive
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- NHÓM 3: NHÂN SỰ
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code  VARCHAR(30)  NOT NULL UNIQUE,
    full_name     VARCHAR(150) NOT NULL,
    date_of_birth DATE,
    gender        VARCHAR(10),                             -- male | female | other
    phone         VARCHAR(20),
    email         VARCHAR(150),
    address       TEXT,
    parent_name   VARCHAR(150),
    parent_phone  VARCHAR(20),
    source        VARCHAR(50),   -- walk_in | referral | facebook | zalo | website | other
    level_current VARCHAR(50),
    status        VARCHAR(20)  NOT NULL DEFAULT 'active', -- active | inactive | graduated | dropped
    note          TEXT,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_name   ON students(full_name);

CREATE TABLE IF NOT EXISTS teachers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_code VARCHAR(30)   NOT NULL UNIQUE,
    full_name    VARCHAR(150)  NOT NULL,
    phone        VARCHAR(20),
    email        VARCHAR(150),
    specialty    TEXT,          -- lưu dạng JSON array: ["TOEIC","IELTS"]
    teacher_type VARCHAR(20)   NOT NULL DEFAULT 'fulltime', -- fulltime | parttime | freelance
    hourly_rate  DECIMAL(10,2) NOT NULL DEFAULT 0,
    status       VARCHAR(20)   NOT NULL DEFAULT 'active',   -- active | inactive
    note         TEXT,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_code VARCHAR(30)  NOT NULL UNIQUE,
    full_name  VARCHAR(150) NOT NULL,
    department VARCHAR(100),  -- academic | sales | finance | admin | cs
    phone      VARCHAR(20),
    email      VARCHAR(150),
    position   VARCHAR(100),
    status     VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- NHÓM 4: MASTER DATA HỌC THUẬT
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code              VARCHAR(30)   NOT NULL UNIQUE,
    course_name              VARCHAR(150)  NOT NULL,
    level                    VARCHAR(50),   -- beginner | elementary | pre_intermediate | intermediate | upper_intermediate | advanced
    total_sessions           INTEGER       NOT NULL,
    session_duration_minutes INTEGER       NOT NULL DEFAULT 120,
    tuition_fee              DECIMAL(12,2) NOT NULL DEFAULT 0,
    description              TEXT,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'active',  -- active | inactive
    created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timeslots (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    timeslot_code    VARCHAR(30) NOT NULL UNIQUE,
    label            VARCHAR(100) NOT NULL,  -- "T2-T4-T6 18:00-20:00"
    weekdays_pattern VARCHAR(20)  NOT NULL,  -- "1,3,5"  (0=CN, 1=T2, ..., 6=T7)
    start_time       TIME         NOT NULL,
    end_time         TIME         NOT NULL,
    sessions_per_week INTEGER     NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS class_templates (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    template_code            VARCHAR(30)  NOT NULL UNIQUE,
    template_name            VARCHAR(150) NOT NULL,
    course_id                INTEGER      NOT NULL REFERENCES courses(id),
    sessions_per_week        INTEGER      NOT NULL,
    total_sessions           INTEGER      NOT NULL,
    session_duration_minutes INTEGER      NOT NULL DEFAULT 120,
    default_timeslot_id      INTEGER      REFERENCES timeslots(id),
    default_capacity         INTEGER      NOT NULL DEFAULT 15,
    note                     TEXT,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_class_templates_course ON class_templates(course_id);

CREATE TABLE IF NOT EXISTS classrooms (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code  VARCHAR(30)  NOT NULL UNIQUE,
    room_name  VARCHAR(100) NOT NULL,
    branch_id  INTEGER      REFERENCES branches(id),
    capacity   INTEGER      NOT NULL DEFAULT 20,
    room_type  VARCHAR(50)  NOT NULL DEFAULT 'classroom',  -- classroom | lab | meeting_room
    status     VARCHAR(20)  NOT NULL DEFAULT 'active',
    note       TEXT
);

CREATE INDEX IF NOT EXISTS idx_classrooms_branch ON classrooms(branch_id);

-- -----------------------------------------------------------
-- NHÓM 5: SCHEDULING — LÕI BÀI TOÁN XẾP LỊCH
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS schedule_lines (
    -- Đơn vị vận hành: 1 line = 1 phòng + 1 khung giờ (+ tuỳ chọn 1 course cố định)
    -- Khi 1 lớp kết thúc trên line, hệ thống tính ngay next_opening_available_date
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    line_code        VARCHAR(30)  NOT NULL UNIQUE,
    line_name        VARCHAR(150) NOT NULL,
    branch_id        INTEGER      REFERENCES branches(id),
    course_id        INTEGER      REFERENCES courses(id),        -- NULL = line linh hoạt cho nhiều course
    template_id      INTEGER      REFERENCES class_templates(id),-- NULL = linh hoạt
    classroom_id     INTEGER      NOT NULL REFERENCES classrooms(id),
    timeslot_id      INTEGER      NOT NULL REFERENCES timeslots(id),
    default_capacity INTEGER      NOT NULL DEFAULT 15,
    active           INTEGER      NOT NULL DEFAULT 1,            -- 1 = đang dùng | 0 = đã đóng
    note             TEXT,
    UNIQUE(classroom_id, timeslot_id)  -- mỗi cặp phòng+slot chỉ có 1 line
);

CREATE INDEX IF NOT EXISTS idx_schedule_lines_classroom ON schedule_lines(classroom_id);
CREATE INDEX IF NOT EXISTS idx_schedule_lines_timeslot  ON schedule_lines(timeslot_id);

CREATE TABLE IF NOT EXISTS classes (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id                     INTEGER      REFERENCES schedule_lines(id),
    class_code                  VARCHAR(30)  NOT NULL UNIQUE,
    class_name                  VARCHAR(150) NOT NULL,
    course_id                   INTEGER      NOT NULL REFERENCES courses(id),
    template_id                 INTEGER      REFERENCES class_templates(id),
    teacher_id                  INTEGER      REFERENCES teachers(id),
    classroom_id                INTEGER      NOT NULL REFERENCES classrooms(id),
    timeslot_id                 INTEGER      NOT NULL REFERENCES timeslots(id),
    start_date                  DATE         NOT NULL,
    expected_end_date           DATE,         -- tính từ start_date + total_sessions theo pattern
    resource_release_date       DATE,         -- = expected_end_date (hoặc + buffer)
    next_opening_available_date DATE,         -- ngày sớm nhất mở lớp kế tiếp trên cùng line
    total_sessions              INTEGER      NOT NULL,
    sessions_completed          INTEGER      NOT NULL DEFAULT 0,
    capacity                    INTEGER      NOT NULL DEFAULT 15,
    status                      VARCHAR(20)  NOT NULL DEFAULT 'planned',
    -- planned | open_enrollment | ongoing | completed | cancelled | postponed
    note                        TEXT,
    created_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_classes_line     ON classes(line_id);
CREATE INDEX IF NOT EXISTS idx_classes_status   ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_teacher  ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_start    ON classes(start_date);

CREATE TABLE IF NOT EXISTS class_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id     INTEGER  NOT NULL REFERENCES classes(id),
    session_no   INTEGER  NOT NULL,          -- thứ tự buổi học (1, 2, 3, ...)
    session_date DATE     NOT NULL,
    start_time   TIME     NOT NULL,
    end_time     TIME     NOT NULL,
    teacher_id   INTEGER  REFERENCES teachers(id),
    classroom_id INTEGER  REFERENCES classrooms(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- scheduled | completed | cancelled | rescheduled
    note         TEXT,
    UNIQUE(class_id, session_no)
);

CREATE INDEX IF NOT EXISTS idx_sessions_class  ON class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date   ON class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON class_sessions(status);

CREATE TABLE IF NOT EXISTS holidays (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    holiday_date DATE         NOT NULL UNIQUE,
    holiday_name VARCHAR(150) NOT NULL,
    is_active    INTEGER      NOT NULL DEFAULT 1  -- 1 = áp dụng | 0 = bỏ qua
);

CREATE TABLE IF NOT EXISTS room_blockings (
    -- Khoá phòng tạm thời (sự kiện, vệ sinh, sửa chữa...)
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    classroom_id INTEGER  NOT NULL REFERENCES classrooms(id),
    blocked_date DATE     NOT NULL,
    start_time   TIME,
    end_time     TIME,
    reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_room_blockings_classroom ON room_blockings(classroom_id, blocked_date);

-- -----------------------------------------------------------
-- NHÓM 6: GIAO DỊCH VẬN HÀNH HÀNG NGÀY
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS enrollments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id     INTEGER       NOT NULL REFERENCES students(id),
    class_id       INTEGER       NOT NULL REFERENCES classes(id),
    enrolled_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status         VARCHAR(20)   NOT NULL DEFAULT 'active',
    -- active | completed | dropped | transferred | reserved
    tuition_fee    DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    final_fee      DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(20)   NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid
    note           TEXT,
    UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class   ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status  ON enrollments(status);

CREATE TABLE IF NOT EXISTS attendance (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    class_session_id   INTEGER  NOT NULL REFERENCES class_sessions(id),
    student_id         INTEGER  NOT NULL REFERENCES students(id),
    attendance_status  VARCHAR(20) NOT NULL DEFAULT 'present',
    -- present | absent | late | excused
    note               TEXT,
    UNIQUE(class_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(class_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

CREATE TABLE IF NOT EXISTS invoices (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_code  VARCHAR(30)   NOT NULL UNIQUE,
    student_id    INTEGER       NOT NULL REFERENCES students(id),
    enrollment_id INTEGER       REFERENCES enrollments(id),
    amount        DECIMAL(12,2) NOT NULL,
    due_date      DATE,
    status        VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | paid | overdue | cancelled
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);

CREATE TABLE IF NOT EXISTS payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id     INTEGER       NOT NULL REFERENCES invoices(id),
    amount         DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50)   NOT NULL DEFAULT 'cash',
    -- cash | bank_transfer | card | momo | zalopay
    paid_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

CREATE TABLE IF NOT EXISTS teacher_payroll (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id       INTEGER       NOT NULL REFERENCES teachers(id),
    class_session_id INTEGER       NOT NULL REFERENCES class_sessions(id),
    amount           DECIMAL(12,2) NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | paid
    calculated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at          DATETIME,
    note             TEXT,
    UNIQUE(teacher_id, class_session_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_teacher ON teacher_payroll(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status  ON teacher_payroll(status);

-- -----------------------------------------------------------
-- SEED DATA MẪU
-- -----------------------------------------------------------

INSERT INTO roles (name, description) VALUES
    ('admin',      'Quản trị toàn hệ thống'),
    ('operator',   'Nhân sự vận hành trung tâm'),
    ('teacher',    'Giáo viên'),
    ('accountant', 'Kế toán'),
    ('sales',      'Tư vấn tuyển sinh');

INSERT INTO branches (branch_code, branch_name, address, phone) VALUES
    ('CS1', 'Cơ sở 1', '123 Nguyễn Văn A, Q.1, TP.HCM', '028-1234-5678');

INSERT INTO timeslots (timeslot_code, label, weekdays_pattern, start_time, end_time, sessions_per_week) VALUES
    ('TS01', 'T2-T4-T6  18:00-20:00', '1,3,5', '18:00', '20:00', 3),
    ('TS02', 'T3-T5     18:00-20:00', '2,4',   '18:00', '20:00', 2),
    ('TS03', 'T7-CN     08:00-10:00', '6,0',   '08:00', '10:00', 2),
    ('TS04', 'T2-T4-T6  08:00-10:00', '1,3,5', '08:00', '10:00', 3),
    ('TS05', 'T3-T5     14:00-16:00', '2,4',   '14:00', '16:00', 2);

INSERT INTO classrooms (room_code, room_name, branch_id, capacity, room_type) VALUES
    ('P101', 'Phòng 101', 1, 20, 'classroom'),
    ('P102', 'Phòng 102', 1, 20, 'classroom'),
    ('P201', 'Phòng 201', 1, 15, 'classroom'),
    ('P202', 'Phòng 202', 1, 15, 'classroom');

INSERT INTO courses (course_code, course_name, level, total_sessions, session_duration_minutes, tuition_fee) VALUES
    ('TOEIC_FDN',  'TOEIC Foundation',          'elementary',        24, 120, 3500000),
    ('TOEIC_ADV',  'TOEIC Advanced',             'intermediate',      24, 120, 4000000),
    ('IELTS_PRE',  'IELTS Pre',                  'pre_intermediate',  30, 120, 4500000),
    ('IELTS_INT',  'IELTS Intermediate',          'intermediate',      30, 120, 5000000),
    ('KIDS_A1',    'Kids English A1',             'beginner',          20, 90,  2500000),
    ('COMM_WP',    'Giao tiếp người đi làm',     'elementary',        20, 120, 3000000);

INSERT INTO schedule_lines (line_code, line_name, branch_id, classroom_id, timeslot_id, default_capacity) VALUES
    ('LINE01', 'TOEIC tối T246 - P101', 1, 1, 1, 18),
    ('LINE02', 'IELTS tối T35  - P102', 1, 2, 2, 16),
    ('LINE03', 'Kids  sáng T7CN - P201', 1, 3, 3, 12),
    ('LINE04', 'Giao tiếp tối T35 - P202', 1, 4, 2, 16);
