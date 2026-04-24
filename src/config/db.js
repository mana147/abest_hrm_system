require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'hrm_system',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
  timezone:           '+07:00',
});

module.exports = {
  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async get(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },
  async run(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
  },
  pool,
};
