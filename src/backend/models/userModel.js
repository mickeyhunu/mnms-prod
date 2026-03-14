/**
 * 파일 역할: userModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

async function createUser({ email, password, nickname }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO users (email, password, nickname, role, total_points) VALUES (?, ?, ?, ?, ?)',
    [email, password, nickname, 'USER', 0]
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


async function getUserActivityStats(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = ? AND p.is_deleted = 0) AS postCount,
        (SELECT COUNT(*) FROM comments c WHERE c.user_id = ? AND c.is_deleted = 0) AS commentCount,
        (SELECT COUNT(*) FROM point_histories ph WHERE ph.user_id = ? AND ph.action_type = 'LOGIN_DAILY') AS attendanceCount,
        (SELECT COUNT(*) FROM posts p2 WHERE p2.user_id = ? AND p2.board_type = 'REVIEW' AND p2.is_deleted = 0) AS reviewCount,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.user_id = ?) AS recommendCount`,
    [userId, userId, userId, userId, userId]
  );
  return rows[0] || {};
}

async function findByNickname(nickname) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id FROM users WHERE nickname = ?', [nickname]);
  return rows[0] || null;
}

module.exports = { createUser, findByEmail, findById, findByNickname, getUserActivityStats };
