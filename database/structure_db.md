# HRM System — Database Structure

Tài liệu này mô tả toàn bộ cấu trúc database SQLite cho hệ thống quản lý trung tâm đào tạo (ngoại ngữ / kỹ năng).
File: `database/hrm.db`
Schema init: `database/init_schema.sql`
ERD Mermaid: `database/erd.md`

---

## Tổng quan

20 bảng, chia thành 6 nhóm:

| Nhóm | Bảng |
|------|------|
| 1. Người dùng & phân quyền | `roles`, `users` |
| 2. Cơ sở / chi nhánh | `branches` |
| 3. Nhân sự | `students`, `teachers`, `staff` |
| 4. Master data học thuật | `courses`, `timeslots`, `class_templates`, `classrooms` |
| 5. Scheduling (lõi xếp lịch) | `schedule_lines`, `classes`, `class_sessions`, `holidays`, `room_blockings` |
| 6. Giao dịch vận hành | `enrollments`, `attendance`, `invoices`, `payments`, `teacher_payroll` |

---

## Quan hệ chính (ERD tóm tắt)

```
roles ──< users

branches ──< classrooms
branches ──< schedule_lines

courses ──< class_templates
courses ──< schedule_lines (nullable)
courses ──< classes

timeslots ──< class_templates (default)
timeslots ──< schedule_lines
timeslots ──< classes

classrooms ──< schedule_lines
classrooms ──< classes
classrooms ──< class_sessions
classrooms ──< room_blockings

class_templates ──< classes

schedule_lines ──< classes      ← mỗi lớp thuộc 1 line vận hành
teachers       ──< classes
teachers       ──< class_sessions
teachers       ──< teacher_payroll

classes ──< class_sessions
classes ──< enrollments

students ──< enrollments
students ──< attendance
students ──< invoices

class_sessions ──< attendance
class_sessions ──< teacher_payroll

enrollments ──< invoices
invoices    ──< payments

holidays         (bảng độc lập, dùng trong tính toán lịch)
room_blockings   (khoá phòng tạm thời)
```

---

## Khái niệm lõi cần hiểu

### schedule_line
Đơn vị vận hành cố định = **1 phòng học + 1 khung giờ**.
Ví dụ: `LINE01 = P101 + T2-T4-T6 18:00-20:00`
Mỗi lớp mở ra sẽ bám vào 1 line. Khi lớp kết thúc, line đó được giải phóng và hệ thống tính `next_opening_available_date`.

### timeslot
Định nghĩa khung giờ học lặp lại hàng tuần.
`weekdays_pattern` lưu dạng `"1,3,5"` (0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7).

### 3 trường tính toán trên bảng `classes`
| Trường | Ý nghĩa |
|--------|---------|
| `expected_end_date` | Ngày của buổi học thứ `total_sessions` theo pattern timeslot |
| `resource_release_date` | Ngày line/phòng/slot được giải phóng (= `expected_end_date` hoặc + buffer) |
| `next_opening_available_date` | Ngày sớm nhất có thể mở lớp kế tiếp trên cùng line |

---

## Chi tiết từng bảng

### roles
Danh mục vai trò người dùng.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | VARCHAR(50) | NOT NULL, UNIQUE | admin \| operator \| teacher \| accountant \| sales |
| description | TEXT | | |
| created_at | DATETIME | NOT NULL, DEFAULT NOW | |

---

### users
Tài khoản đăng nhập hệ thống.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| role_id | INTEGER | NOT NULL, FK→roles | |
| username | VARCHAR(100) | NOT NULL, UNIQUE | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| full_name | VARCHAR(150) | NOT NULL | |
| phone | VARCHAR(20) | | |
| email | VARCHAR(150) | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active \| inactive \| suspended |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

Index: `role_id`, `status`

---

### branches
Chi nhánh / cơ sở trung tâm.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| branch_code | VARCHAR(20) | NOT NULL, UNIQUE | VD: CS1, CS2 |
| branch_name | VARCHAR(150) | NOT NULL | |
| address | TEXT | | |
| phone | VARCHAR(20) | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active \| inactive |
| created_at | DATETIME | NOT NULL | |

---

### students
Hồ sơ học viên.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| student_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: HV2601001 |
| full_name | VARCHAR(150) | NOT NULL | |
| date_of_birth | DATE | | |
| gender | VARCHAR(10) | | male \| female \| other |
| phone | VARCHAR(20) | | |
| email | VARCHAR(150) | | |
| address | TEXT | | |
| parent_name | VARCHAR(150) | | |
| parent_phone | VARCHAR(20) | | |
| source | VARCHAR(50) | | walk_in \| referral \| facebook \| zalo \| website \| other |
| level_current | VARCHAR(50) | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active \| inactive \| graduated \| dropped |
| note | TEXT | | |
| created_at | DATETIME | NOT NULL | |

Index: `status`, `full_name`

---

### teachers
Hồ sơ giáo viên.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| teacher_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: GV001 |
| full_name | VARCHAR(150) | NOT NULL | |
| phone | VARCHAR(20) | | |
| email | VARCHAR(150) | | |
| specialty | TEXT | | JSON array: ["TOEIC","IELTS"] |
| teacher_type | VARCHAR(20) | NOT NULL, DEFAULT 'fulltime' | fulltime \| parttime \| freelance |
| hourly_rate | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Lương/giờ (VNĐ) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active \| inactive |
| note | TEXT | | |
| created_at | DATETIME | NOT NULL | |

---

### staff
Nhân sự vận hành (không phải giáo viên).

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| staff_code | VARCHAR(30) | NOT NULL, UNIQUE | |
| full_name | VARCHAR(150) | NOT NULL | |
| department | VARCHAR(100) | | academic \| sales \| finance \| admin \| cs |
| phone | VARCHAR(20) | | |
| email | VARCHAR(150) | | |
| position | VARCHAR(100) | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | |
| created_at | DATETIME | NOT NULL | |

---

### courses
Danh mục khóa học (sản phẩm đào tạo).

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| course_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: TOEIC_FDN |
| course_name | VARCHAR(150) | NOT NULL | |
| level | VARCHAR(50) | | beginner \| elementary \| pre_intermediate \| intermediate \| upper_intermediate \| advanced |
| total_sessions | INTEGER | NOT NULL | Tổng số buổi học |
| session_duration_minutes | INTEGER | NOT NULL, DEFAULT 120 | Thời lượng mỗi buổi (phút) |
| tuition_fee | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Học phí chuẩn (VNĐ) |
| description | TEXT | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active \| inactive |
| created_at | DATETIME | NOT NULL | |

---

### timeslots
Khung giờ học cố định theo tuần.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| timeslot_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: TS01 |
| label | VARCHAR(100) | NOT NULL | VD: "T2-T4-T6 18:00-20:00" |
| weekdays_pattern | VARCHAR(20) | NOT NULL | VD: "1,3,5" — 0=CN,1=T2...6=T7 |
| start_time | TIME | NOT NULL | VD: "18:00" |
| end_time | TIME | NOT NULL | VD: "20:00" |
| sessions_per_week | INTEGER | NOT NULL | Số buổi/tuần |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | |

**Lưu ý:** `weekdays_pattern = "1,3,5"` nghĩa là học Thứ 2, Thứ 4, Thứ 6.
Dùng để generate danh sách `session_date` và tính `expected_end_date`.

---

### class_templates
Mẫu vận hành lớp chuẩn cho từng khóa học.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| template_code | VARCHAR(30) | NOT NULL, UNIQUE | |
| template_name | VARCHAR(150) | NOT NULL | |
| course_id | INTEGER | NOT NULL, FK→courses | |
| sessions_per_week | INTEGER | NOT NULL | |
| total_sessions | INTEGER | NOT NULL | |
| session_duration_minutes | INTEGER | NOT NULL, DEFAULT 120 | |
| default_timeslot_id | INTEGER | FK→timeslots (nullable) | Khung giờ mặc định |
| default_capacity | INTEGER | NOT NULL, DEFAULT 15 | Sĩ số mặc định |
| note | TEXT | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | |

---

### classrooms
Phòng học vật lý.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| room_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: P101 |
| room_name | VARCHAR(100) | NOT NULL | |
| branch_id | INTEGER | FK→branches (nullable) | |
| capacity | INTEGER | NOT NULL, DEFAULT 20 | Sức chứa |
| room_type | VARCHAR(50) | NOT NULL, DEFAULT 'classroom' | classroom \| lab \| meeting_room |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | |
| note | TEXT | | |

---

### schedule_lines
**Bảng lõi scheduling.** Mỗi line = 1 đường vận hành cố định (phòng + khung giờ).

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| line_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: LINE01 |
| line_name | VARCHAR(150) | NOT NULL | VD: "TOEIC tối T246 - P101" |
| branch_id | INTEGER | FK→branches (nullable) | |
| course_id | INTEGER | FK→courses (nullable) | NULL = line linh hoạt nhiều course |
| template_id | INTEGER | FK→class_templates (nullable) | |
| classroom_id | INTEGER | NOT NULL, FK→classrooms | |
| timeslot_id | INTEGER | NOT NULL, FK→timeslots | |
| default_capacity | INTEGER | NOT NULL, DEFAULT 15 | |
| active | INTEGER | NOT NULL, DEFAULT 1 | 1=đang dùng \| 0=đã đóng |
| note | TEXT | | |

UNIQUE: `(classroom_id, timeslot_id)` — mỗi cặp phòng+slot chỉ có 1 line.

---

### classes
Lớp khai giảng thực tế. Bám vào 1 schedule_line.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| line_id | INTEGER | FK→schedule_lines (nullable) | Line vận hành |
| class_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: TOEIC_FDN_K260501 |
| class_name | VARCHAR(150) | NOT NULL | |
| course_id | INTEGER | NOT NULL, FK→courses | |
| template_id | INTEGER | FK→class_templates (nullable) | |
| teacher_id | INTEGER | FK→teachers (nullable) | |
| classroom_id | INTEGER | NOT NULL, FK→classrooms | |
| timeslot_id | INTEGER | NOT NULL, FK→timeslots | |
| start_date | DATE | NOT NULL | Ngày khai giảng |
| expected_end_date | DATE | | Ngày kết thúc dự kiến (tính từ pattern) |
| resource_release_date | DATE | | Ngày giải phóng line |
| next_opening_available_date | DATE | | Ngày sớm nhất khai giảng lớp kế tiếp |
| total_sessions | INTEGER | NOT NULL | |
| sessions_completed | INTEGER | NOT NULL, DEFAULT 0 | |
| capacity | INTEGER | NOT NULL, DEFAULT 15 | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'planned' | planned \| open_enrollment \| ongoing \| completed \| cancelled \| postponed |
| note | TEXT | | |
| created_at | DATETIME | NOT NULL | |

Index: `line_id`, `status`, `teacher_id`, `start_date`

---

### class_sessions
Từng buổi học cụ thể (sinh ra từ lớp + timeslot).

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| class_id | INTEGER | NOT NULL, FK→classes | |
| session_no | INTEGER | NOT NULL | Thứ tự buổi (1, 2, 3...) |
| session_date | DATE | NOT NULL | Ngày diễn ra |
| start_time | TIME | NOT NULL | |
| end_time | TIME | NOT NULL | |
| teacher_id | INTEGER | FK→teachers (nullable) | Có thể thay giáo viên |
| classroom_id | INTEGER | FK→classrooms (nullable) | Có thể đổi phòng |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'scheduled' | scheduled \| completed \| cancelled \| rescheduled |
| note | TEXT | | |

UNIQUE: `(class_id, session_no)`
Index: `class_id`, `session_date`, `status`

---

### holidays
Ngày nghỉ lễ toàn trung tâm. Dùng khi tính `expected_end_date`.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| holiday_date | DATE | NOT NULL, UNIQUE | |
| holiday_name | VARCHAR(150) | NOT NULL | VD: "Tết Nguyên Đán" |
| is_active | INTEGER | NOT NULL, DEFAULT 1 | 1=áp dụng \| 0=bỏ qua |

---

### room_blockings
Khoá phòng tạm thời (sự kiện, sửa chữa...). Bỏ qua khi xếp lịch.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| classroom_id | INTEGER | NOT NULL, FK→classrooms | |
| blocked_date | DATE | NOT NULL | |
| start_time | TIME | | NULL = khoá cả ngày |
| end_time | TIME | | |
| reason | TEXT | | |

Index: `(classroom_id, blocked_date)`

---

### enrollments
Ghi danh học viên vào lớp.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| student_id | INTEGER | NOT NULL, FK→students | |
| class_id | INTEGER | NOT NULL, FK→classes | |
| enrolled_at | DATETIME | NOT NULL, DEFAULT NOW | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active \| completed \| dropped \| transferred \| reserved |
| tuition_fee | DECIMAL(12,2) | NOT NULL | Học phí gốc |
| discount_amount | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Số tiền giảm |
| final_fee | DECIMAL(12,2) | NOT NULL | Học phí thực đóng |
| payment_status | VARCHAR(20) | NOT NULL, DEFAULT 'unpaid' | unpaid \| partial \| paid |
| note | TEXT | | |

UNIQUE: `(student_id, class_id)` — mỗi học viên chỉ ghi danh 1 lần/lớp.
Index: `student_id`, `class_id`, `status`

---

### attendance
Điểm danh từng buổi học.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| class_session_id | INTEGER | NOT NULL, FK→class_sessions | |
| student_id | INTEGER | NOT NULL, FK→students | |
| attendance_status | VARCHAR(20) | NOT NULL, DEFAULT 'present' | present \| absent \| late \| excused |
| note | TEXT | | |

UNIQUE: `(class_session_id, student_id)`
Index: `class_session_id`, `student_id`

---

### invoices
Hoá đơn học phí.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| invoice_code | VARCHAR(30) | NOT NULL, UNIQUE | VD: INV-2601-0001 |
| student_id | INTEGER | NOT NULL, FK→students | |
| enrollment_id | INTEGER | FK→enrollments (nullable) | |
| amount | DECIMAL(12,2) | NOT NULL | Số tiền cần thu |
| due_date | DATE | | Hạn đóng tiền |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending \| paid \| overdue \| cancelled |
| created_at | DATETIME | NOT NULL | |

Index: `student_id`, `status`

---

### payments
Lịch sử thanh toán.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| invoice_id | INTEGER | NOT NULL, FK→invoices | |
| amount | DECIMAL(12,2) | NOT NULL | Số tiền đã thanh toán |
| payment_method | VARCHAR(50) | NOT NULL, DEFAULT 'cash' | cash \| bank_transfer \| card \| momo \| zalopay |
| paid_at | DATETIME | NOT NULL, DEFAULT NOW | |
| note | TEXT | | |

Index: `invoice_id`

---

### teacher_payroll
Công lương giáo viên theo từng buổi dạy.

| Cột | Kiểu | Constraint | Mô tả |
|-----|------|------------|-------|
| id | INTEGER | PK | |
| teacher_id | INTEGER | NOT NULL, FK→teachers | |
| class_session_id | INTEGER | NOT NULL, FK→class_sessions | |
| amount | DECIMAL(12,2) | NOT NULL | Số tiền công buổi đó |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending \| paid |
| calculated_at | DATETIME | NOT NULL | |
| paid_at | DATETIME | | NULL = chưa thanh toán |
| note | TEXT | | |

UNIQUE: `(teacher_id, class_session_id)`
Index: `teacher_id`, `status`

---

## Luồng dữ liệu chính

### 1. Tạo lớp khai giảng
```
branches → classrooms
timeslots → schedule_lines ← classrooms
courses → class_templates

[Admin chọn]
  line_id + course_id + teacher_id + start_date
  → tạo bản ghi classes
  → hệ thống tính expected_end_date từ timeslot.weekdays_pattern
  → hệ thống generate class_sessions
```

### 2. Tuyển sinh & ghi danh
```
students → enrollments ← classes
enrollments → invoices → payments
```

### 3. Vận hành lớp đang chạy
```
classes → class_sessions → attendance ← students
class_sessions → teacher_payroll ← teachers
```

### 4. Kết thúc lớp & mở lớp kế tiếp
```
classes.status = 'completed'
→ resource_release_date được set
→ next_opening_available_date được tính
→ Admin tạo lớp mới trên cùng line
```

---

## Công thức scheduling

### Tính expected_end_date
```
Input:  start_date, timeslot.weekdays_pattern, total_sessions, holidays
Logic:  generate session dates theo pattern, bỏ qua holidays
Output: ngày của buổi thứ total_sessions
```

### Tính next_opening_available_date
```
Input:  resource_release_date, timeslot.weekdays_pattern, buffer_days (config)
Logic:
  1. next_day = resource_release_date + buffer_days
  2. Tìm ngày gần nhất từ next_day thuộc weekdays_pattern
Output: next_opening_available_date
```

### Kiểm tra xung đột phòng
```
Khi mở lớp mới trên line X:
  CHECK: không có lớp nào khác trên cùng line_id
         có status IN ('planned','open_enrollment','ongoing')
```

---

## Seed data mẫu

| Bảng | Số dòng | Nội dung |
|------|---------|---------|
| roles | 5 | admin, operator, teacher, accountant, sales |
| branches | 1 | Cơ sở 1 |
| timeslots | 5 | T246-tối, T35-tối, T7CN-sáng, T246-sáng, T35-chiều |
| classrooms | 4 | P101, P102, P201, P202 |
| courses | 6 | TOEIC_FDN, TOEIC_ADV, IELTS_PRE, IELTS_INT, KIDS_A1, COMM_WP |
| schedule_lines | 4 | LINE01..LINE04 |
