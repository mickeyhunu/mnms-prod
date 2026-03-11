const { getPool } = require('../config/database');

async function createUser({ email, password, nickname }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO users (email, password, nickname, role) VALUES (?, ?, ?, ?)',
    [email, password, nickname, 'USER']
  );
  return result.insertId;
}

async function findByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByNickname(nickname) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id FROM users WHERE nickname = ?', [nickname]);
  return rows[0] || null;
}

module.exports = { createUser, findByEmail, findById, findByNickname };
