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
│   ├── models/
│   │   ├── userModel.js         ← findByUsername, findById
│   │   ├── studentModel.js      ← list, findById, create, update, softDelete
│   │   └── teacherModel.js      ← list, findById, create, update, softDelete
│   ├── controllers/
│   │   ├── authController.js    ← showLogin, login, logout
│   │   ├── studentController.js ← index, showCreate, create, show, showEdit, update, destroy
│   │   └── teacherController.js ← index, showCreate, create, show, showEdit, update, destroy
│   ├── routes/
│   │   ├── index.js             ← Route aggregator + dashboard + language switch
│   │   ├── auth.js              ← /auth/login, /auth/logout
│   │   ├── students.js          ← /students CRUD
│   │   └── teachers.js          ← /teachers CRUD
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

> **Chưa có route:** `/courses`, `/classrooms`, `/timeslots`, `/schedule-lines`, `/classes`, `/enrollments`, `/attendance`, `/finance` — xem `ROADMAP.md`

---

## Database Tables (20 bảng)

| Nhóm | Bảng | Trạng thái model |
|------|------|-----------------|
| Auth | `roles`, `users` | `userModel.js` ✓ |
| Nhân sự | `students` | `studentModel.js` ✓ |
| Nhân sự | `teachers` | `teacherModel.js` ✓ |
| Nhân sự | `staff` | Chưa có model |
| Cơ sở | `branches` | Chưa có model |
| Master data | `courses` | Chưa có model |
| Master data | `timeslots` | Chưa có model |
| Master data | `class_templates` | Chưa có model |
| Master data | `classrooms` | Chưa có model |
| Scheduling | `schedule_lines` | Chưa có model |
| Scheduling | `classes` | Chưa có model |
| Scheduling | `class_sessions` | Chưa có model |
| Scheduling | `holidays` | Chưa có model |
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

---

## Patterns Quan Trọng

### Auto-generate code
```
students: HV + YYYYMM + 3 digits → HV202604001
teachers: GV + YYYYMM + 3 digits → GV202604001
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
