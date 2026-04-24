const db      = require('../config/db');
const PER_PAGE = 20;

const ACTIVE_STATUSES = `'planned','open_enrollment','ongoing'`;

function buildWhere(search, active) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(sl.line_code LIKE ? OR sl.line_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (active !== '') { cond.push('sl.active = ?'); params.push(active); }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  async list({ search = '', active = '', page = 1 }) {
    const { where, params } = buildWhere(search, active);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM schedule_lines sl WHERE ${where}`, params),
      db.query(
        `SELECT sl.id, sl.line_code, sl.line_name, sl.default_capacity, sl.active,
                cl.room_code, cl.room_name,
                ts.label AS timeslot_label, ts.weekdays_pattern, ts.start_time, ts.end_time,
                c.id AS active_class_id, c.class_code, c.class_name AS active_class_name,
                c.status AS class_status,
                c.next_opening_available_date
         FROM schedule_lines sl
         JOIN classrooms cl ON cl.id = sl.classroom_id
         JOIN timeslots  ts ON ts.id = sl.timeslot_id
         LEFT JOIN classes c ON c.line_id = sl.id
           AND c.status IN (${ACTIVE_STATUSES})
         WHERE ${where}
         ORDER BY sl.line_code ASC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  findById(id) {
    return db.get(
      `SELECT sl.*,
              cl.room_code, cl.room_name, cl.capacity AS room_capacity,
              ts.label AS timeslot_label, ts.weekdays_pattern, ts.start_time, ts.end_time,
              ts.sessions_per_week,
              co.course_code, co.course_name,
              b.branch_name
       FROM schedule_lines sl
       JOIN classrooms cl ON cl.id = sl.classroom_id
       JOIN timeslots  ts ON ts.id = sl.timeslot_id
       LEFT JOIN courses  co ON co.id = sl.course_id
       LEFT JOIN branches b  ON b.id  = sl.branch_id
       WHERE sl.id = ?`,
      [id]
    );
  },

  getActiveClass(lineId) {
    return db.get(
      `SELECT id, class_code, class_name, status, start_date,
              expected_end_date, next_opening_available_date
       FROM classes
       WHERE line_id = ? AND status IN (${ACTIVE_STATUSES})
       LIMIT 1`,
      [lineId]
    );
  },

  async getFormOptions() {
    const [classrooms, timeslots, courses, branches] = await Promise.all([
      db.query(`SELECT id, room_code, room_name FROM classrooms WHERE status='active' ORDER BY room_code`),
      db.query(`SELECT id, timeslot_code, label, weekdays_pattern, start_time, end_time FROM timeslots WHERE status='active' ORDER BY timeslot_code`),
      db.query(`SELECT id, course_code, course_name FROM courses WHERE status='active' ORDER BY course_name`),
      db.query(`SELECT id, branch_name FROM branches WHERE status='active' ORDER BY branch_name`),
    ]);
    return { classrooms, timeslots, courses, branches };
  },

  create(data) {
    return db.run(
      `INSERT INTO schedule_lines
         (line_code, line_name, branch_id, course_id, classroom_id,
          timeslot_id, default_capacity, active, note)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        data.line_code?.trim(),
        data.line_name?.trim(),
        data.branch_id    || null,
        data.course_id    || null,
        data.classroom_id,
        data.timeslot_id,
        parseInt(data.default_capacity) || 15,
        data.active === '0' ? 0 : 1,
        data.note?.trim() || null,
      ]
    );
  },

  update(id, data) {
    return db.run(
      `UPDATE schedule_lines SET
         line_code=?, line_name=?, branch_id=?, course_id=?,
         classroom_id=?, timeslot_id=?, default_capacity=?, active=?, note=?
       WHERE id=?`,
      [
        data.line_code?.trim(),
        data.line_name?.trim(),
        data.branch_id    || null,
        data.course_id    || null,
        data.classroom_id,
        data.timeslot_id,
        parseInt(data.default_capacity) || 15,
        data.active === '0' ? 0 : 1,
        data.note?.trim() || null,
        id,
      ]
    );
  },

  deactivate(id) {
    return db.run(`UPDATE schedule_lines SET active = 0 WHERE id = ?`, [id]);
  },
};
