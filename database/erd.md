# ERD — HRM System Database

---

## Diagram 1: Tổng quan quan hệ (không có cột)

Dùng để nắm nhanh toàn bộ cấu trúc và hướng quan hệ giữa các bảng.

```mermaid
erDiagram
    roles ||--o{ users : "role_id"

    branches ||--o{ classrooms : "branch_id"
    branches ||--o{ schedule_lines : "branch_id"

    courses ||--o{ class_templates : "course_id"
    courses ||--o{ classes : "course_id"
    courses ||--o{ schedule_lines : "course_id"

    timeslots ||--o{ class_templates : "default_timeslot_id"
    timeslots ||--o{ schedule_lines : "timeslot_id"
    timeslots ||--o{ classes : "timeslot_id"

    classrooms ||--o{ schedule_lines : "classroom_id"
    classrooms ||--o{ classes : "classroom_id"
    classrooms ||--o{ class_sessions : "classroom_id"
    classrooms ||--o{ room_blockings : "classroom_id"

    class_templates ||--o{ classes : "template_id"
    class_templates ||--o{ schedule_lines : "template_id"

    schedule_lines ||--o{ classes : "line_id"

    teachers ||--o{ classes : "teacher_id"
    teachers ||--o{ class_sessions : "teacher_id"
    teachers ||--o{ teacher_payroll : "teacher_id"

    classes ||--|{ class_sessions : "class_id"
    classes ||--o{ enrollments : "class_id"

    students ||--o{ enrollments : "student_id"
    students ||--o{ attendance : "student_id"
    students ||--o{ invoices : "student_id"

    class_sessions ||--o{ attendance : "class_session_id"
    class_sessions ||--o{ teacher_payroll : "class_session_id"

    enrollments ||--o{ invoices : "enrollment_id"
    invoices ||--o{ payments : "invoice_id"
```

---

## Diagram 2: Nhóm Người dùng & Phân quyền

```mermaid
erDiagram
    roles {
        int     id          PK
        varchar name        "admin|operator|teacher|accountant|sales"
        text    description
        datetime created_at
    }

    users {
        int     id            PK
        int     role_id       FK
        varchar username      "UNIQUE"
        varchar password_hash
        varchar full_name
        varchar phone
        varchar email
        varchar status        "active|inactive|suspended"
        datetime created_at
        datetime updated_at
    }

    roles ||--o{ users : "role_id"
```

---

## Diagram 3: Nhóm Nhân sự

```mermaid
erDiagram
    students {
        int     id            PK
        varchar student_code  "UNIQUE – VD: HV2601001"
        varchar full_name
        date    date_of_birth
        varchar gender        "male|female|other"
        varchar phone
        varchar email
        text    address
        varchar parent_name
        varchar parent_phone
        varchar source        "walk_in|referral|facebook|zalo|website"
        varchar level_current
        varchar status        "active|inactive|graduated|dropped"
        text    note
        datetime created_at
    }

    teachers {
        int     id            PK
        varchar teacher_code  "UNIQUE – VD: GV001"
        varchar full_name
        varchar phone
        varchar email
        text    specialty     "JSON array: [TOEIC, IELTS]"
        varchar teacher_type  "fulltime|parttime|freelance"
        decimal hourly_rate   "VNĐ/giờ"
        varchar status        "active|inactive"
        text    note
        datetime created_at
    }

    staff {
        int     id          PK
        varchar staff_code  "UNIQUE"
        varchar full_name
        varchar department  "academic|sales|finance|admin|cs"
        varchar phone
        varchar email
        varchar position
        varchar status
        datetime created_at
    }
```

---

## Diagram 4: Nhóm Master Data học thuật

```mermaid
erDiagram
    courses {
        int     id                       PK
        varchar course_code              "UNIQUE – VD: TOEIC_FDN"
        varchar course_name
        varchar level                    "beginner|elementary|...|advanced"
        int     total_sessions
        int     session_duration_minutes "phút, mặc định 120"
        decimal tuition_fee              "VNĐ"
        text    description
        varchar status                   "active|inactive"
        datetime created_at
    }

    timeslots {
        int     id                 PK
        varchar timeslot_code      "UNIQUE – VD: TS01"
        varchar label              "T2-T4-T6 18:00-20:00"
        varchar weekdays_pattern   "1,3,5  (0=CN 1=T2 … 6=T7)"
        time    start_time
        time    end_time
        int     sessions_per_week
        varchar status
    }

    class_templates {
        int     id                       PK
        varchar template_code            "UNIQUE"
        varchar template_name
        int     course_id                FK
        int     sessions_per_week
        int     total_sessions
        int     session_duration_minutes
        int     default_timeslot_id      FK
        int     default_capacity         "mặc định 15"
        text    note
        varchar status
    }

    classrooms {
        int     id         PK
        varchar room_code  "UNIQUE – VD: P101"
        varchar room_name
        int     branch_id  FK
        int     capacity
        varchar room_type  "classroom|lab|meeting_room"
        varchar status
        text    note
    }

    branches {
        int     id          PK
        varchar branch_code "UNIQUE – VD: CS1"
        varchar branch_name
        text    address
        varchar phone
        varchar status
        datetime created_at
    }

    courses         ||--o{ class_templates : "course_id"
    timeslots       ||--o{ class_templates : "default_timeslot_id"
    branches        ||--o{ classrooms      : "branch_id"
```

---

## Diagram 5: Nhóm Scheduling (lõi xếp lịch)

Đây là nhóm quan trọng nhất của hệ thống.

```mermaid
erDiagram
    schedule_lines {
        int     id               PK
        varchar line_code        "UNIQUE – VD: LINE01"
        varchar line_name        "TOEIC tối T246 - P101"
        int     branch_id        FK
        int     course_id        FK  "nullable = line linh hoạt"
        int     template_id      FK  "nullable"
        int     classroom_id     FK  "NOT NULL"
        int     timeslot_id      FK  "NOT NULL"
        int     default_capacity
        int     active           "1=đang dùng | 0=đã đóng"
        text    note
    }

    classes {
        int     id                          PK
        int     line_id                     FK
        varchar class_code                  "UNIQUE – VD: TOEIC_FDN_K260501"
        varchar class_name
        int     course_id                   FK
        int     template_id                 FK  "nullable"
        int     teacher_id                  FK  "nullable"
        int     classroom_id                FK
        int     timeslot_id                 FK
        date    start_date                  "ngày khai giảng"
        date    expected_end_date           "tính từ pattern + total_sessions"
        date    resource_release_date       "ngày giải phóng line"
        date    next_opening_available_date "ngày sớm nhất mở lớp kế"
        int     total_sessions
        int     sessions_completed
        int     capacity
        varchar status                      "planned|open_enrollment|ongoing|completed|cancelled|postponed"
        text    note
        datetime created_at
    }

    class_sessions {
        int     id           PK
        int     class_id     FK
        int     session_no   "thứ tự buổi: 1, 2, 3…"
        date    session_date
        time    start_time
        time    end_time
        int     teacher_id   FK  "nullable – có thể đổi GV"
        int     classroom_id FK  "nullable – có thể đổi phòng"
        varchar status       "scheduled|completed|cancelled|rescheduled"
        text    note
    }

    holidays {
        int     id           PK
        date    holiday_date "UNIQUE"
        varchar holiday_name
        int     is_active    "1=áp dụng | 0=bỏ qua"
    }

    room_blockings {
        int  id           PK
        int  classroom_id FK
        date blocked_date
        time start_time   "nullable = khoá cả ngày"
        time end_time
        text reason
    }

    classrooms     ||--o{ schedule_lines  : "classroom_id"
    timeslots      ||--o{ schedule_lines  : "timeslot_id"
    courses        ||--o{ schedule_lines  : "course_id"
    class_templates||--o{ schedule_lines  : "template_id"

    schedule_lines ||--o{ classes         : "line_id"
    courses        ||--o{ classes         : "course_id"
    class_templates||--o{ classes         : "template_id"
    timeslots      ||--o{ classes         : "timeslot_id"
    classrooms     ||--o{ classes         : "classroom_id"

    classes        ||--|{ class_sessions  : "class_id"
    classrooms     ||--o{ class_sessions  : "classroom_id"
    classrooms     ||--o{ room_blockings  : "classroom_id"
```

---

## Diagram 6: Nhóm Giao dịch vận hành

```mermaid
erDiagram
    enrollments {
        int     id              PK
        int     student_id      FK
        int     class_id        FK
        datetime enrolled_at
        varchar status          "active|completed|dropped|transferred|reserved"
        decimal tuition_fee     "học phí gốc"
        decimal discount_amount "số tiền giảm"
        decimal final_fee       "học phí thực đóng"
        varchar payment_status  "unpaid|partial|paid"
        text    note
    }

    attendance {
        int     id                PK
        int     class_session_id  FK
        int     student_id        FK
        varchar attendance_status "present|absent|late|excused"
        text    note
    }

    invoices {
        int     id            PK
        varchar invoice_code  "UNIQUE – VD: INV-2601-0001"
        int     student_id    FK
        int     enrollment_id FK  "nullable"
        decimal amount        "số tiền cần thu"
        date    due_date      "hạn đóng"
        varchar status        "pending|paid|overdue|cancelled"
        datetime created_at
    }

    payments {
        int     id             PK
        int     invoice_id     FK
        decimal amount
        varchar payment_method "cash|bank_transfer|card|momo|zalopay"
        datetime paid_at
        text    note
    }

    teacher_payroll {
        int     id               PK
        int     teacher_id       FK
        int     class_session_id FK
        decimal amount           "công buổi dạy (VNĐ)"
        varchar status           "pending|paid"
        datetime calculated_at
        datetime paid_at         "nullable = chưa thanh toán"
        text    note
    }

    students      ||--o{ enrollments     : "student_id"
    classes       ||--o{ enrollments     : "class_id"

    class_sessions||--o{ attendance      : "class_session_id"
    students      ||--o{ attendance      : "student_id"

    students      ||--o{ invoices        : "student_id"
    enrollments   ||--o{ invoices        : "enrollment_id"
    invoices      ||--o{ payments        : "invoice_id"

    teachers      ||--o{ teacher_payroll : "teacher_id"
    class_sessions||--o{ teacher_payroll : "class_session_id"
```

---

## Diagram 7: Luồng vận hành end-to-end

Sơ đồ dạng flowchart mô tả nghiệp vụ từ tạo lớp đến kết thúc.

```mermaid
flowchart TD
    A([Admin]) --> B[Tạo schedule_line\nphòng + khung giờ]
    B --> C[Tạo lớp khai giảng\nclass]
    C --> D{Hệ thống tự tính}
    D --> E[expected_end_date]
    D --> F[resource_release_date]
    D --> G[next_opening_available_date]
    D --> H[Generate class_sessions\ntheo weekdays_pattern]

    C --> I[Tuyển sinh]
    I --> J[Thêm student\nvào enrollment]
    J --> K[Tạo invoice\nhọc phí]
    K --> L[Ghi nhận payment]

    H --> M[Vận hành lớp\nhàng buổi]
    M --> N[Điểm danh\nattendance]
    M --> O[Tính công lương GV\nteacher_payroll]

    M --> P{Lớp kết thúc?}
    P -- Có --> Q[Status = completed]
    Q --> R[Line được giải phóng]
    R --> S([Mở lớp kế tiếp\ntrên cùng line])
    P -- Không --> M
```

---

## Ghi chú ký hiệu Mermaid ERD

| Ký hiệu | Nghĩa |
|---------|-------|
| `\|\|--o{` | 1 bắt buộc — 0 hoặc nhiều |
| `\|\|--\|{` | 1 bắt buộc — 1 hoặc nhiều |
| `\|\|--\|\|` | 1 bắt buộc — 1 bắt buộc |
| `PK` | Primary Key |
| `FK` | Foreign Key |
