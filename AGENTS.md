# AGENTS.md — Business Context & Domain Knowledge

Tài liệu này dành cho **tất cả AI agents** cần hiểu dự án trước khi làm việc.
Đọc file này trước khi đọc bất kỳ file code nào.

---

## Dự án là gì?

**ABest HRM System** là web app quản lý vận hành cho **trung tâm đào tạo ngoại ngữ** (tiếng Anh).
Không phải HRM nhân sự doanh nghiệp — đây là hệ thống vận hành trung tâm học thuật, bao gồm:

- Quản lý học viên, giáo viên, nhân sự
- Quản lý khóa học, lớp khai giảng, phòng học
- **Bài toán xếp lịch thông minh** — điểm cốt lõi của hệ thống
- Điểm danh, học phí, lương giáo viên

---

## Người dùng hệ thống

| Role | Vai trò | Quyền hạn chính |
|------|---------|----------------|
| `admin` | Quản trị viên / Giám đốc | Toàn bộ hệ thống |
| `operator` | Nhân viên vận hành | Học viên, lớp học, điểm danh |
| `teacher` | Giáo viên | Xem lịch dạy, điểm danh |
| `accountant` | Kế toán | Học phí, hóa đơn, lương |
| `sales` | Tư vấn tuyển sinh | Học viên, ghi danh |

**Người dùng thực tế của admin panel:** nhân viên trung tâm (không phải học viên).
**Landing page (`/`):** dành cho học viên/phụ huynh tiềm năng xem thông tin trung tâm.

---

## Khái niệm nghiệp vụ quan trọng

AI agent PHẢI hiểu các khái niệm này trước khi chạm vào scheduling logic:

### 1. Course (Khóa học)
Sản phẩm đào tạo — định nghĩa số buổi, thời lượng, học phí.
Ví dụ: `TOEIC Foundation` — 24 buổi, 120 phút/buổi, 3.500.000 ₫.

### 2. Timeslot (Khung giờ)
Lịch học lặp lại hàng tuần. Lưu `weekdays_pattern = "1,3,5"` (0=CN, 1=T2…6=T7).
Ví dụ: `TS01 = T2-T4-T6 18:00-20:00` (học 3 buổi/tuần).

### 3. Schedule Line (Đường vận hành) ← QUAN TRỌNG NHẤT
**Đơn vị vận hành cốt lõi** = 1 phòng học + 1 khung giờ.
```
LINE01 = P101 + TS01 (T2-T4-T6 18:00-20:00)
LINE02 = P102 + TS02 (T3-T5 18:00-20:00)
```
Tư duy đúng: **"line nào đang trống?"** — không phải "phòng nào trống?"
Mỗi line chạy tuần tự: lớp A kết thúc → line giải phóng → mở lớp B.

### 4. Class (Lớp khai giảng)
Một lớp cụ thể bám vào 1 schedule_line, có ngày bắt đầu, giáo viên, học viên.
Hệ thống tự tính:
- `expected_end_date` — ngày buổi cuối dự kiến (theo timeslot pattern + holidays)
- `resource_release_date` — ngày line được giải phóng
- `next_opening_available_date` — ngày sớm nhất mở lớp kế tiếp

### 5. Class Session (Buổi học)
Từng buổi học cụ thể được sinh ra từ lớp. Dùng để điểm danh và tính lương GV.

### 6. Enrollment (Ghi danh)
Quan hệ giữa học viên và lớp. Lưu học phí, chiết khấu, trạng thái thanh toán.

---

## Luồng nghiệp vụ chính

```
[Admin tạo Schedule Line]
    ↓ chọn phòng + khung giờ
[Admin tạo lớp khai giảng]
    ↓ chọn line + khóa học + giáo viên + ngày bắt đầu
[Hệ thống tự tính]
    ↓ expected_end_date + class_sessions
[Tư vấn tuyển sinh]
    ↓ thêm học viên vào lớp (enrollment)
[Tạo hóa đơn học phí]
    ↓ invoice → payment
[Lớp đang chạy]
    ↓ điểm danh từng buổi (attendance)
    ↓ tính công lương GV (teacher_payroll)
[Lớp kết thúc]
    ↓ line được giải phóng
    ↓ hệ thống gợi ý ngày khai giảng lớp kế
```

---

## Công thức scheduling (logic cốt lõi)

```
expected_end_date:
  → generate session_dates từ start_date theo timeslot.weekdays_pattern
  → bỏ qua ngày trong bảng holidays
  → ngày của buổi thứ total_sessions = expected_end_date

next_opening_available_date:
  → from = resource_release_date + buffer_days (config)
  → tìm ngày gần nhất từ `from` thuộc weekdays_pattern
  → đó là ngày sớm nhất có thể khai giảng lớp kế

Kiểm tra xung đột:
  → Không được tồn tại 2 lớp active trên cùng 1 line_id
```

---

## Trạng thái dữ liệu (Enum values)

```
students.status:     active | inactive | graduated | dropped
teachers.status:     active | inactive
teachers.type:       fulltime | parttime | freelance
classes.status:      planned | open_enrollment | ongoing | completed | cancelled | postponed
class_sessions.status: scheduled | completed | cancelled | rescheduled
enrollments.status:  active | completed | dropped | transferred | reserved
enrollments.payment_status: unpaid | partial | paid
attendance.status:   present | absent | late | excused
invoices.status:     pending | paid | overdue | cancelled
teacher_payroll.status: pending | paid
```

---

## Master Data vs Transaction Data

**Master Data** (ít thay đổi — phải có trước):
```
roles → users
branches → classrooms
courses → class_templates
timeslots → schedule_lines
```

**Transaction Data** (phát sinh hàng ngày):
```
classes → class_sessions → attendance
           ↓
students → enrollments → invoices → payments
teachers → teacher_payroll
```

---

## Kết nối Database

```
DB_HOST=localhost  (dev) | 172.16.10.36 (remote)
DB_PORT=3306
DB_USER=root
DB_NAME=hrm_system
```

Chi tiết: xem `mysql_info.md` và `database/structure_db.md`
ERD: `database/erd.md`

---

## Giao diện

- **Admin panel:** sidebar dark + Airbnb design tokens (Rausch `#ff385c`, Inter font)
- **Landing page:** `/` — trang giới thiệu trung tâm cho học viên tiềm năng
- **Song ngữ:** Tiếng Việt (mặc định) + English — switch qua `GET /language/:lang`
- **Responsive:** Bootstrap 5, sidebar collapse trên mobile

---

## Những điều AI agent KHÔNG được làm

- Không xóa cứng record trong DB — luôn soft delete (`status = 'inactive'`)
- Không dùng ORM (Sequelize, Prisma) — raw SQL qua `src/config/db.js`
- Không tạo file migration tự động — sửa `database/mysql_schema.sql` rồi chạy lại `db-init.js`
- Không thêm npm package mà không có lý do rõ ràng
- Không sửa design tokens trong `custom.css` tùy tiện — phải theo `DESIGN/DESIGN_Airbnb.md`
- Không commit `.env` lên git
