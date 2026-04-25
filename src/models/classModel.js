const db = require('../config/db');
const {
  generateSessionDates,
  calcExpectedEndDate,
  calcNextOpeningDate,
  generateClassCode,
  formatDate,
} = require('../utils/scheduling');

const PER_PAGE = 20;

const ACTIVE_STATUSES = ['planned', 'open_enrollment', 'ongoing'];

const VALID_TRANSITIONS = {
  planned:         ['open_enrollment', 'cancelled'],
  open_enrollment: ['ongoing', 'cancelled'],
  ongoing:         ['completed', 'postponed'],
  postponed:       ['open_enrollment', 'cancelled'],
};

function buildWhere(search, status, courseId) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(cl.class_code LIKE ? OR cl.class_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status)   { cond.push('cl.status = ?');    params.push(status); }
  if (courseId) { cond.push('cl.course_id = ?'); params.push(courseId); }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  VALID_TRANSITIONS,

  async list({ search = '', status = '', courseId = '', page = 1 }) {
    const { where, params } = buildWhere(search, status, courseId);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM classes cl WHERE ${where}`, params),
      db.query(
        `SELECT cl.id, cl.class_code, cl.class_name, cl.status,
                cl.start_date, cl.expected_end_date, cl.total_sessions, cl.sessions_completed, cl.capacity,
                co.course_name, co.course_code,
                t.full_name AS teacher_name,
                cr.room_code, cr.room_name,
                ts.label AS timeslot_label
         FROM classes cl
         JOIN courses    co ON co.id = cl.course_id
         JOIN classrooms cr ON cr.id = cl.classroom_id
         JOIN timeslots  ts ON ts.id = cl.timeslot_id
         LEFT JOIN teachers t ON t.id = cl.teacher_id
         WHERE ${where}
         ORDER BY cl.start_date DESC, cl.id DESC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  findById(id) {
    return db.get(
      `SELECT cl.*,
              co.course_name, co.course_code, co.session_duration_minutes,
              t.full_name AS teacher_name, t.teacher_code,
              cr.room_code, cr.room_name,
              ts.label AS timeslot_label, ts.weekdays_pattern, ts.start_time, ts.end_time,
              sl.line_code, sl.line_name
       FROM classes cl
       JOIN courses    co ON co.id = cl.course_id
       JOIN classrooms cr ON cr.id = cl.classroom_id
       JOIN timeslots  ts ON ts.id = cl.timeslot_id
       LEFT JOIN teachers      t  ON t.id  = cl.teacher_id
       LEFT JOIN schedule_lines sl ON sl.id = cl.line_id
       WHERE cl.id = ?`,
      [id]
    );
  },

  getSessions(classId) {
    return db.query(
      `SELECT cs.*, t.full_name AS teacher_name, cr.room_name
       FROM class_sessions cs
       LEFT JOIN teachers   t  ON t.id  = cs.teacher_id
       LEFT JOIN classrooms cr ON cr.id = cs.classroom_id
       WHERE cs.class_id = ?
       ORDER BY cs.session_no ASC`,
      [classId]
    );
  },

  async getFormOptions() {
    const [courses, teachers, classrooms, timeslots, scheduleLines] = await Promise.all([
      db.query(`SELECT id, course_code, course_name, total_sessions, tuition_fee
                FROM courses WHERE status='active' ORDER BY course_name ASC`),
      db.query(`SELECT id, teacher_code, full_name FROM teachers WHERE status='active' ORDER BY full_name ASC`),
      db.query(`SELECT id, room_code, room_name FROM classrooms WHERE status='active' ORDER BY room_code ASC`),
      db.query(`SELECT id, timeslot_code, label, weekdays_pattern, start_time, end_time
                FROM timeslots WHERE status='active' ORDER BY timeslot_code ASC`),
      db.query(
        `SELECT sl.id, sl.line_code, sl.line_name, sl.classroom_id, sl.timeslot_id, sl.default_capacity,
                cl.room_code, cl.room_name,
                ts.label AS timeslot_label, ts.weekdays_pattern, ts.start_time, ts.end_time
         FROM schedule_lines sl
         JOIN classrooms cl ON cl.id = sl.classroom_id
         JOIN timeslots  ts ON ts.id = sl.timeslot_id
         WHERE sl.active = 1
         ORDER BY sl.line_code ASC`
      ),
    ]);
    return { courses, teachers, classrooms, timeslots, scheduleLines };
  },

  async getHolidaySet() {
    const rows = await db.query(`SELECT holiday_date FROM holidays WHERE is_active = 1`);
    const set  = new Set();
    for (const r of rows) {
      set.add(formatDate(r.holiday_date));
    }
    return set;
  },

  getActiveClassOnLine(lineId) {
    return db.get(
      `SELECT id, class_code, class_name, status
       FROM classes
       WHERE line_id = ? AND status IN ('planned','open_enrollment','ongoing')
       LIMIT 1`,
      [lineId]
    );
  },

  async ensureUniqueCode(baseCode) {
    let code = baseCode;
    let n    = 2;
    while (await db.get('SELECT id FROM classes WHERE class_code = ?', [code])) {
      code = `${baseCode}-${n++}`;
    }
    return code;
  },

  async create(data, holidaySet) {
    const {
      line_id, course_id, teacher_id, classroom_id, timeslot_id,
      start_date, total_sessions, capacity, status, class_name, note,
    } = data;

    // Fetch timeslot for scheduling
    const timeslot = await db.get(
      `SELECT weekdays_pattern, start_time, end_time FROM timeslots WHERE id = ?`,
      [timeslot_id]
    );
    if (!timeslot) throw new Error('Timeslot không tồn tại');

    // Fetch course_code for class_code generation
    const course = await db.get(`SELECT course_code FROM courses WHERE id = ?`, [course_id]);
    if (!course) throw new Error('Khóa học không tồn tại');

    const baseCode = generateClassCode(course.course_code, start_date);
    const classCode = await this.ensureUniqueCode(baseCode);

    // Calculate scheduling dates
    const totalSess = parseInt(total_sessions);
    const dates       = generateSessionDates(start_date, timeslot.weekdays_pattern, totalSess, holidaySet);
    const expectedEnd = dates.length > 0 ? dates[dates.length - 1] : null;
    const nextOpen    = expectedEnd
      ? calcNextOpeningDate(expectedEnd, timeslot.weekdays_pattern, 3)
      : null;

    const conn = await db.pool.getConnection();
    await conn.beginTransaction();
    try {
      const [classResult] = await conn.execute(
        `INSERT INTO classes
           (line_id, class_code, class_name, course_id, teacher_id,
            classroom_id, timeslot_id, start_date, expected_end_date,
            resource_release_date, next_opening_available_date,
            total_sessions, capacity, status, note)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          line_id     || null,
          classCode,
          class_name?.trim(),
          course_id,
          teacher_id  || null,
          classroom_id,
          timeslot_id,
          start_date,
          expectedEnd || null,
          expectedEnd || null,
          nextOpen    || null,
          totalSess,
          parseInt(capacity) || 15,
          status || 'planned',
          note?.trim() || null,
        ]
      );

      const classId = classResult.insertId;

      // Batch INSERT class_sessions
      for (let i = 0; i < dates.length; i++) {
        await conn.execute(
          `INSERT INTO class_sessions
             (class_id, session_no, session_date, start_time, end_time, teacher_id, classroom_id, status)
           VALUES (?,?,?,?,?,?,?,'scheduled')`,
          [classId, i + 1, dates[i], timeslot.start_time, timeslot.end_time,
           teacher_id || null, classroom_id]
        );
      }

      await conn.commit();
      return classId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  update(id, data) {
    return db.run(
      `UPDATE classes SET class_name=?, teacher_id=?, capacity=?, note=? WHERE id=?`,
      [
        data.class_name?.trim(),
        data.teacher_id || null,
        parseInt(data.capacity) || 15,
        data.note?.trim() || null,
        id,
      ]
    );
  },

  async updateStatus(id, newStatus) {
    const cls = await db.get(`SELECT status FROM classes WHERE id = ?`, [id]);
    if (!cls) throw new Error('Lớp không tồn tại');

    const allowed = VALID_TRANSITIONS[cls.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Không thể chuyển từ "${cls.status}" sang "${newStatus}"`);
    }

    return db.run(`UPDATE classes SET status=? WHERE id=?`, [newStatus, id]);
  },

  async updateSession(sessionId, { status, note, session_date, start_time, end_time, teacher_id, classroom_id }) {
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
    if (!validStatuses.includes(status)) throw new Error('Trạng thái buổi học không hợp lệ');
    if (status === 'rescheduled' && !session_date) throw new Error('Dời lịch yêu cầu phải có ngày học mới');

    const conn = await db.pool.getConnection();
    await conn.beginTransaction();
    try {
      const [sessionRows] = await conn.execute(
        `SELECT class_id FROM class_sessions WHERE id = ?`, [sessionId]
      );
      if (!sessionRows.length) throw new Error('Buổi học không tồn tại');
      const classId = sessionRows[0].class_id;

      if (status === 'rescheduled' && session_date) {
        await conn.execute(
          `UPDATE class_sessions
           SET status=?, note=?, session_date=?, start_time=?, end_time=?, teacher_id=?, classroom_id=?
           WHERE id=?`,
          [
            status,
            note?.trim() || null,
            session_date,
            start_time || null,
            end_time   || null,
            teacher_id || null,
            classroom_id || null,
            sessionId,
          ]
        );
      } else {
        await conn.execute(
          `UPDATE class_sessions SET status=?, note=? WHERE id=?`,
          [status, note?.trim() || null, sessionId]
        );
      }

      const [[countRow]] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM class_sessions WHERE class_id=? AND status='completed'`,
        [classId]
      );
      await conn.execute(
        `UPDATE classes SET sessions_completed=? WHERE id=?`,
        [countRow.cnt, classId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async countHolidaySessions(classId) {
    const row = await db.get(
      `SELECT COUNT(*) AS cnt
       FROM class_sessions cs
       JOIN holidays h ON h.holiday_date = cs.session_date
       WHERE cs.class_id = ? AND cs.status = 'scheduled' AND h.is_active = 1`,
      [classId]
    );
    return row?.cnt || 0;
  },

  async batchCancelHolidaySessions(classId) {
    const sessions = await db.query(
      `SELECT cs.id, h.holiday_name
       FROM class_sessions cs
       JOIN holidays h ON h.holiday_date = cs.session_date
       WHERE cs.class_id = ? AND cs.status = 'scheduled' AND h.is_active = 1`,
      [classId]
    );
    if (sessions.length === 0) return 0;

    const conn = await db.pool.getConnection();
    await conn.beginTransaction();
    try {
      for (const s of sessions) {
        await conn.execute(
          `UPDATE class_sessions SET status='cancelled', note=? WHERE id=?`,
          [`Nghỉ lễ: ${s.holiday_name}`, s.id]
        );
      }
      const [[countRow]] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM class_sessions WHERE class_id=? AND status='completed'`,
        [classId]
      );
      await conn.execute(
        `UPDATE classes SET sessions_completed=? WHERE id=?`,
        [countRow.cnt, classId]
      );
      await conn.commit();
      return sessions.length;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
