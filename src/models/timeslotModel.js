const db      = require('../config/db');
const PER_PAGE = 20;

function buildWhere(search, status) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(label LIKE ? OR timeslot_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) { cond.push('status = ?'); params.push(status); }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  async list({ search = '', status = '', page = 1 }) {
    const { where, params } = buildWhere(search, status);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM timeslots WHERE ${where}`, params),
      db.query(
        `SELECT id, timeslot_code, label, weekdays_pattern,
                start_time, end_time, sessions_per_week, status
         FROM timeslots WHERE ${where} ORDER BY timeslot_code ASC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  findById(id) {
    return db.get('SELECT * FROM timeslots WHERE id = ?', [id]);
  },

  create(data) {
    const weekdays = Array.isArray(data.weekdays)
      ? data.weekdays.join(',')
      : (data.weekdays || '');
    const sessionsPerWeek = weekdays ? weekdays.split(',').length : 0;
    return db.run(
      `INSERT INTO timeslots
         (timeslot_code, label, weekdays_pattern, start_time, end_time, sessions_per_week, status)
       VALUES (?,?,?,?,?,?,?)`,
      [
        data.timeslot_code?.trim(),
        data.label?.trim(),
        weekdays,
        data.start_time,
        data.end_time,
        sessionsPerWeek,
        data.status || 'active',
      ]
    );
  },

  update(id, data) {
    const weekdays = Array.isArray(data.weekdays)
      ? data.weekdays.join(',')
      : (data.weekdays || '');
    const sessionsPerWeek = weekdays ? weekdays.split(',').length : 0;
    return db.run(
      `UPDATE timeslots SET
         timeslot_code=?, label=?, weekdays_pattern=?,
         start_time=?, end_time=?, sessions_per_week=?, status=?
       WHERE id=?`,
      [
        data.timeslot_code?.trim(),
        data.label?.trim(),
        weekdays,
        data.start_time,
        data.end_time,
        sessionsPerWeek,
        data.status,
        id,
      ]
    );
  },

  softDelete(id) {
    return db.run(`UPDATE timeslots SET status = 'inactive' WHERE id = ?`, [id]);
  },
};
