-- =============================================================
-- HRM System — MySQL Schema
-- Hệ thống quản lý trung tâm đào tạo
-- charset: utf8mb4 | engine: InnoDB
-- =============================================================

CREATE DATABASE IF NOT EXISTS hrm_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hrm_system;

-- -----------------------------------------------------------
-- NHÓM 1: NGƯỜI DÙNG & PHÂN QUYỀN
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50)  NOT NULL,
    description TEXT,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id              INT          NOT NULL AUTO_INCREMENT,
    role_id         INT          NOT NULL,
    username        VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(150),
    lang_preference VARCHAR(5)   NOT NULL DEFAULT 'vi',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    KEY idx_users_role   (role_id),
    KEY idx_users_status (status),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- NHÓM 2: CƠ SỞ / CHI NHÁNH
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS branches (
    id          INT          NOT NULL AUTO_INCREMENT,
    branch_code VARCHAR(20)  NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_branches_code (branch_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- NHÓM 3: NHÂN SỰ
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS students (
    id            INT          NOT NULL AUTO_INCREMENT,
    student_code  VARCHAR(30)  NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    date_of_birth DATE,
    gender        VARCHAR(10),
    phone         VARCHAR(20),
    email         VARCHAR(150),
    address       TEXT,
    parent_name   VARCHAR(150),
    parent_phone  VARCHAR(20),
    source        VARCHAR(50),
    level_current VARCHAR(50),
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',
    note          TEXT,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_students_code (student_code),
    KEY idx_students_status (status),
    KEY idx_students_name   (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teachers (
    id           INT           NOT NULL AUTO_INCREMENT,
    teacher_code VARCHAR(30)   NOT NULL,
    full_name    VARCHAR(150)  NOT NULL,
    phone        VARCHAR(20),
    email        VARCHAR(150),
    specialty    TEXT,
    teacher_type VARCHAR(20)   NOT NULL DEFAULT 'fulltime',
    hourly_rate  DECIMAL(10,2) NOT NULL DEFAULT 0,
    status       VARCHAR(20)   NOT NULL DEFAULT 'active',
    note         TEXT,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_teachers_code (teacher_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
    id         INT          NOT NULL AUTO_INCREMENT,
    staff_code VARCHAR(30)  NOT NULL,
    full_name  VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    phone      VARCHAR(20),
    email      VARCHAR(150),
    position   VARCHAR(100),
    status     VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_staff_code (staff_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- NHÓM 4: MASTER DATA HỌC THUẬT
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
    id                       INT           NOT NULL AUTO_INCREMENT,
    course_code              VARCHAR(30)   NOT NULL,
    course_name              VARCHAR(150)  NOT NULL,
    level                    VARCHAR(50),
    total_sessions           INT           NOT NULL,
    session_duration_minutes INT           NOT NULL DEFAULT 120,
    tuition_fee              DECIMAL(12,2) NOT NULL DEFAULT 0,
    description              TEXT,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_courses_code (course_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timeslots (
    id                INT          NOT NULL AUTO_INCREMENT,
    timeslot_code     VARCHAR(30)  NOT NULL,
    label             VARCHAR(100) NOT NULL,
    weekdays_pattern  VARCHAR(20)  NOT NULL,
    start_time        TIME         NOT NULL,
    end_time          TIME         NOT NULL,
    sessions_per_week INT          NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active',
    PRIMARY KEY (id),
    UNIQUE KEY uq_timeslots_code (timeslot_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_templates (
    id                       INT          NOT NULL AUTO_INCREMENT,
    template_code            VARCHAR(30)  NOT NULL,
    template_name            VARCHAR(150) NOT NULL,
    course_id                INT          NOT NULL,
    sessions_per_week        INT          NOT NULL,
    total_sessions           INT          NOT NULL,
    session_duration_minutes INT          NOT NULL DEFAULT 120,
    default_timeslot_id      INT,
    default_capacity         INT          NOT NULL DEFAULT 15,
    note                     TEXT,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'active',
    PRIMARY KEY (id),
    UNIQUE KEY uq_templates_code (template_code),
    KEY idx_templates_course (course_id),
    CONSTRAINT fk_templates_course   FOREIGN KEY (course_id)           REFERENCES courses   (id),
    CONSTRAINT fk_templates_timeslot FOREIGN KEY (default_timeslot_id) REFERENCES timeslots (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classrooms (
    id        INT          NOT NULL AUTO_INCREMENT,
    room_code VARCHAR(30)  NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    branch_id INT,
    capacity  INT          NOT NULL DEFAULT 20,
    room_type VARCHAR(50)  NOT NULL DEFAULT 'classroom',
    status    VARCHAR(20)  NOT NULL DEFAULT 'active',
    note      TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uq_classrooms_code (room_code),
    KEY idx_classrooms_branch (branch_id),
    CONSTRAINT fk_classrooms_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- NHÓM 5: SCHEDULING — LÕI XẾP LỊCH
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS schedule_lines (
    id               INT          NOT NULL AUTO_INCREMENT,
    line_code        VARCHAR(30)  NOT NULL,
    line_name        VARCHAR(150) NOT NULL,
    branch_id        INT,
    course_id        INT,
    template_id      INT,
    classroom_id     INT          NOT NULL,
    timeslot_id      INT          NOT NULL,
    default_capacity INT          NOT NULL DEFAULT 15,
    active           TINYINT(1)   NOT NULL DEFAULT 1,
    note             TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lines_code                (line_code),
    UNIQUE KEY uq_lines_classroom_timeslot  (classroom_id, timeslot_id),
    KEY idx_lines_classroom (classroom_id),
    KEY idx_lines_timeslot  (timeslot_id),
    CONSTRAINT fk_lines_branch    FOREIGN KEY (branch_id)    REFERENCES branches        (id),
    CONSTRAINT fk_lines_course    FOREIGN KEY (course_id)    REFERENCES courses         (id),
    CONSTRAINT fk_lines_template  FOREIGN KEY (template_id)  REFERENCES class_templates (id),
    CONSTRAINT fk_lines_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms      (id),
    CONSTRAINT fk_lines_timeslot  FOREIGN KEY (timeslot_id)  REFERENCES timeslots       (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
    id                          INT          NOT NULL AUTO_INCREMENT,
    line_id                     INT,
    class_code                  VARCHAR(30)  NOT NULL,
    class_name                  VARCHAR(150) NOT NULL,
    course_id                   INT          NOT NULL,
    template_id                 INT,
    teacher_id                  INT,
    classroom_id                INT          NOT NULL,
    timeslot_id                 INT          NOT NULL,
    start_date                  DATE         NOT NULL,
    expected_end_date           DATE,
    resource_release_date       DATE,
    next_opening_available_date DATE,
    total_sessions              INT          NOT NULL,
    sessions_completed          INT          NOT NULL DEFAULT 0,
    capacity                    INT          NOT NULL DEFAULT 15,
    status                      VARCHAR(20)  NOT NULL DEFAULT 'planned',
    note                        TEXT,
    created_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_classes_code (class_code),
    KEY idx_classes_line    (line_id),
    KEY idx_classes_status  (status),
    KEY idx_classes_teacher (teacher_id),
    KEY idx_classes_start   (start_date),
    CONSTRAINT fk_classes_line      FOREIGN KEY (line_id)      REFERENCES schedule_lines  (id),
    CONSTRAINT fk_classes_course    FOREIGN KEY (course_id)    REFERENCES courses         (id),
    CONSTRAINT fk_classes_template  FOREIGN KEY (template_id)  REFERENCES class_templates (id),
    CONSTRAINT fk_classes_teacher   FOREIGN KEY (teacher_id)   REFERENCES teachers        (id),
    CONSTRAINT fk_classes_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms      (id),
    CONSTRAINT fk_classes_timeslot  FOREIGN KEY (timeslot_id)  REFERENCES timeslots       (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_sessions (
    id           INT          NOT NULL AUTO_INCREMENT,
    class_id     INT          NOT NULL,
    session_no   INT          NOT NULL,
    session_date DATE         NOT NULL,
    start_time   TIME         NOT NULL,
    end_time     TIME         NOT NULL,
    teacher_id   INT,
    classroom_id INT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
    note         TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sessions (class_id, session_no),
    KEY idx_sessions_date   (session_date),
    KEY idx_sessions_status (status),
    CONSTRAINT fk_sessions_class     FOREIGN KEY (class_id)     REFERENCES classes    (id),
    CONSTRAINT fk_sessions_teacher   FOREIGN KEY (teacher_id)   REFERENCES teachers   (id),
    CONSTRAINT fk_sessions_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
    id           INT          NOT NULL AUTO_INCREMENT,
    holiday_date DATE         NOT NULL,
    holiday_name VARCHAR(150) NOT NULL,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_holidays_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_blockings (
    id           INT  NOT NULL AUTO_INCREMENT,
    classroom_id INT  NOT NULL,
    blocked_date DATE NOT NULL,
    start_time   TIME,
    end_time     TIME,
    reason       TEXT,
    PRIMARY KEY (id),
    KEY idx_room_blockings (classroom_id, blocked_date),
    CONSTRAINT fk_blockings_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- NHÓM 6: GIAO DỊCH VẬN HÀNH
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS enrollments (
    id              INT           NOT NULL AUTO_INCREMENT,
    student_id      INT           NOT NULL,
    class_id        INT           NOT NULL,
    enrolled_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status          VARCHAR(20)   NOT NULL DEFAULT 'active',
    tuition_fee     DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    final_fee       DECIMAL(12,2) NOT NULL,
    payment_status  VARCHAR(20)   NOT NULL DEFAULT 'unpaid',
    note            TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uq_enrollments (student_id, class_id),
    KEY idx_enrollments_student (student_id),
    KEY idx_enrollments_class   (class_id),
    KEY idx_enrollments_status  (status),
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students (id),
    CONSTRAINT fk_enrollments_class   FOREIGN KEY (class_id)   REFERENCES classes  (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
    id                INT         NOT NULL AUTO_INCREMENT,
    class_session_id  INT         NOT NULL,
    student_id        INT         NOT NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'present',
    note              TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance (class_session_id, student_id),
    KEY idx_attendance_session (class_session_id),
    KEY idx_attendance_student (student_id),
    CONSTRAINT fk_attendance_session FOREIGN KEY (class_session_id) REFERENCES class_sessions (id),
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id)       REFERENCES students       (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
    id            INT           NOT NULL AUTO_INCREMENT,
    invoice_code  VARCHAR(30)   NOT NULL,
    student_id    INT           NOT NULL,
    enrollment_id INT,
    amount        DECIMAL(12,2) NOT NULL,
    due_date      DATE,
    status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_invoices_code (invoice_code),
    KEY idx_invoices_student (student_id),
    KEY idx_invoices_status  (status),
    CONSTRAINT fk_invoices_student    FOREIGN KEY (student_id)    REFERENCES students    (id),
    CONSTRAINT fk_invoices_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    id             INT           NOT NULL AUTO_INCREMENT,
    invoice_id     INT           NOT NULL,
    amount         DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50)   NOT NULL DEFAULT 'cash',
    paid_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note           TEXT,
    PRIMARY KEY (id),
    KEY idx_payments_invoice (invoice_id),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_payroll (
    id               INT           NOT NULL AUTO_INCREMENT,
    teacher_id       INT           NOT NULL,
    class_session_id INT           NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending',
    calculated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at          DATETIME,
    note             TEXT,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payroll (teacher_id, class_session_id),
    KEY idx_payroll_teacher (teacher_id),
    KEY idx_payroll_status  (status),
    CONSTRAINT fk_payroll_teacher  FOREIGN KEY (teacher_id)       REFERENCES teachers       (id),
    CONSTRAINT fk_payroll_session  FOREIGN KEY (class_session_id) REFERENCES class_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    ('TS01', 'T2-T4-T6  18:00-20:00', '1,3,5', '18:00:00', '20:00:00', 3),
    ('TS02', 'T3-T5     18:00-20:00', '2,4',   '18:00:00', '20:00:00', 2),
    ('TS03', 'T7-CN     08:00-10:00', '6,0',   '08:00:00', '10:00:00', 2),
    ('TS04', 'T2-T4-T6  08:00-10:00', '1,3,5', '08:00:00', '10:00:00', 3),
    ('TS05', 'T3-T5     14:00-16:00', '2,4',   '14:00:00', '16:00:00', 2);

INSERT INTO classrooms (room_code, room_name, branch_id, capacity, room_type) VALUES
    ('P101', 'Phòng 101', 1, 20, 'classroom'),
    ('P102', 'Phòng 102', 1, 20, 'classroom'),
    ('P201', 'Phòng 201', 1, 15, 'classroom'),
    ('P202', 'Phòng 202', 1, 15, 'classroom');

INSERT INTO courses (course_code, course_name, level, total_sessions, session_duration_minutes, tuition_fee) VALUES
    ('TOEIC_FDN',  'TOEIC Foundation',        'elementary',       24, 120, 3500000),
    ('TOEIC_ADV',  'TOEIC Advanced',           'intermediate',     24, 120, 4000000),
    ('IELTS_PRE',  'IELTS Pre',                'pre_intermediate', 30, 120, 4500000),
    ('IELTS_INT',  'IELTS Intermediate',        'intermediate',     30, 120, 5000000),
    ('KIDS_A1',    'Kids English A1',           'beginner',         20, 90,  2500000),
    ('COMM_WP',    'Giao tiếp người đi làm',   'elementary',       20, 120, 3000000);

INSERT INTO schedule_lines (line_code, line_name, branch_id, classroom_id, timeslot_id, default_capacity) VALUES
    ('LINE01', 'TOEIC tối T246 - P101',    1, 1, 1, 18),
    ('LINE02', 'IELTS tối T35  - P102',    1, 2, 2, 16),
    ('LINE03', 'Kids sáng T7CN - P201',    1, 3, 3, 12),
    ('LINE04', 'Giao tiếp tối T35 - P202', 1, 4, 2, 16);