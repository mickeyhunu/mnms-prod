/**
 * 파일 역할: userModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

async function createUser({ email, password, nickname, memberType = 'GENERAL' }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO users (email, password, nickname, role, member_type, total_points) VALUES (?, ?, ?, ?, ?, ?)',
    [email, password, nickname, 'USER', memberType, 0]
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

async function getUserPointHistories(userId, { limit = 20, page = 1 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) AS totalCount FROM point_histories WHERE user_id = ?',
    [userId]
  );
  const totalCount = Number(countRows[0]?.totalCount || 0);

  const [rows] = await pool.query(
    `SELECT id, action_type AS actionType, points, created_at AS createdAt
     FROM point_histories
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset]
  );

  return {
    histories: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
    }
  };
}

async function getUserActivityDetails(userId, { limit = 20 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const [posts] = await pool.query(
    `SELECT p.id, p.title, p.content, p.board_type AS boardType, p.created_at AS createdAt,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = 0) AS commentCount,
            (SELECT COUNT(DISTINCT pl.user_id) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
     FROM posts p
     WHERE p.user_id = ? AND p.is_deleted = 0
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT ?`,
    [userId, safeLimit]
  );

  const [comments] = await pool.query(
    `SELECT c.id, c.post_id AS postId, c.content, c.created_at AS createdAt,
            p.title AS postTitle,
            p.board_type AS postBoardType
     FROM comments c
     INNER JOIN posts p ON p.id = c.post_id
     WHERE c.user_id = ? AND c.is_deleted = 0 AND p.is_deleted = 0
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ?`,
    [userId, safeLimit]
  );

  const [likedPosts] = await pool.query(
    `SELECT p.id, p.title, p.content, p.board_type AS boardType, p.created_at AS createdAt,
            pl.created_at AS likedAt,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = 0) AS commentCount,
            (SELECT COUNT(DISTINCT pl2.user_id) FROM post_likes pl2 WHERE pl2.post_id = p.id) AS likeCount
     FROM post_likes pl
     INNER JOIN posts p ON p.id = pl.post_id
     WHERE pl.user_id = ? AND p.is_deleted = 0
     ORDER BY pl.created_at DESC, p.id DESC
     LIMIT ?`,
    [userId, safeLimit]
  );

  return { posts, comments, likedPosts };
}

async function findByNickname(nickname) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id FROM users WHERE nickname = ?', [nickname]);
  return rows[0] || null;
}

async function findByNicknameExceptUser(nickname, userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id FROM users WHERE nickname = ? AND id <> ?', [nickname, userId]);
  return rows[0] || null;
}

async function updateUserProfile(userId, payload) {
  const pool = getPool();
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
    fields.push('password = ?');
    values.push(payload.password);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'nickname')) {
    fields.push('nickname = ?');
    values.push(payload.nickname);
    fields.push('last_nickname_changed_at = NOW()');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    fields.push('phone = ?');
    values.push(payload.phone || null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email_consent')) {
    fields.push('email_consent = ?');
    values.push(payload.email_consent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sms_consent')) {
    fields.push('sms_consent = ?');
    values.push(payload.sms_consent ? 1 : 0);
  }

  if (!fields.length) return;

  values.push(userId);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByNickname,
  findByNicknameExceptUser,
  updateUserProfile,
  getUserActivityStats,
  getUserPointHistories,
  getUserActivityDetails
};
