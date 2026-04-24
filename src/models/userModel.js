const db = require('../config/db');

module.exports = {
  findByUsername(username) {
    return db.get(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`,
      [username]
    );
  },

  findById(id) {
    return db.get(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );
  },
};
