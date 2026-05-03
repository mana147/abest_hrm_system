# ENROLLMENTS_FEATURE_MAP.md — Kế hoạch thực thi

## Context

Module Enrollments (Ghi danh học viên) là Tầng 3 đầu tiên, phụ thuộc vào Classes (đã hoàn thành 100%).

**Database đã có sẵn:**
```sql
CREATE TABLE enrollments (
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
    UNIQUE KEY uq_enrollments (student_id, class_id)
)
```

**Business rules:**
- `tuition_fee` lấy từ `courses.tuition_fee` qua JOIN `classes → course`
- `final_fee = tuition_fee - discount_amount` (phải >= 0)
- Chỉ ghi danh được khi class.status IN ('open_enrollment', 'ongoing')
- Kiểm tra capacity: COUNT(active enrollments) < classes.capacity
- UNIQUE KEY tự bắt trùng — cần bắt lỗi và hiện flash thân thiện
- `payment_status` do module Finance quản lý — không sửa ở đây
- Soft cancel: status = 'cancelled', không DELETE

**Không làm trong bước này:**
- Tạo hóa đơn (invoice) — đó là scope Finance (Tầng 4)
- Attendance — module riêng

---

## Files cần tạo / sửa

| File | Loại | Thay đổi |
|------|------|----------|
| `src/models/enrollmentModel.js` | TẠO MỚI | Model đầy đủ |
| `src/controllers/enrollmentController.js` | TẠO MỚI | Controller 8 handlers |
| `src/routes/enrollments.js` | TẠO MỚI | 8 routes |
| `src/routes/index.js` | SỬA | Register route `/enrollments` |
| `src/views/enrollments/index.ejs` | TẠO MỚI | List view |
| `src/views/enrollments/form.ejs` | TẠO MỚI | Create/edit form |
| `src/views/enrollments/show.ejs` | TẠO MỚI | Detail view |
| `src/views/classes/show.ejs` | SỬA | Thêm enrolled count + list + nút Ghi danh |
| `locales/vi.json` | SỬA | Thêm section `enrollments` |
| `locales/en.json` | SỬA | Thêm section `enrollments` |
| `ROADMAP.md` | SỬA | Enrollments 0% → 100% |

---

## Thứ tự thực thi

```
Bước 1 → Model: enrollmentModel.js (6 methods)
Bước 2 → Controller: enrollmentController.js (8 handlers)
Bước 3 → Routes: enrollments.js + đăng ký vào index.js
Bước 4 → View: index.ejs (list)
Bước 5 → View: form.ejs (create/edit)
Bước 6 → View: show.ejs (detail + cancel)
Bước 7 → Sửa classes/show.ejs (thêm enrolled panel)
Bước 8 → Locales vi.json + en.json
Bước 9 → Cập nhật ROADMAP.md
```

---

## Bước 1 — Model: `src/models/enrollmentModel.js`

Tạo file mới với 6 methods:

```js
const db = require('../config/db');
const PER_PAGE = 20;

module.exports = {

  // 1. list — có filter class_id, student_id, status, payment_status + pagination
  async list({ classId = '', studentId = '', status = '', paymentStatus = '', page = 1 }) {
    const conditions = [];
    const params     = [];

    if (classId)       { conditions.push('e.class_id = ?');        params.push(classId); }
    if (studentId)     { conditions.push('e.student_id = ?');       params.push(studentId); }
    if (status)        { conditions.push('e.status = ?');           params.push(status); }
    if (paymentStatus) { conditions.push('e.payment_status = ?');   params.push(paymentStatus); }

    const where  = conditions.length ? conditions.join(' AND ') : '1=1';
    const offset = (parseInt(page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM enrollments e WHERE ${where}`, params),
      db.query(
        `SELECT e.id, e.enrolled_at, e.status, e.payment_status,
                e.tuition_fee, e.discount_amount, e.final_fee, e.note,
                s.id AS student_id, s.student_code, s.full_name AS student_name, s.phone,
                cl.id AS class_id, cl.class_code, cl.class_name, cl.capacity,
                co.course_name
         FROM enrollments e
         JOIN students s  ON s.id  = e.student_id
         JOIN classes  cl ON cl.id = e.class_id
         JOIN courses  co ON co.id = cl.course_id
         WHERE ${where}
         ORDER BY e.enrolled_at DESC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  // 2. findById
  findById(id) {
    return db.get(
      `SELECT e.*,
              s.student_code, s.full_name AS student_name, s.phone, s.email,
              cl.class_code, cl.class_name, cl.capacity, cl.status AS class_status,
              co.course_name, co.course_code,
              t.full_name AS teacher_name,
              cr.room_name,
              ts.label AS timeslot_label
       FROM enrollments e
       JOIN students  s  ON s.id  = e.student_id
       JOIN classes   cl ON cl.id = e.class_id
       JOIN courses   co ON co.id = cl.course_id
       LEFT JOIN teachers   t  ON t.id  = cl.teacher_id
       LEFT JOIN classrooms cr ON cr.id = cl.classroom_id
       LEFT JOIN timeslots  ts ON ts.id = cl.timeslot_id
       WHERE e.id = ?`,
      [id]
    );
  },

  // 3. create — transaction: kiểm tra capacity → INSERT
  async create({ student_id, class_id, discount_amount = 0, note }) {
    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lấy thông tin lớp + học phí từ khóa học
      const [clsRows] = await conn.query(
        `SELECT cl.capacity, cl.status, co.tuition_fee
         FROM classes cl
         JOIN courses co ON co.id = cl.course_id
         WHERE cl.id = ?`,
        [class_id]
      );
      const cls = clsRows[0];
      if (!cls) throw new Error('Lớp học không tồn tại');
      if (!['open_enrollment', 'ongoing'].includes(cls.status)) {
        throw new Error('Lớp chưa mở ghi danh');
      }

      // Kiểm tra capacity
      const [[{ cnt }]] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM enrollments WHERE class_id = ? AND status = 'active'`,
        [class_id]
      );
      if (cnt >= cls.capacity) throw new Error('Lớp đã đủ sĩ số');

      const tuition_fee     = parseFloat(cls.tuition_fee);
      const discountNum     = parseFloat(discount_amount) || 0;
      const final_fee       = Math.max(0, tuition_fee - discountNum);

      const [result] = await conn.query(
        `INSERT INTO enrollments (student_id, class_id, tuition_fee, discount_amount, final_fee, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [student_id, class_id, tuition_fee, discountNum, final_fee, note || null]
      );

      await conn.commit();
      return result.insertId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // 4. update — cập nhật discount + note + tính lại final_fee
  async update(id, { discount_amount, note }) {
    // Lấy tuition_fee hiện tại để tính lại
    const enr = await db.get('SELECT tuition_fee FROM enrollments WHERE id = ?', [id]);
    if (!enr) throw new Error('Không tìm thấy ghi danh');
    const discountNum = parseFloat(discount_amount) || 0;
    const final_fee   = Math.max(0, parseFloat(enr.tuition_fee) - discountNum);
    return db.run(
      `UPDATE enrollments SET discount_amount=?, final_fee=?, note=? WHERE id=?`,
      [discountNum, final_fee, note || null, id]
    );
  },

  // 5. cancel — soft cancel
  cancel(id) {
    return db.run(`UPDATE enrollments SET status='cancelled' WHERE id=?`, [id]);
  },

  // 6. getFormOptions — danh sách học viên active + lớp đang mở/đang học
  async getFormOptions() {
    const [students, classes] = await Promise.all([
      db.query(
        `SELECT id, student_code, full_name, phone FROM students WHERE status='active' ORDER BY full_name`
      ),
      db.query(
        `SELECT cl.id, cl.class_code, cl.class_name, cl.capacity, cl.status,
                co.tuition_fee, co.course_name,
                (SELECT COUNT(*) FROM enrollments e WHERE e.class_id=cl.id AND e.status='active') AS enrolled_count
         FROM classes cl
         JOIN courses co ON co.id = cl.course_id
         WHERE cl.status IN ('open_enrollment','ongoing')
         ORDER BY cl.class_name`
      ),
    ]);
    return { students, classes };
  },

  // 7. getClassEnrollments — danh sách học viên của 1 lớp (dùng trong classes/show.ejs)
  getClassEnrollments(classId) {
    return db.query(
      `SELECT e.id, e.status, e.payment_status, e.final_fee, e.enrolled_at,
              s.student_code, s.full_name AS student_name, s.phone
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.class_id = ?
       ORDER BY e.enrolled_at ASC`,
      [classId]
    );
  },

  // 8. countActiveByClass — dùng để hiện X/capacity trên class show
  async countActiveByClass(classId) {
    const row = await db.get(
      `SELECT COUNT(*) AS cnt FROM enrollments WHERE class_id=? AND status='active'`,
      [classId]
    );
    return row?.cnt || 0;
  },
};
```

---

## Bước 2 — Controller: `src/controllers/enrollmentController.js`

```js
const enrollmentModel = require('../models/enrollmentModel');

module.exports = {

  // GET /enrollments
  async index(req, res) {
    const { class_id = '', student_id = '', status = '', payment_status = '', page = 1 } = req.query;
    const data = await enrollmentModel.list({ classId: class_id, studentId: student_id, status, paymentStatus: payment_status, page });
    res.render('enrollments/index', {
      page: 'enrollments',
      title: res.locals.t('enrollments.title'),
      ...data,
      filterClassId: class_id,
      filterStudentId: student_id,
      filterStatus: status,
      filterPaymentStatus: payment_status,
    });
  },

  // GET /enrollments/new
  async showCreate(req, res) {
    const opts = await enrollmentModel.getFormOptions();
    const preClassId = req.query.class_id || '';
    res.render('enrollments/form', {
      page: 'enrollments',
      title: res.locals.t('enrollments.add'),
      enrollment: null,
      preClassId,
      ...opts,
    });
  },

  // POST /enrollments
  async create(req, res) {
    const { student_id, class_id, discount_amount = 0, note } = req.body;
    try {
      await enrollmentModel.create({ student_id, class_id, discount_amount, note });
      req.flash('success', res.locals.t('enrollments.created'));
      res.redirect(`/enrollments?class_id=${class_id}`);
    } catch (err) {
      // Bắt lỗi duplicate (ER_DUP_ENTRY) và lỗi business
      const isDuplicate = err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate');
      req.flash('error', isDuplicate
        ? res.locals.t('enrollments.duplicate')
        : err.message
      );
      res.redirect(`/enrollments/new?class_id=${class_id}`);
    }
  },

  // GET /enrollments/:id
  async show(req, res) {
    const enrollment = await enrollmentModel.findById(req.params.id);
    if (!enrollment) { req.flash('error', 'Không tìm thấy ghi danh'); return res.redirect('/enrollments'); }
    res.render('enrollments/show', {
      page: 'enrollments',
      title: res.locals.t('enrollments.title'),
      enrollment,
    });
  },

  // GET /enrollments/:id/edit
  async showEdit(req, res) {
    const [enrollment, opts] = await Promise.all([
      enrollmentModel.findById(req.params.id),
      enrollmentModel.getFormOptions(),
    ]);
    if (!enrollment) { req.flash('error', 'Không tìm thấy ghi danh'); return res.redirect('/enrollments'); }
    res.render('enrollments/form', {
      page: 'enrollments',
      title: res.locals.t('enrollments.edit'),
      enrollment,
      preClassId: String(enrollment.class_id),
      ...opts,
    });
  },

  // POST /enrollments/:id
  async update(req, res) {
    const { discount_amount, note } = req.body;
    try {
      await enrollmentModel.update(req.params.id, { discount_amount, note });
      req.flash('success', res.locals.t('enrollments.updated'));
      res.redirect(`/enrollments/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/enrollments/${req.params.id}/edit`);
    }
  },

  // POST /enrollments/:id/cancel
  async cancel(req, res) {
    await enrollmentModel.cancel(req.params.id);
    req.flash('success', res.locals.t('enrollments.cancelled'));
    res.redirect(`/enrollments/${req.params.id}`);
  },
};
```

---

## Bước 3 — Routes

### `src/routes/enrollments.js` (TẠO MỚI)
```js
const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/enrollmentController');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);
router.get('/',            ctrl.index);
router.get('/new',         ctrl.showCreate);
router.post('/',           ctrl.create);
router.get('/:id',         ctrl.show);
router.get('/:id/edit',    ctrl.showEdit);
router.post('/:id',        ctrl.update);
router.post('/:id/cancel', ctrl.cancel);
module.exports = router;
```

### `src/routes/index.js` (SỬA — thêm sau dòng `router.use('/classes', ...)`)
```js
router.use('/enrollments', require('./enrollments'));
```

---

## Bước 4 — View: `src/views/enrollments/index.ejs`

**Các thành phần cần có:**
- Page header với title + nút "Ghi danh mới" → `/enrollments/new`
- Filter bar: dropdown class (lấy danh sách động — không cần, chỉ cần text search đơn giản), dropdown status ('active'/'cancelled'), dropdown payment_status ('unpaid'/'paid'/'partial')
- Table: STT | Học viên (code + tên + phone) | Lớp học | Học phí | Giảm | Thành tiền | Trạng thái | T.toán | Ngày ghi danh | Actions
- Pagination
- Badge status: active → `badge-active`, cancelled → `badge-cancelled`
- Badge payment: unpaid → `badge-inactive`, paid → `badge-completed`, partial → `badge-planned`

**Filter form:**
```html
<form method="GET" action="/enrollments" class="mb-4">
  <div class="d-flex gap-2 flex-wrap">
    <input type="text" name="class_id" placeholder="ID lớp" value="<%= filterClassId %>" class="form-control" style="max-width:100px">
    <select name="status" class="form-select" style="max-width:160px">
      <option value="">Tất cả trạng thái</option>
      <option value="active"    <%=filterStatus==='active'?'selected':''%>>Đang học</option>
      <option value="cancelled" <%=filterStatus==='cancelled'?'selected':''%>>Đã hủy</option>
    </select>
    <select name="payment_status" class="form-select" style="max-width:160px">
      <option value="">Tất cả thanh toán</option>
      <option value="unpaid"  <%=filterPaymentStatus==='unpaid'?'selected':''%>>Chưa thanh toán</option>
      <option value="paid"    <%=filterPaymentStatus==='paid'?'selected':''%>>Đã thanh toán</option>
      <option value="partial" <%=filterPaymentStatus==='partial'?'selected':''%>>Thanh toán 1 phần</option>
    </select>
    <button type="submit" class="btn btn-outline-secondary">Lọc</button>
    <a href="/enrollments" class="btn btn-link text-muted">Xóa lọc</a>
  </div>
</form>
```

---

## Bước 5 — View: `src/views/enrollments/form.ejs`

**Create mode** (enrollment === null): hiển thị đầy đủ, cần chọn học viên + lớp
**Edit mode** (enrollment !== null): chỉ cho sửa discount_amount + note (student/class lock lại)

**Layout 2 cột:**
- Cột trái (col-md-7): chọn Học viên + chọn Lớp học
- Cột phải (col-md-5): Học phí (readonly, auto-fill từ JS), Giảm giá (input), Thành tiền (readonly, tính bằng JS), Ghi chú

**JavaScript quan trọng:** Khi user chọn lớp, auto-fill học phí + hiển thị capacity warning:
```html
<script>
const classData = <%- JSON.stringify(classes) %>;
function onClassChange(val) {
  const cls = classData.find(c => String(c.id) === String(val));
  if (!cls) return;
  document.getElementById('tuition_fee_display').value =
    Number(cls.tuition_fee).toLocaleString('vi-VN') + ' đ';
  const remaining = cls.capacity - cls.enrolled_count;
  const capEl = document.getElementById('capacity_info');
  capEl.textContent = `${cls.enrolled_count}/${cls.capacity} học viên — còn ${remaining} chỗ`;
  capEl.className = remaining <= 0 ? 'text-danger' : (remaining <= 3 ? 'text-warning' : 'text-success');
  calcFinalFee();
}
function calcFinalFee() {
  const tuition  = parseFloat(document.getElementById('tuition_fee_raw').value) || 0;
  const discount = parseFloat(document.getElementById('discount_input').value)   || 0;
  const final    = Math.max(0, tuition - discount);
  document.getElementById('final_fee_display').value = final.toLocaleString('vi-VN') + ' đ';
}
</script>
```

**Input fields:**
- `student_id` — `<select>` với options từ `students[]` (student_code + full_name)
- `class_id` — `<select>` với options từ `classes[]`, onchange=onClassChange(); preselect từ `preClassId`
- `tuition_fee_raw` — `<input type="hidden">` (lưu raw number để tính)
- `tuition_fee_display` — `<input readonly>` (hiển thị formatted)
- `discount_amount` — `<input type="number" min="0">`
- `final_fee_display` — `<input readonly>`
- `note` — `<textarea>`

**Edit mode:** student_id + class_id hiển thị dưới dạng text (không phải select), kèm hidden input.

---

## Bước 6 — View: `src/views/enrollments/show.ejs`

**Layout 2 cột:**

**Cột trái (col-lg-8):**
- Card "Thông tin ghi danh": học viên, lớp, khóa học, giáo viên, phòng học, khung giờ, ngày ghi danh
- Card "Học phí": tuition_fee, discount_amount, final_fee (highlight), payment_status badge

**Cột phải (col-lg-4):**
- Card "Thao tác":
  - Nút Sửa (chỉ khi status='active') → `/enrollments/:id/edit`
  - Nút Hủy ghi danh (chỉ khi status='active') — form POST với confirm()
  - Badge trạng thái hiện tại
- Link "Xem lớp học" → `/classes/:class_id`
- Link "Xem học viên" → `/students/:student_id`

**Nút Hủy:**
```html
<% if (enrollment.status === 'active') { %>
<form method="POST" action="/enrollments/<%= enrollment.id %>/cancel"
      onsubmit="return confirm('<%= lang==='vi' ? 'Hủy ghi danh học viên này?' : 'Cancel this enrollment?' %>')">
  <button type="submit" class="btn btn-danger w-100">
    <i class="bi bi-x-circle me-2"></i>
    <%= lang==='vi' ? 'Hủy ghi danh' : 'Cancel enrollment' %>
  </button>
</form>
<% } %>
```

---

## Bước 7 — Sửa `src/views/classes/show.ejs`

**Mục tiêu:** Thêm panel "Học viên ghi danh" vào bên phải (col-lg-4 sidebar).

### 7a. Controller classes phải truyền thêm data

Trong `src/controllers/classController.js`, cập nhật hàm `show()`:
```js
// Thêm import ở đầu file:
const enrollmentModel = require('../models/enrollmentModel');

// Trong show(), thêm vào Promise.all:
const [cls, sessions, opts, holidayCount, enrollments, enrolledCount] = await Promise.all([
  classModel.findById(req.params.id),
  classModel.getSessions(req.params.id),
  classModel.getFormOptions(),
  classModel.countHolidaySessions(req.params.id),
  enrollmentModel.getClassEnrollments(req.params.id),
  enrollmentModel.countActiveByClass(req.params.id),
]);

// Truyền vào render:
res.render('classes/show', {
  // ... các field cũ ...
  enrollments,
  enrolledCount,
});
```

### 7b. Trong show.ejs — thêm vào phần thông tin lớp (infoRows)

Tìm dòng `[t('classes.capacity'), ...]` — thay bằng:
```ejs
[t('classes.capacity'), `${enrolledCount} / ${cls.capacity} ${lang==='vi' ? 'học viên' : 'students'}`],
```

### 7c. Trong show.ejs — thêm card "Học viên ghi danh" vào cột phải (col-lg-4)

Thêm card mới dưới Status card hiện tại:
```ejs
<!-- Enrolled students card -->
<div class="card mb-4">
  <div class="card-header d-flex justify-content-between align-items-center">
    <div>
      <i class="bi bi-people me-2" style="color:var(--rausch)"></i>
      <%= lang==='vi' ? 'Học viên ghi danh' : 'Enrolled students' %>
      <span class="badge bg-secondary ms-2"><%= enrolledCount %></span>
    </div>
    <% if (!['completed','cancelled'].includes(cls.status)) { %>
    <a href="/enrollments/new?class_id=<%= cls.id %>" class="btn btn-sm btn-primary">
      <i class="bi bi-plus me-1"></i>
      <%= lang==='vi' ? 'Ghi danh' : 'Enroll' %>
    </a>
    <% } %>
  </div>
  <% if (enrollments.length === 0) { %>
  <div class="card-body text-center text-muted py-4" style="font-size:13px">
    <%= lang==='vi' ? 'Chưa có học viên nào' : 'No students enrolled' %>
  </div>
  <% } else { %>
  <ul class="list-group list-group-flush">
    <% enrollments.forEach((e, i) => { %>
    <li class="list-group-item d-flex justify-content-between align-items-center px-3 py-2" style="font-size:13px">
      <div>
        <div class="fw-semibold" style="color:var(--ink)"><%= e.student_name %></div>
        <div style="color:var(--ash)"><%= e.student_code %> · <%= e.phone %></div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <% const payBadge = {unpaid:'badge-inactive',paid:'badge-completed',partial:'badge-planned'}[e.payment_status] || 'badge-inactive'; %>
        <span class="badge <%= payBadge %>" style="font-size:10px">
          <%= e.payment_status === 'unpaid' ? (lang==='vi' ? 'Chưa TT' : 'Unpaid')
            : e.payment_status === 'paid'   ? (lang==='vi' ? 'Đã TT'   : 'Paid')
                                            : (lang==='vi' ? '1 phần'  : 'Partial') %>
        </span>
        <a href="/enrollments/<%= e.id %>" style="color:var(--ash)" title="Xem chi tiết">
          <i class="bi bi-box-arrow-up-right" style="font-size:12px"></i>
        </a>
      </div>
    </li>
    <% }) %>
  </ul>
  <% } %>
  <% if (enrollments.length > 0) { %>
  <div class="card-footer text-center">
    <a href="/enrollments?class_id=<%= cls.id %>" style="font-size:12px;color:var(--ash)">
      <%= lang==='vi' ? 'Xem tất cả ghi danh →' : 'View all enrollments →' %>
    </a>
  </div>
  <% } %>
</div>
```

---

## Bước 8 — Locales

### `locales/vi.json` — thêm section `"enrollments"` (trước `"schedule"` hoặc cuối file):
```json
"enrollments": {
  "title": "Quản lý ghi danh",
  "add": "Ghi danh học viên",
  "edit": "Chỉnh sửa ghi danh",
  "student": "Học viên",
  "class": "Lớp học",
  "tuition_fee": "Học phí gốc",
  "discount": "Giảm giá",
  "final_fee": "Thành tiền",
  "payment_status": "Trạng thái thanh toán",
  "enrolled_at": "Ngày ghi danh",
  "status": "Trạng thái",
  "note": "Ghi chú",
  "created": "Đã ghi danh thành công",
  "updated": "Cập nhật thành công",
  "cancelled": "Đã hủy ghi danh",
  "duplicate": "Học viên này đã được ghi danh vào lớp",
  "class_full": "Lớp đã đủ sĩ số",
  "class_not_open": "Lớp chưa mở ghi danh"
}
```

### `locales/en.json` — thêm section `"enrollments"`:
```json
"enrollments": {
  "title": "Enrollment Management",
  "add": "Enroll Student",
  "edit": "Edit Enrollment",
  "student": "Student",
  "class": "Class",
  "tuition_fee": "Base Tuition",
  "discount": "Discount",
  "final_fee": "Final Fee",
  "payment_status": "Payment Status",
  "enrolled_at": "Enrolled At",
  "status": "Status",
  "note": "Note",
  "created": "Enrolled successfully",
  "updated": "Updated successfully",
  "cancelled": "Enrollment cancelled",
  "duplicate": "Student is already enrolled in this class",
  "class_full": "Class has reached capacity",
  "class_not_open": "Class is not open for enrollment"
}
```

---

## Bước 9 — Cập nhật ROADMAP.md

- Đổi thanh tiến độ: `Enrollments ░░░░░░░░░░░░░░░░░░░░   0%` → `Enrollments ████████████████████ 100%`
- Thêm checklist vào section "Đã hoàn thành":
  ```
  #### Enrollments (`/enrollments`) ✅
  - [x] Model: list, findById, create (transaction + capacity check), update, cancel, getFormOptions, getClassEnrollments, countActiveByClass
  - [x] Controller + Routes (7 routes)
  - [x] View: index (list + filter status/payment_status)
  - [x] View: form (create + edit, JS auto-fill tuition_fee + capacity info)
  - [x] View: show (detail + cancel button)
  - [x] classes/show.ejs: enrolled count + student list + nút Ghi danh
  - [x] Song ngữ EN/VI
  ```
- Đổi `[ ] Ghi danh học viên vào lớp` → `[x]`

---

## Quy tắc cho AI Agent thực thi

- **Không dùng ORM** — raw SQL qua `db.query`, `db.get`, `db.run` hoặc `db.pool.getConnection()`
- **Không thêm npm package** mới
- **Luôn sửa cả 2 file** `locales/vi.json` và `locales/en.json` đồng thời
- **Không xóa cứng** — cancel chỉ đổi status = 'cancelled'
- Pattern form: POST thuần, không fetch/XHR
- `tuition_fee` lấy từ course qua class — không để user nhập tay
- Sau khi implement, chạy kiểm tra syntax:
  ```bash
  node -e "require('./src/models/enrollmentModel')"
  node -e "require('./src/controllers/enrollmentController')"
  node -e "require('./src/routes/enrollments')"
  ```

---

## Verification sau khi xong

1. Vào `/classes/:id` của lớp có status `open_enrollment` → thấy panel "Học viên ghi danh" + nút "Ghi danh"
2. Click "Ghi danh" → form mở với lớp preselected, học phí auto-fill
3. Chọn học viên + submit → flash success, redirect về list enrollments của lớp đó
4. Ghi danh lại cùng học viên → flash error "Đã ghi danh"
5. Lớp đã đủ sĩ số → flash error "Đủ sĩ số"
6. Vào `/enrollments/:id` → detail page, nút Hủy hiện, click → confirm → cancelled
7. Sau cancel, nút Hủy biến mất, status hiện `badge-cancelled`
8. Vào lớp có status `completed` → không có nút Ghi danh
