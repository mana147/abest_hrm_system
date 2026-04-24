const db      = require('../config/db');
const PER_PAGE = 20;

function buildWhere(search, level, status) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(course_name LIKE ? OR course_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (level)  { cond.push('level = ?');  params.push(level); }
  if (status) { cond.push('status = ?'); params.push(status); }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  async list({ search = '', level = '', status = '', page = 1 }) {
    const { where, params } = buildWhere(search, level, status);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM courses WHERE ${where}`, params),
      db.query(
        `SELECT id, course_code, course_name, level, total_sessions,
                session_duration_minutes, tuition_fee, status, created_at
         FROM courses WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  findById(id) {
    return db.get('SELECT * FROM courses WHERE id = ?', [id]);
  },

  create(data) {
    return db.run(
      `INSERT INTO courses
         (course_code, course_name, level, total_sessions,
          session_duration_minutes, tuition_fee, description, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        data.course_code?.trim(),
        data.course_name?.trim(),
        data.level || null,
        parseInt(data.total_sessions) || 0,
        parseInt(data.session_duration_minutes) || 120,
        parseFloat(data.tuition_fee) || 0,
        data.description?.trim() || null,
        data.status || 'active',
      ]
    );
  },

  update(id, data) {
    return db.run(
      `UPDATE courses SET
         course_code=?, course_name=?, level=?, total_sessions=?,
         session_duration_minutes=?, tuition_fee=?, description=?, status=?
       WHERE id=?`,
      [
        data.course_code?.trim(),
        data.course_name?.trim(),
        data.level || null,
        parseInt(data.total_sessions) || 0,
        parseInt(data.session_duration_minutes) || 120,
        parseFloat(data.tuition_fee) || 0,
        data.description?.trim() || null,
        data.status,
        id,
      ]
    );
  },

  softDelete(id) {
    return db.run(`UPDATE courses SET status = 'inactive' WHERE id = ?`, [id]);
  },
};
