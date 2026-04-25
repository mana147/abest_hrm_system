# PROJECT_STRUCTURE.md — ABest HRM System

Tài liệu này mô tả toàn bộ cấu trúc dự án — dành cho AI agents và developers mới cần hiểu nhanh codebase.
Đọc `AGENTS.md` trước để hiểu business context.

---

## Cây thư mục

```
abest_hrm_system/
│
├── CLAUDE.md                    ← Hướng dẫn cho Claude Code
├── AGENTS.md                    ← Business context cho tất cả AI agents
├── PROJECT_STRUCTURE.md         ← File này
├── ROADMAP.md                   ← Trạng thái build từng module
├── mysql_info.md                ← Thông tin kết nối MySQL (dev + remote)
├── package.json                 ← Dependencies + npm scripts
├── jsconfig.json                ← VS Code JS config (CommonJS, checkJs: false)
├── .env                         ← DB credentials, session secret (KHÔNG commit)
├── .env.example                 ← Template .env
├── .gitignore
│
├── database/
│   ├── hrm.db                   ← SQLite dev (legacy, không dùng nữa)
│   ├── mysql_schema.sql         ← MySQL schema chuẩn (20 bảng + seed data)
│   ├── init_schema.sql          ← SQLite schema (legacy)
│   ├── structure_db.md          ← Mô tả chi tiết từng bảng + field
│   └── erd.md                   ← ERD Mermaid (7 diagrams)
│
├── scripts/
│   ├── db-init.js               ← Tạo DB + schema + seed + admin user
│   └── db-sync.js               ← (placeholder) sync schema
│
├── src/
│   ├── app.js                   ← Entry point Express app
│   ├── config/
│   │   └── db.js                ← MySQL pool wrapper
│   ├── middleware/
│   │   ├── auth.js              ← requireAuth middleware
│   │   ├── i18n.js              ← Language middleware (t('key'))
│   │   └── role.js              ← requireRole(...roles) middleware
│   ├── utils/
│   │   └── scheduling.js        ← generateSessionDates, calcExpectedEndDate, calcNextOpeningDate, generateClassCode
│   ├── models/
│   │   ├── userModel.js         ← findByUsername, findById
│   │   ├── studentModel.js      ← list, findById, create, update, softDelete
│   │   ├── teacherModel.js      ← list, findById, create, update, softDelete
│   │   ├── courseModel.js       ← list, findById, create, update, softDelete
│   │   ├── timeslotModel.js     ← list, findById, create, update, softDelete
│   │   ├── classroomModel.js    ← list, findById, create, update, softDelete (JOIN branches)
│   │   ├── scheduleLineModel.js ← list, findById, create, update, deactivate, getActiveClass, getFormOptions
│   │   └── classModel.js        ← list, findById, create, update, updateStatus, updateSession, getSessions, getFormOptions
│   ├── controllers/
│   │   ├── authController.js         ← showLogin, login, logout
│   │   ├── studentController.js      ← index, showCreate, create, show, showEdit, update, destroy
│   │   ├── teacherController.js      ← index, showCreate, create, show, showEdit, update, destroy
│   │   ├── courseController.js       ← index, showCreate, create, show, showEdit, update, destroy
│   │   ├── timeslotController.js     ← index, showCreate, create, show, showEdit, update, destroy
│   │   ├── classroomController.js    ← index, showCreate, create, show, showEdit, update, destroy
│   │   ├── scheduleLineController.js ← index, showCreate, create, show, showEdit, update, destroy
│   │   └── classController.js        ← index, showCreate, create, show, showEdit, update, destroy, updateStatus, updateSession
│   ├── routes/
│   │   ├── index.js             ← Route aggregator + dashboard + language switch
│   │   ├── auth.js              ← /auth/login, /auth/logout
│   │   ├── students.js          ← /students CRUD
│   │   ├── teachers.js          ← /teachers CRUD
│   │   ├── courses.js           ← /courses CRUD
│   │   ├── timeslots.js         ← /timeslots CRUD
│   │   ├── classrooms.js        ← /classrooms CRUD
│   │   ├── schedule-lines.js    ← /schedule-lines CRUD
│   │   └── classes.js           ← /classes CRUD + /classes/:id/status + /classes/:id/sessions/:sessionId
│   └── views/
│       ├── layout/
│       │   └── main.ejs         ← Layout chính (sidebar + topbar + flash)
│       ├── auth/
│       │   └── login.ejs        ← Trang đăng nhập (standalone)
│       ├── dashboard/
│       │   └── index.ejs        ← Dashboard với stat cards
│       ├── students/
│       │   ├── index.ejs        ← List + search + filter + pagination
│       │   ├── form.ejs         ← Create/Edit form (dùng chung)
│       │   └── show.ejs         ← Detail page
│       ├── teachers/
│       │   ├── index.ejs        ← List + specialty tags + contract type filter
│       │   ├── form.ejs         ← Form với specialty checkboxes
│       │   └── show.ejs         ← Detail + rate card
│       ├── courses/             ← index + form + show
│       ├── timeslots/           ← index + form + show
│       ├── classrooms/          ← index + form + show
│       ├── schedule-lines/      ← index + form + show
│       ├── classes/             ← index + form + show (bao gồm danh sách class_sessions)
│       ├── landing.ejs          ← Landing page công khai (standalone)
│       └── error.ejs            ← 404/500 error page (standalone)
│
├── public/
│   ├── css/
│   │   ├── custom.css           ← Admin design system (Airbnb-inspired tokens)
│   │   └── landing.css          ← Landing page styles
│   └── js/
│       └── main.js              ← Sidebar toggle, flash auto-dismiss, confirm delete
│
├── locales/
│   ├── vi.json                  ← Tiếng Việt translations
│   └── en.json                  ← English translations
│
├── DESIGN/
│   ├── DESIGN_Airbnb.md         ← Design system chính (đang dùng)
│   ├── DESIGN_Apple.md          ← Tham khảo
│   ├── DESIGN_Raycast.md        ← Tham khảo
│   └── DESIGN_Zapier.md         ← Tham khảo
│
├── feature_map/
│   └── FEATURE_MAP_TEMPLATE.md  ← Template tạo feature map mới
│
└── brainstorm ideas/
    └── AiChatIdeas.md           ← Brainstorm nghiệp vụ ban đầu (27 sections)
```

---

## Routes Table

| Method | Path | Controller | Auth | Mô tả |
|--------|------|-----------|------|-------|
| GET | `/` | inline | — | Landing page (public) hoặc redirect /dashboard nếu đã login |
| GET | `/dashboard` | inline | ✓ | Dashboard với stats |
| GET | `/language/:lang` | inline | — | Đổi ngôn ngữ (vi/en) |
| GET | `/auth/login` | authController.showLogin | — | Trang đăng nhập |
| POST | `/auth/login` | authController.login | — | Xử lý đăng nhập |
| GET | `/auth/logout` | authController.logout | — | Đăng xuất |
| GET | `/students` | studentController.index | ✓ | Danh sách học viên |
| GET | `/students/new` | studentController.showCreate | ✓ | Form thêm học viên |
| POST | `/students` | studentController.create | ✓ | Tạo học viên |
| GET | `/students/:id` | studentController.show | ✓ | Chi tiết học viên |
| GET | `/students/:id/edit` | studentController.showEdit | ✓ | Form sửa học viên |
| POST | `/students/:id` | studentController.update | ✓ | Cập nhật học viên |
| POST | `/students/:id/delete` | studentController.destroy | ✓ | Soft delete học viên |
| GET | `/teachers` | teacherController.index | ✓ | Danh sách giáo viên |
| GET | `/teachers/new` | teacherController.showCreate | ✓ | Form thêm giáo viên |
| POST | `/teachers` | teacherController.create | ✓ | Tạo giáo viên |
| GET | `/teachers/:id` | teacherController.show | ✓ | Chi tiết giáo viên |
| GET | `/teachers/:id/edit` | teacherController.showEdit | ✓ | Form sửa giáo viên |
| POST | `/teachers/:id` | teacherController.update | ✓ | Cập nhật giáo viên |
| POST | `/teachers/:id/delete` | teacherController.destroy | ✓ | Soft delete giáo viên |
| GET | `/courses` | courseController.index | ✓ | Danh sách khóa học |
| GET | `/courses/new` | courseController.showCreate | ✓ | Form thêm khóa học |
| POST | `/courses` | courseController.create | ✓ | Tạo khóa học |
| GET | `/courses/:id` | courseController.show | ✓ | Chi tiết khóa học |
| GET | `/courses/:id/edit` | courseController.showEdit | ✓ | Form sửa khóa học |
| POST | `/courses/:id` | courseController.update | ✓ | Cập nhật khóa học |
| POST | `/courses/:id/delete` | courseController.destroy | ✓ | Soft delete khóa học |
| GET | `/timeslots` | timeslotController.index | ✓ | Danh sách khung giờ |
| GET | `/timeslots/new` | timeslotController.showCreate | ✓ | Form thêm khung giờ |
| POST | `/timeslots` | timeslotController.create | ✓ | Tạo khung giờ |
| GET | `/timeslots/:id` | timeslotController.show | ✓ | Chi tiết khung giờ |
| GET | `/timeslots/:id/edit` | timeslotController.showEdit | ✓ | Form sửa khung giờ |
| POST | `/timeslots/:id` | timeslotController.update | ✓ | Cập nhật khung giờ |
| POST | `/timeslots/:id/delete` | timeslotController.destroy | ✓ | Soft delete khung giờ |
| GET | `/classrooms` | classroomController.index | ✓ | Danh sách phòng học |
| GET | `/classrooms/new` | classroomController.showCreate | ✓ | Form thêm phòng học |
| POST | `/classrooms` | classroomController.create | ✓ | Tạo phòng học |
| GET | `/classrooms/:id` | classroomController.show | ✓ | Chi tiết phòng học |
| GET | `/classrooms/:id/edit` | classroomController.showEdit | ✓ | Form sửa phòng học |
| POST | `/classrooms/:id` | classroomController.update | ✓ | Cập nhật phòng học |
| POST | `/classrooms/:id/delete` | classroomController.destroy | ✓ | Soft delete phòng học |
| GET | `/schedule-lines` | scheduleLineController.index | ✓ | Danh sách đường vận hành |
| GET | `/schedule-lines/new` | scheduleLineController.showCreate | ✓ | Form thêm schedule line |
| POST | `/schedule-lines` | scheduleLineController.create | ✓ | Tạo schedule line |
| GET | `/schedule-lines/:id` | scheduleLineController.show | ✓ | Chi tiết schedule line |
| GET | `/schedule-lines/:id/edit` | scheduleLineController.showEdit | ✓ | Form sửa schedule line |
| POST | `/schedule-lines/:id` | scheduleLineController.update | ✓ | Cập nhật schedule line |
| POST | `/schedule-lines/:id/delete` | scheduleLineController.destroy | ✓ | Deactivate schedule line |
| GET | `/classes` | classController.index | ✓ | Danh sách lớp khai giảng |
| GET | `/classes/new` | classController.showCreate | ✓ | Form thêm lớp |
| POST | `/classes` | classController.create | ✓ | Tạo lớp + auto-gen class_sessions |
| GET | `/classes/:id` | classController.show | ✓ | Chi tiết lớp + danh sách buổi học |
| GET | `/classes/:id/edit` | classController.showEdit | ✓ | Form sửa lớp |
| POST | `/classes/:id` | classController.update | ✓ | Cập nhật lớp |
| POST | `/classes/:id/delete` | classController.destroy | ✓ | Soft delete lớp |
| POST | `/classes/:id/status` | classController.updateStatus | ✓ | Chuyển trạng thái lớp |
| POST | `/classes/:id/sessions/:sessionId` | classController.updateSession | ✓ | Cập nhật trạng thái buổi học |

> **Chưa có route:** `/enrollments`, `/attendance`, `/finance` — xem `ROADMAP.md`

---

## Database Tables (20 bảng)

| Nhóm | Bảng | Trạng thái model |
|------|------|-----------------|
| Auth | `roles`, `users` | `userModel.js` ✓ |
| Nhân sự | `students` | `studentModel.js` ✓ |
| Nhân sự | `teachers` | `teacherModel.js` ✓ |
| Nhân sự | `staff` | Chưa có model |
| Cơ sở | `branches` | Query inline trong classroomModel / scheduleLineModel |
| Master data | `courses` | `courseModel.js` ✓ |
| Master data | `timeslots` | `timeslotModel.js` ✓ |
| Master data | `class_templates` | Chưa dùng |
| Master data | `classrooms` | `classroomModel.js` ✓ |
| Scheduling | `schedule_lines` | `scheduleLineModel.js` ✓ |
| Scheduling | `classes` | `classModel.js` ✓ |
| Scheduling | `class_sessions` | Embedded trong `classModel.js` (getSessions, updateSession) |
| Scheduling | `holidays` | Query inline trong `classModel.getHolidaySet()` |
| Scheduling | `room_blockings` | Chưa có model |
| Transaction | `enrollments` | Chưa có model |
| Transaction | `attendance` | Chưa có model |
| Transaction | `invoices` | Chưa có model |
| Transaction | `payments` | Chưa có model |
| Transaction | `teacher_payroll` | Chưa có model |

Chi tiết từng bảng: `database/structure_db.md`
ERD quan hệ: `database/erd.md`

---

## Key Files — Những file hay bị sửa nhất

| File | Khi nào sửa |
|------|------------|
| `src/routes/index.js` | Thêm module mới → `router.use('/module', require('./module'))` |
| `locales/vi.json` + `locales/en.json` | Thêm translation key mới — luôn sửa **cả 2** |
| `src/views/layout/main.ejs` | Thêm menu item vào sidebar |
| `database/mysql_schema.sql` | Thêm/sửa bảng DB — sau đó chạy lại `db-init.js` |
| `public/css/custom.css` | Thêm CSS component mới |
| `src/utils/scheduling.js` | Sửa logic tính lịch (session dates, expected_end_date, next_opening_date) |

---

## Patterns Quan Trọng

### Auto-generate code
```
students: HV + YYYYMM + 3 digits → HV202604001
teachers: GV + YYYYMM + 3 digits → GV202604001
classes:  {course_code} + YYYYMM  → TOEIC202604  (suffix -2, -3 nếu trùng)
```

### Pagination
```js
const PER_PAGE = 20;
const offset   = (page - 1) * PER_PAGE;
// Query: LIMIT ? OFFSET ? với [PER_PAGE, offset]
```

### i18n trong views
```ejs
<%= t('module.key') %>     ← translated text
<%= lang %>                ← 'vi' hoặc 'en'
```

### Session user object
```js
req.session.user = { id, username, fullName, role, roleId }
res.locals.user             // available trong mọi view
```

### Flash messages
```js
req.flash('success', 'Thông báo thành công');
req.flash('error', 'Thông báo lỗi');
// Tự hiển thị trong layout/main.ejs
```
