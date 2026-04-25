# ROADMAP.md — Build Progress

Trạng thái xây dựng từng module. Cập nhật khi hoàn thành mỗi tính năng.
Xem `AGENTS.md` để hiểu dependency giữa các module.

---

## Tổng quan

```
Infrastructure    ████████████████████ 100%
Auth & Dashboard  ████████████████████ 100%
Landing Page      ████████████████████ 100%
Students          ████████████████████ 100%
Teachers          ████████████████████ 100%
Courses           ████████████████████ 100%
Timeslots         ████████████████████ 100%
Classrooms        ████████████████████ 100%
Schedule Lines    ████████████████████ 100%
Classes           ████████████████████ 100%
Class Sessions    ████████████░░░░░░░░  60%  (auto-gen ✓ | reschedule/holiday UI ✗)
Enrollments       ░░░░░░░░░░░░░░░░░░░░   0%
Attendance        ░░░░░░░░░░░░░░░░░░░░   0%
Finance           ░░░░░░░░░░░░░░░░░░░░   0%
```

---

## ✅ Đã hoàn thành

### Infrastructure
- [x] MySQL schema (20 bảng, indexes, foreign keys)
- [x] `database/mysql_schema.sql` + `scripts/db-init.js`
- [x] Express app skeleton (`src/app.js`)
- [x] MySQL pool wrapper (`src/config/db.js`)
- [x] Session auth middleware (`src/middleware/auth.js`)
- [x] Role middleware (`src/middleware/role.js`)
- [x] i18n middleware EN/VI (`src/middleware/i18n.js`)
- [x] Design system CSS (Airbnb-inspired, `public/css/custom.css`)
- [x] Bootstrap 5 layout với sidebar (`src/views/layout/main.ejs`)
- [x] ERD Mermaid (`database/erd.md`)
- [x] Structure doc (`database/structure_db.md`)

### Auth
- [x] Login page (`/auth/login`)
- [x] Session-based auth với bcryptjs
- [x] Logout
- [x] Language switch (`/language/:lang`)
- [x] Admin user mặc định: `admin / Admin@123`

### Landing Page
- [x] `/` — Trang giới thiệu trung tâm (public)
- [x] Hero section + stats
- [x] 6 course cards (data tĩnh)
- [x] Features grid (6 điểm khác biệt)
- [x] Teachers section (data tĩnh)
- [x] Award lockup + Reviews
- [x] CTA + Contact form (placeholder)
- [x] Footer 4 cột
- [x] Responsive + song ngữ EN/VI

### Dashboard
- [x] `/dashboard` — Stats cards (students, classes, teachers)
- [x] Quick actions
- [x] System info

### Module: Students (`/students`)
- [x] Model: list (search + filter status + pagination), findById, create, update, softDelete
- [x] Controller: 7 handlers
- [x] Routes: 7 routes (protected)
- [x] View: index (list + search bar + filter + pagination)
- [x] View: form (create/edit dùng chung, 2-column layout)
- [x] View: show (detail page)
- [x] Auto-generate student code: `HV202604001`
- [x] Soft delete (status = inactive)
- [x] Song ngữ EN/VI

### Module: Teachers (`/teachers`)
- [x] Model: list (search + filter type + status + pagination), findById, create, update, softDelete
- [x] Controller: 7 handlers
- [x] Routes: 7 routes (protected)
- [x] View: index (list + specialty tags + lương/giờ + multi-filter)
- [x] View: form (specialty checkboxes highlight, radio contract type)
- [x] View: show (detail + rate card + specialty badges)
- [x] Auto-generate teacher code: `GV202604001`
- [x] Specialty lưu JSON array `["TOEIC","IELTS"]`
- [x] Song ngữ EN/VI

---

## ✅ Đã hoàn thành (tiếp theo)

### Tầng 1 — Master Data

#### Courses (`/courses`) ✅
- [x] Model: list, findById, create, update, softDelete
- [x] Controller + Routes (7)
- [x] View: index (list + filter level/status)
- [x] View: form (level dropdown, fee input, session count)
- [x] View: show

#### Timeslots (`/timeslots`) ✅
- [x] Model: list, findById, create, update, softDelete
- [x] Controller + Routes (7)
- [x] View: index (hiển thị weekdays_pattern đẹp T2-T4-T6)
- [x] View: form (checkbox ngày trong tuần + time input)
- [x] View: show

#### Classrooms (`/classrooms`) ✅
- [x] Model: list, findById, create, update, softDelete (JOIN branches)
- [x] Controller + Routes (7)
- [x] View: index + form + show

### Tầng 2 — Scheduling

#### Schedule Lines (`/schedule-lines`) ✅
- [x] Model: list (JOIN classrooms+timeslots+active_class), findById, create, update, deactivate
- [x] getFormOptions (classrooms, timeslots, courses, branches)
- [x] getActiveClass — hiển thị lớp đang chạy trên line
- [x] Controller + Routes (7)
- [x] View: index (trạng thái đang có lớp / đang trống) + form + show

#### Classes (`/classes`) ✅
- [x] Model: list (JOIN courses+teachers+classrooms+timeslots), findById, create, update
- [x] Auto-generate `class_sessions` khi tạo lớp (batch INSERT trong transaction)
- [x] Tự tính `expected_end_date` (bỏ qua ngày nghỉ lễ từ bảng `holidays`)
- [x] Tự tính `next_opening_available_date` (buffer 3 ngày + khớp weekdays_pattern)
- [x] Kiểm tra conflict: `getActiveClassOnLine` (1 line = 1 lớp active)
- [x] Status flow + validation: `VALID_TRANSITIONS` map (planned→open_enrollment→ongoing→completed)
- [x] `updateStatus` — POST `/:id/status`
- [x] `updateSession` — POST `/:id/sessions/:sessionId` (đổi trạng thái buổi học)
- [x] `src/utils/scheduling.js` — helpers: generateSessionDates, calcExpectedEndDate, calcNextOpeningDate, generateClassCode
- [x] Controller + Routes (9 routes)
- [x] View: index + form + show

#### Class Sessions (partial)
- [x] Auto-generate khi tạo class
- [x] Cập nhật trạng thái buổi học (scheduled/completed/cancelled/rescheduled)
- [ ] UI đổi lịch / học bù (rescheduled) — chưa có form riêng
- [ ] UI nghỉ lễ batch cancel

---

## ⬜ Chưa làm

### Tầng 3 — Vận hành (phụ thuộc tầng 2)

#### Enrollments (`/enrollments`)
- [ ] Ghi danh học viên vào lớp
- [ ] Kiểm tra capacity (không vượt sĩ số)
- [ ] Tính final_fee (tuition_fee - discount)

#### Attendance (`/attendance`)
- [ ] Điểm danh từng buổi học
- [ ] Batch update (điểm danh cả lớp cùng lúc)
- [ ] Thống kê % điểm danh học viên

---

### Tầng 4 — Tài chính (phụ thuộc tầng 3)

#### Invoices + Payments (`/finance/invoices`)
- [ ] Tạo hóa đơn từ enrollment
- [ ] Ghi nhận thanh toán
- [ ] Báo cáo công nợ

#### Teacher Payroll (`/finance/payroll`)
- [ ] Tính công theo buổi dạy
- [ ] Batch generate từ class_sessions
- [ ] Báo cáo lương theo tháng

---

### Tính năng bổ sung (sau khi core xong)

- [ ] Staff module (`/staff`)
- [ ] Settings: holidays management (`/settings/holidays`)
- [ ] Settings: room blockings (`/settings/room-blockings`)
- [ ] Báo cáo tổng hợp (dashboard nâng cao)
- [ ] Export Excel (học viên, lương, doanh thu)
- [ ] AI Chat integration — hỏi đáp dữ liệu bằng ngôn ngữ tự nhiên
- [ ] Thông báo email/Zalo tự động (nhắc lịch, học phí)

---

## Dependency Graph

```
branches
    └── classrooms ──────────────┐
                                 │
courses ─── class_templates      │
    │                            ▼
    └───────────────── schedule_lines ─── classes ─── class_sessions
                                              │              │
timeslots ──────────────────────┘             │              ├── attendance ←── students
                                              │              └── teacher_payroll ←── teachers
                                              └── enrollments ←── students
                                                       └── invoices ─── payments
```

---

## Cách cập nhật file này

Khi hoàn thành một item, đổi `- [ ]` thành `- [x]` và cập nhật thanh tiến độ ở đầu file.
