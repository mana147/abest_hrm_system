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
Schedule Lines    ░░░░░░░░░░░░░░░░░░░░   0%
Classes           ░░░░░░░░░░░░░░░░░░░░   0%
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

## 🔄 Đang làm / Ưu tiên tiếp theo

### Tầng 1 — Master Data (prerequisite cho scheduling)

#### Courses (`/courses`) — Priority 1 ✅
- [x] Model: list, findById, create, update, softDelete
- [x] Controller + Routes (7)
- [x] View: index (list + filter level/status)
- [x] View: form (level dropdown, fee input, session count)
- [x] View: show

#### Timeslots (`/timeslots`) — Priority 2 ✅
- [x] Model: list, findById, create, update, softDelete
- [x] Controller + Routes (7)
- [x] View: index (hiển thị weekdays_pattern đẹp T2-T4-T6)
- [x] View: form (checkbox ngày trong tuần + time input)
- [x] View: show

#### Classrooms (`/classrooms`) — Priority 3 ✅
- [x] Model: list, findById, create, update, softDelete (JOIN branches)
- [x] Controller + Routes (7)
- [x] View: index + form + show

---

## ⬜ Chưa làm

### Tầng 2 — Scheduling (phụ thuộc tầng 1)

#### Schedule Lines (`/schedule-lines`)
- [ ] CRUD + validation (không trùng classroom+timeslot)
- [ ] Hiển thị trạng thái: đang có lớp hay đang trống
- [ ] Gợi ý next_opening_available_date

#### Classes (`/classes`) ← Module phức tạp nhất
- [ ] CRUD
- [ ] Auto-generate class_sessions từ timeslot pattern
- [ ] Tự tính `expected_end_date` (bỏ qua holidays)
- [ ] Tự tính `next_opening_available_date`
- [ ] Kiểm tra conflict (1 line = 1 lớp active)
- [ ] Class status flow: planned → open_enrollment → ongoing → completed

#### Class Sessions
- [ ] Auto-generate khi tạo class
- [ ] Đổi lịch / học bù (rescheduled)
- [ ] Nghỉ lễ (cancelled)

---

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
