const db      = require('../config/db');
const PER_PAGE = 20;

function buildWhere(search, roomType, status) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(c.room_name LIKE ? OR c.room_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (roomType) { cond.push('c.room_type = ?'); params.push(roomType); }
  if (status)   { cond.push('c.status = ?');    params.push(status); }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  async list({ search = '', roomType = '', status = '', page = 1 }) {
    const { where, params } = buildWhere(search, roomType, status);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(
        `SELECT COUNT(*) AS cnt FROM classrooms c WHERE ${where}`,
        params
      ),
      db.query(
        `SELECT c.id, c.room_code, c.room_name, c.capacity, c.room_type,
                c.status, b.branch_name
         FROM classrooms c
         LEFT JOIN branches b ON b.id = c.branch_id
         WHERE ${where} ORDER BY c.room_code ASC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  findById(id) {
    return db.get(
      `SELECT c.*, b.branch_name
       FROM classrooms c
       LEFT JOIN branches b ON b.id = c.branch_id
       WHERE c.id = ?`,
      [id]
    );
  },

  create(data) {
    return db.run(
      `INSERT INTO classrooms
         (room_code, room_name, branch_id, capacity, room_type, status, note)
       VALUES (?,?,?,?,?,?,?)`,
      [
        data.room_code?.trim(),
        data.room_name?.trim(),
        data.branch_id || null,
        parseInt(data.capacity) || 20,
        data.room_type || 'classroom',
        data.status || 'active',
        data.note?.trim() || null,
      ]
    );
  },

  update(id, data) {
    return db.run(
      `UPDATE classrooms SET
         room_code=?, room_name=?, branch_id=?,
         capacity=?, room_type=?, status=?, note=?
       WHERE id=?`,
      [
        data.room_code?.trim(),
        data.room_name?.trim(),
        data.branch_id || null,
        parseInt(data.capacity) || 20,
        data.room_type || 'classroom',
        data.status,
        data.note?.trim() || null,
        id,
      ]
    );
  },

  softDelete(id) {
    return db.run(`UPDATE classrooms SET status = 'inactive' WHERE id = ?`, [id]);
  },

  getBranches() {
    return db.query(
      `SELECT id, branch_name FROM branches WHERE status = 'active' ORDER BY branch_name ASC`
    );
  },
};
