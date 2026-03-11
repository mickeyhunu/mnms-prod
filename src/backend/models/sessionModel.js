/**
 * 파일 역할: sessionModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

async function createSession(token, userId) {
  const pool = getPool();
  await pool.query('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, userId]);
}

async function findUserByToken(token) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    [token]
  );
  return rows[0] || null;
}

async function deleteSession(token) {
  const pool = getPool();
  await pool.query('DELETE FROM sessions WHERE token = ?', [token]);
}

module.exports = { createSession, findUserByToken, deleteSession };
