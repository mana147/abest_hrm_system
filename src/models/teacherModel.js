const db      = require('../config/db');
const PER_PAGE = 20;

async function generateCode() {
  const now    = new Date();
  const prefix = `GV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const last   = await db.get(
    `SELECT teacher_code FROM teachers WHERE teacher_code LIKE ? ORDER BY teacher_code DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const seq = last ? parseInt(last.teacher_code.slice(-3)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

function parseSpecialty(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function buildWhere(search, status, type) {
  const cond   = ['1=1'];
  const params = [];
  if (search) {
    cond.push('(full_name LIKE ? OR phone LIKE ? OR teacher_code LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) { cond.push('status = ?');       params.push(status); }
  if (type)   { cond.push('teacher_type = ?'); params.push(type);   }
  return { where: cond.join(' AND '), params };
}

module.exports = {
  async list({ search = '', status = '', type = '', page = 1 }) {
    const { where, params } = buildWhere(search, status, type);
    const offset = (Math.max(1, page) - 1) * PER_PAGE;

    const [count, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) AS cnt FROM teachers WHERE ${where}`, params),
      db.query(
        `SELECT id, teacher_code, full_name, phone, email, specialty,
                teacher_type, hourly_rate, status, created_at
         FROM teachers WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, PER_PAGE, offset]
      ),
    ]);

    const total = count?.cnt || 0;
    const mapped = rows.map(r => ({ ...r, specialtyArr: parseSpecialty(r.specialty) }));
    return { rows: mapped, total, page: parseInt(page), totalPages: Math.ceil(total / PER_PAGE) };
  },

  async findById(id) {
    const t = await db.get('SELECT * FROM teachers WHERE id = ?', [id]);
    if (!t) return null;
    return { ...t, specialtyArr: parseSpecialty(t.specialty) };
  },

  async create(data) {
    const code      = await generateCode();
    const specialty = JSON.stringify([].concat(data.specialty || []).filter(Boolean));
    const result    = await db.run(
      `INSERT INTO teachers
         (teacher_code, full_name, phone, email, specialty, teacher_type, hourly_rate, status, note)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        code,
        data.full_name?.trim(),
        data.phone?.trim()    || null,
        data.email?.trim()    || null,
        specialty,
        data.teacher_type     || 'fulltime',
        parseFloat(data.hourly_rate) || 0,
        data.status           || 'active',
        data.note?.trim()     || null,
      ]
    );
    return result.insertId;
  },

  update(id, data) {
    const specialty = JSON.stringify([].concat(data.specialty || []).filter(Boolean));
    return db.run(
      `UPDATE teachers SET
         full_name=?, phone=?, email=?, specialty=?,
         teacher_type=?, hourly_rate=?, status=?, note=?
       WHERE id=?`,
      [
        data.full_name?.trim(),
        data.phone?.trim()    || null,
        data.email?.trim()    || null,
        specialty,
        data.teacher_type     || 'fulltime',
        parseFloat(data.hourly_rate) || 0,
        data.status,
        data.note?.trim()     || null,
        id,
      ]
    );
  },

  softDelete(id) {
    return db.run(`UPDATE teachers SET status = 'inactive' WHERE id = ?`, [id]);
  },
};
