# CLAUDE.md — ABest HRM System

Tệp này cung cấp hướng dẫn cho Claude Code (claude.ai/code) khi làm việc với codebase này.

---

## Quick Start

```bash
# Cài dependencies
npm install

# Khởi tạo MySQL database + seed data + admin user
node scripts/db-init.js

# Chạy dev server (auto-restart)
npm run dev          # → http://localhost:3000

# Chạy production
npm start
```

**Login mặc định:** `admin / Admin@123`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v22 LTS |
| Framework | Express 4.x |
| Template | EJS + express-ejs-layouts |
| UI | Bootstrap 5 (CDN) + Vanilla JS |
| Auth | express-session + bcryptjs |
| Database | MySQL (mysql2, raw SQL — không dùng ORM) |
| Session store | express-mysql-session |
| Design system | Airbnb-inspired (xem `/DESIGN/DESIGN_Airbnb.md`) |

---

## Database

Thông tin kết nối trong `.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=Hieu761321
DB_NAME=hrm_system
```

MySQL schema đầy đủ: `database/mysql_schema.sql`
DB documentation: `database/structure_db.md`
ERD Mermaid: `database/erd.md`

**Quan trọng:** Không dùng ORM. Mọi query đều viết raw SQL qua wrapper `src/config/db.js`:

```js
const db = require('../config/db');

await db.query('SELECT * FROM students WHERE status = ?', ['active']); // → rows[]
await db.get('SELECT * FROM students WHERE id = ?', [id]);             // → row | null
await db.run('INSERT INTO students ...', [params]);                     // → { insertId, affectedRows }
```

---

## Project Structure

```
src/
├── app.js                  ← Entry point: Express setup, middleware, session, routes
├── config/
│   └── db.js               ← MySQL pool wrapper (query / get / run)
├── middleware/
│   ├── auth.js             ← requireAuth: redirect /auth/login nếu chưa login
│   ├── i18n.js             ← t('key.subkey') cho EN/VI, đọc từ locales/
│   └── role.js             ← requireRole('admin','operator'): 403 nếu sai role
├── models/                 ← Raw SQL functions, không có business logic
├── controllers/            ← Request handlers, gọi model rồi render view
├── routes/                 ← Express Router, map URL → controller
└── views/                  ← EJS templates
    ├── layout/main.ejs     ← Layout chính (sidebar + topbar)
    ├── auth/login.ejs      ← Standalone (layout: false)
    ├── landing.ejs         ← Landing page (layout: false)
    └── [module]/           ← index.ejs + form.ejs + show.ejs mỗi module
```

---

## MVC Pattern — Cách thêm module mới

Mỗi module gồm 5 file theo pattern chuẩn. Ví dụ thêm module `courses`:

### 1. Model — `src/models/courseModel.js`
```js
const db = require('../config/db');
module.exports = {
  list({ search, page }) { /* raw SQL + pagination */ },
  findById(id)           { return db.get('SELECT * FROM courses WHERE id = ?', [id]); },
  create(data)           { return db.run('INSERT INTO courses ...', [...]); },
  update(id, data)       { return db.run('UPDATE courses SET ... WHERE id = ?', [..., id]); },
  softDelete(id)         { return db.run("UPDATE courses SET status='inactive' WHERE id=?", [id]); },
};
```

### 2. Controller — `src/controllers/courseController.js`
```js
const courseModel = require('../models/courseModel');
module.exports = {
  async index(req, res)    { /* list */ },
  showCreate(req, res)     { /* render form */ },
  async create(req, res)   { /* validate → model.create → redirect */ },
  async show(req, res)     { /* findById → render show */ },
  async showEdit(req, res) { /* findById → render form */ },
  async update(req, res)   { /* validate → model.update → redirect */ },
  async destroy(req, res)  { /* model.softDelete → redirect */ },
};
```

### 3. Routes — `src/routes/courses.js`
```js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/courseController');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);
router.get('/',            ctrl.index);
router.get('/new',         ctrl.showCreate);
router.post('/',           ctrl.create);
router.get('/:id',         ctrl.show);
router.get('/:id/edit',    ctrl.showEdit);
router.post('/:id',        ctrl.update);
router.post('/:id/delete', ctrl.destroy);
module.exports = router;
```

### 4. Register trong `src/routes/index.js`
```js
router.use('/courses', require('./courses'));
```

### 5. Views — `src/views/courses/`
- `index.ejs` — list + search + filter + pagination
- `form.ejs`  — create/edit dùng chung (nhận `course: null` hoặc `course: {...}`)
- `show.ejs`  — detail page

### 6. Feature Map — `feature_map/COURSES_FEATURE_MAP.md`
Tạo theo template `feature_map/FEATURE_MAP_TEMPLATE.md`

---

## i18n — Song ngữ EN/VI

Translation keys trong `locales/vi.json` và `locales/en.json`.

**Trong EJS:**
```ejs
<%= t('students.title') %>
<%= t('common.save') %>
```

**Đổi ngôn ngữ:** `GET /language/vi` hoặc `GET /language/en` (lưu vào session).

**Thêm key mới:** Thêm vào **cả 2 file** `vi.json` và `en.json` đồng thời.

---

## Auth & Roles

Session-based. Sau khi login, `req.session.user` chứa:
```js
{ id, username, fullName, role, roleId }
```

**5 roles:** `admin`, `operator`, `teacher`, `accountant`, `sales`

**Protect route:**
```js
router.use(requireAuth);                        // login required
router.use(requireRole('admin', 'operator'));   // role check
```

---

## Design System

CSS variables trong `public/css/custom.css`:

```css
--rausch:    #ff385c  /* primary CTA, active nav */
--ink:       #222222  /* text chính */
--ash:       #6a6a6a  /* text phụ */
--hairline:  #dddddd  /* border */
--cloud:     #f7f7f7  /* background */
```

**Badge status classes:** `badge-active`, `badge-inactive`, `badge-ongoing`, `badge-planned`, `badge-completed`, `badge-cancelled`

**Stat card:** dùng class `stat-card`, `stat-icon`, `stat-value`, `stat-label`

---

## Conventions

- **Routes:** tiếng Anh, kebab-case (`/schedule-lines`, `/class-sessions`)
- **Variables/functions:** camelCase (`studentModel`, `findById`)
- **DB columns:** snake_case (`full_name`, `created_at`)
- **Views:** chứa logic hiển thị tối thiểu — tính toán nặng để ở controller/model
- **Flash messages:** dùng `req.flash('success', ...)` và `req.flash('error', ...)`
- **Soft delete:** không xóa cứng — set `status = 'inactive'`
- **No ORM:** không dùng Sequelize/Prisma — raw SQL qua `db.js` wrapper
- **No comments:** code tự giải thích qua tên biến/hàm

---

## Files KHÔNG được sửa trực tiếp

| File | Lý do |
|------|-------|
| `database/mysql_schema.sql` | Chạy qua `node scripts/db-init.js`, sửa thì cần migration riêng |
| `.env` | Chứa credentials thật |
| `node_modules/` | Không bao giờ sửa |
| `package-lock.json` | Tự động quản lý bởi npm |

---

## Troubleshooting

**Port 3000 đã dùng:**
```bash
kill $(lsof -ti:3000)
```

**Lỗi kết nối MySQL:**
```bash
# Kiểm tra MySQL đang chạy
node -e "require('dotenv').config(); const m=require('mysql2/promise'); m.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASS}).then(c=>{console.log('OK');c.end()})"
```

**Reset database:**
```bash
node scripts/db-init.js
```
