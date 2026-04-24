/**
 * db-init.js — Khởi tạo MySQL database và tạo admin user mặc định
 * Chạy: node scripts/db-init.js
 */
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

async function init() {
  const conn = await mysql.createConnection({
    host:                process.env.DB_HOST || 'localhost',
    port:                parseInt(process.env.DB_PORT) || 3306,
    user:                process.env.DB_USER || 'root',
    password:            process.env.DB_PASS || '',
    multipleStatements:  true,
  });

  console.log('✓ Connected to MySQL');

  const schema = fs.readFileSync(
    path.join(__dirname, '../database/mysql_schema.sql'),
    'utf8'
  );
  await conn.query(schema);
  console.log('✓ Schema created (database: hrm_system)');

  const hash = await bcrypt.hash('Admin@123', 10);
  await conn.query(
    `INSERT INTO hrm_system.users (role_id, username, password_hash, full_name, lang_preference, status)
     VALUES (1, 'admin', ?, 'Administrator', 'vi', 'active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [hash]
  );
  console.log('✓ Admin user ready   →  username: admin  |  password: Admin@123');
  console.log('\nDone! Run "npm run dev" to start the server.');

  await conn.end();
}

init().catch(err => {
  console.error('✗ Init failed:', err.message);
  process.exit(1);
});
