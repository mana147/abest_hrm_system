const db      = require('../config/db');
const PER_PAGE = 20;

async function generateCode() {
  const now    = new Date();
  const prefix = `HV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const last   = await db.get(
    `SELECT student_code FROM students WHERE student_code LIKE ? ORDER BY student_code DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const seq = last ? parseInt(last.student_code.slice(-3)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

function buildWhere(search, status) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(full_name LIKE ? OR phone LIKE ? OR student_code LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { cond.push('status = ?'); params.push(status); }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  async list({ search = '', status = '', page = 1 }) {
    const { where, params } = buildWhere(search, status);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM students WHERE ${where}`, params),
      db.query(
        `SELECT id, student_code, full_name, phone, email, level_current, source, status, created_at
         FROM students WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    return { rows, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  findById(id) {
    return db.get('SELECT * FROM students WHERE id = ?', [id]);
  },

  async create(data) {
    const code   = await generateCode();
    const result = await db.run(
      `INSERT INTO students
         (student_code, full_name, date_of_birth, gender, phone, email,
          address, parent_name, parent_phone, source, level_current, status, note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        code,
        data.full_name?.trim(),
        data.date_of_birth || null,
        data.gender    || null,
        data.phone?.trim()     || null,
        data.email?.trim()     || null,
        data.address?.trim()   || null,
        data.parent_name?.trim()  || null,
        data.parent_phone?.trim() || null,
        data.source        || null,
        data.level_current || null,
        data.status        || 'active',
        data.note?.trim()  || null,
      ]
    );
    return result.insertId;
  },

  update(id, data) {
    return db.run(
      `UPDATE students SET
         full_name=?, date_of_birth=?, gender=?, phone=?, email=?,
         address=?, parent_name=?, parent_phone=?, source=?, level_current=?, status=?, note=?
       WHERE id=?`,
      [
        data.full_name?.trim(),
        data.date_of_birth || null,
        data.gender    || null,
        data.phone?.trim()     || null,
        data.email?.trim()     || null,
        data.address?.trim()   || null,
        data.parent_name?.trim()  || null,
        data.parent_phone?.trim() || null,
        data.source        || null,
        data.level_current || null,
        data.status,
        data.note?.trim()  || null,
        id,
      ]
    );
  },

  softDelete(id) {
    return db.run(`UPDATE students SET status = 'inactive' WHERE id = ?`, [id]);
  },
};
