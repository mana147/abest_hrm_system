# Class Sessions (Partial) — Execution Plan

## Context

Module Classes đã hoàn thiện 100% phần core (CRUD, auto-generate sessions, scheduling). Còn 2 tính năng chưa có UI và 1 bug logic chưa xử lý:

1. **Bug:** `classes.sessions_completed` không bao giờ được update khi session đổi trạng thái
2. **Missing:** Không có UI để thay đổi ngày/giờ/giáo viên/phòng khi reschedule một buổi học
3. **Missing:** Không có UI để batch cancel các buổi học trùng với ngày nghỉ lễ trong bảng `holidays`

File thực thi đặt trong project: `feature_map/CLASS_SESSIONS_FEATURE_MAP.md` (tạo ở bước đầu tiên khi execute).

---

## Files cần sửa

| File | Thay đổi |
|------|---------|
| `src/models/classModel.js` | Refactor `updateSession` + thêm 2 methods mới |
| `src/controllers/classController.js` | Cập nhật `show` + `updateSession` + thêm `cancelHolidaySessions` |
| `src/routes/classes.js` | Thêm 1 route mới |
| `src/views/classes/show.ejs` | Thêm reschedule UI + holiday cancel button |
| `locales/vi.json` + `locales/en.json` | Thêm translation keys |

---

## Thứ tự thực thi

```
Bước 1 → Model: refactor updateSession (F1 + F2 base)
Bước 2 → Model: thêm batchCancelHolidaySessions + countHolidaySessions (F3)
Bước 3 → Controller: cập nhật show() + updateSession() + thêm cancelHolidaySessions()
Bước 4 → Routes: thêm POST /:id/cancel-holidays
Bước 5 → View: cập nhật show.ejs (reschedule UI + holiday button)
Bước 6 → Locales: thêm translation keys vi.json + en.json
```

---

## Bước 1 — Model: refactor `updateSession`

**File:** `src/models/classModel.js`

**Thay thế toàn bộ function `updateSession` (hiện tại ~dòng 250–256):**

Logic cũ: 1 `db.run()` đơn giản, chỉ update `status` + `note`.

Logic mới — transaction 4 bước:
1. `SELECT class_id FROM class_sessions WHERE id = sessionId`
2. Nếu `status === 'rescheduled'` và có `session_date` → UPDATE thêm scheduling fields (`session_date`, `start_time`, `end_time`, `teacher_id`, `classroom_id`)
3. Nếu `status === 'rescheduled'` nhưng KHÔNG có `session_date` → throw Error `'Dời lịch yêu cầu ngày học mới'`
4. `SELECT COUNT(*) AS cnt FROM class_sessions WHERE class_id=? AND status='completed'`
5. `UPDATE classes SET sessions_completed=? WHERE id=?`

Dùng `db.pool.getConnection()` + `conn.beginTransaction()` để đảm bảo atomicity.

**Signature mới:**
```js
async updateSession(sessionId, { status, note, session_date, start_time, end_time, teacher_id, classroom_id })
```

**SQL nhánh A** (status != 'rescheduled' hoặc không có session_date):
```sql
UPDATE class_sessions SET status=?, note=? WHERE id=?
```

**SQL nhánh B** (status = 'rescheduled' VÀ có session_date):
```sql
UPDATE class_sessions
SET status=?, note=?, session_date=?, start_time=?, end_time=?, teacher_id=?, classroom_id=?
WHERE id=?
```

**Sau update** (cả 2 nhánh đều chạy):
```sql
SELECT COUNT(*) AS cnt FROM class_sessions WHERE class_id=? AND status='completed'
UPDATE classes SET sessions_completed=? WHERE id=?
```

---

## Bước 2 — Model: thêm 2 methods mới

**File:** `src/models/classModel.js` — thêm sau `updateSession`

### `countHolidaySessions(classId)`
```sql
SELECT COUNT(*) AS cnt
FROM class_sessions cs
JOIN holidays h ON h.holiday_date = cs.session_date
WHERE cs.class_id = ? AND cs.status = 'scheduled' AND h.is_active = 1
```
Trả về: `row?.cnt || 0`

### `batchCancelHolidaySessions(classId)`
```sql
-- Bước 1: lấy danh sách sessions cần cancel
SELECT cs.id, h.holiday_name
FROM class_sessions cs
JOIN holidays h ON h.holiday_date = cs.session_date
WHERE cs.class_id = ? AND cs.status = 'scheduled' AND h.is_active = 1

-- Bước 2: loop và cancel từng session (note riêng biệt)
UPDATE class_sessions SET status='cancelled', note=? WHERE id=?
-- note = 'Nghỉ lễ: {holiday_name}'

-- Bước 3: sync sessions_completed
SELECT COUNT(*) AS cnt FROM class_sessions WHERE class_id=? AND status='completed'
UPDATE classes SET sessions_completed=? WHERE id=?
```
Dùng transaction. Trả về: `sessions.length` (số session đã cancel).

---

## Bước 3 — Controller

**File:** `src/controllers/classController.js`

### Cập nhật `show()` (~dòng 98–113)

Thêm 2 queries vào `Promise.all`:
```js
const [cls, sessions, opts, holidayCount] = await Promise.all([
  classModel.findById(req.params.id),
  classModel.getSessions(req.params.id),
  classModel.getFormOptions(),          // MỚI — cho reschedule dropdowns
  classModel.countHolidaySessions(req.params.id),  // MỚI — cho holiday button
]);
```

Truyền vào render thêm:
```js
teachers: opts.teachers,
classrooms: opts.classrooms,
holidayCount,
```

### Cập nhật `updateSession()` (~dòng 170–180)

Extract thêm fields từ `req.body`:
```js
const { status, note, session_date, start_time, end_time, teacher_id, classroom_id } = req.body;
await classModel.updateSession(sessionId, {
  status, note, session_date, start_time, end_time, teacher_id, classroom_id
});
```
Flash + redirect giữ nguyên.

### Thêm `cancelHolidaySessions()` (cuối module.exports)

```js
async cancelHolidaySessions(req, res) {
  const { id } = req.params;
  try {
    const count = await classModel.batchCancelHolidaySessions(id);
    if (count === 0) {
      req.flash('error', res.locals.t('classes.no_holiday_sessions'));
    } else {
      req.flash('success',
        res.locals.t('classes.holiday_cancelled').replace('%d', count)
      );
    }
  } catch (err) {
    console.error('[class.cancelHolidaySessions]', err);
    req.flash('error', err.message);
  }
  res.redirect(`/classes/${id}#sessions`);
},
```

---

## Bước 4 — Routes

**File:** `src/routes/classes.js`

Thêm sau dòng `router.post('/:id/sessions/:sessionId', ctrl.updateSession)`:
```js
router.post('/:id/cancel-holidays', ctrl.cancelHolidaySessions);
```

---

## Bước 5 — View: show.ejs

**File:** `src/views/classes/show.ejs`

### 5a. Card header của sessions table

Tìm `div.card-header` của section sessions. Thêm:
- Badge warning hiển thị số buổi trùng lễ nếu `holidayCount > 0`
- Button "Hủy buổi nghỉ lễ" với `confirm()` JS nếu `holidayCount > 0` và class chưa completed/cancelled

```ejs
<% if (holidayCount > 0 && !['completed','cancelled'].includes(cls.status)) { %>
<form method="POST" action="/classes/<%= cls.id %>/cancel-holidays"
      onsubmit="return confirm('<%= lang==='vi' ? `Hủy ${holidayCount} buổi trùng ngày nghỉ lễ?` : `Cancel ${holidayCount} holiday-conflicting sessions?` %>')">
  <button type="submit" class="btn btn-sm btn-warning">
    <i class="bi bi-calendar-x me-1"></i>
    <%= lang==='vi' ? 'Hủy buổi nghỉ lễ' : 'Cancel holiday sessions' %>
    (<%= holidayCount %>)
  </button>
</form>
<% } %>
```

### 5b. Sessions table rows — thêm reschedule UI

Với mỗi session row trong `sessions.forEach`, thêm một `<tr>` ẩn ngay bên dưới chứa reschedule form. Row này chỉ hiện khi user chọn `status='rescheduled'` trên dropdown.

**Cấu trúc form mới:** Đặt `<form>` làm wrapper dùng `id="session-form-<%= s.id %>"`, status dropdown trong main row dùng `form` attribute để liên kết. Hidden input `note` nằm trong form đó.

**Main row:** Dropdown status dùng `form="session-form-<%= s.id %>"` + `onchange="toggleReschedule(<%= s.id %>, this.value)"`.

**Reschedule row** (style="display:none", hiện khi status='rescheduled'):
```html
<form id="session-form-<%= s.id %>" method="POST"
      action="/classes/<%= cls.id %>/sessions/<%= s.id %>">
  <input type="hidden" name="note" value="<%= s.note||'' %>">
  <!-- status được set bởi hidden input được toggle bởi JS -->
  <input type="hidden" name="status" id="status-hidden-<%= s.id %>" value="<%= s.status %>">
  <div class="row g-2 p-2" style="background:var(--cloud)">
    <!-- session_date (required) -->
    <!-- start_time, end_time (optional, pre-filled) -->
    <!-- teacher_id select (optional, pre-filled, từ teachers[]) -->
    <!-- classroom_id select (optional, pre-filled, từ classrooms[]) -->
    <!-- Submit button -->
  </div>
</form>
```

**JavaScript** (thêm vào cuối show.ejs trước `</body>`):
```js
function toggleReschedule(sessionId, status) {
  const row = document.getElementById('reschedule-row-' + sessionId);
  const hidden = document.getElementById('status-hidden-' + sessionId);
  row.style.display = (status === 'rescheduled') ? '' : 'none';
  if (hidden) hidden.value = status;
}
// Init: mở sẵn row cho sessions đang ở trạng thái rescheduled
document.addEventListener('DOMContentLoaded', () => {
  <% sessions.forEach(s => { %>
    <% if (s.status === 'rescheduled') { %>
      toggleReschedule(<%= s.id %>, 'rescheduled');
    <% } %>
  <% }) %>
});
```

---

## Bước 6 — Locales

**File:** `locales/vi.json` — thêm vào section `"classes"`:
```json
"reschedule_required": "Dời lịch yêu cầu phải có ngày học mới",
"holiday_cancelled": "Đã hủy %d buổi trùng lịch nghỉ lễ",
"no_holiday_sessions": "Không có buổi nào trùng ngày nghỉ lễ"
```

**File:** `locales/en.json` — thêm vào section `"classes"`:
```json
"reschedule_required": "Reschedule requires a new session date",
"holiday_cancelled": "Cancelled %d sessions conflicting with holidays",
"no_holiday_sessions": "No scheduled sessions conflict with holidays"
```

---

## Verification

### Test Feature 1 (sessions_completed):
1. Vào `/classes/:id` — xem `sessions_completed` = 0 ban đầu
2. Mark 1 session → `completed` → kiểm tra badge progress tăng lên 1/N
3. Mark lại → `scheduled` → kiểm tra giảm về 0/N

### Test Feature 2 (Reschedule UI):
1. Chọn dropdown `Dời lịch` trên 1 session row → reschedule row xuất hiện
2. Không nhập ngày mới → submit → server trả error flash
3. Nhập ngày mới + submit → DB session_date được update, row hiển thị ngày mới
4. Chuyển sang status khác → reschedule row ẩn lại

### Test Feature 3 (Batch cancel holidays):
1. DB có holiday_date trùng với session_date của lớp đang test → badge warning xuất hiện
2. Click button "Hủy buổi nghỉ lễ" → confirm dialog → confirm → flash success với số lượng
3. Badge biến mất vì không còn session nào trùng lễ + status='scheduled'
4. Click lại → flash error "Không có buổi nào trùng"

---

## Lưu ý cho subagent thực thi

- **Không dùng ORM** — raw SQL qua `db.query`, `db.get`, `db.run`, hoặc `db.pool.getConnection()`
- **Không thêm npm package** mới
- **Luôn sửa cả 2 file** `locales/vi.json` và `locales/en.json` đồng thời
- **Không xóa cứng** — batch cancel chỉ đổi status, không DELETE
- Pattern inline form hiện tại dùng POST (không fetch/XHR) — giữ nguyên
- Sau khi implement xong, cập nhật ROADMAP.md: Class Sessions từ 60% → 100%
