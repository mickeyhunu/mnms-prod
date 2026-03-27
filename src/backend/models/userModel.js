/**
 * 파일 역할: userModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');
const { getLoginRestrictionState, LOGIN_STATUS } = require('../utils/loginRestriction');


async function hasUserColumn(columnName) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [columnName]
  );
  return rows.length > 0;
}

async function createUser({
  email,
  password,
  nickname,
  memberType = 'GENERAL',
  kakaoId = null,
  birthDate = null,
  gender = null
}) {
  const pool = getPool();
  const columns = ['email', 'kakao_id', 'password', 'nickname', 'role', 'member_type', 'total_points'];
  const values = [email, kakaoId, password, nickname, 'USER', memberType, 0];

  if (await hasUserColumn('birth_date')) {
    columns.push('birth_date');
    values.push(birthDate);
  }

  if (await hasUserColumn('gender')) {
    columns.push('gender');
    values.push(gender);
  }

  if (await hasUserColumn('company')) {
    columns.push('company');
    values.push('');
  }

  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await pool.query(
    `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  return result.insertId;
}

async function findByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return ensureResolvedLoginRestriction(rows[0] || null);
}

async function findById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return ensureResolvedLoginRestriction(rows[0] || null);
}

async function findByKakaoId(kakaoId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE kakao_id = ?', [kakaoId]);
  return ensureResolvedLoginRestriction(rows[0] || null);
}

async function attachKakaoIdToUser(userId, kakaoId) {
  const pool = getPool();
  await pool.query(
    `UPDATE users
     SET kakao_id = ?
     WHERE id = ?
       AND (kakao_id IS NULL OR kakao_id = '')`,
    [kakaoId, userId]
  );
  return findById(userId);
}

async function recordUserLoginHistory(userId, { ipAddress, userAgent }) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO user_login_histories (user_id, ip_address, user_agent)
     VALUES (?, ?, ?)`,
    [userId, String(ipAddress || 'unknown').slice(0, 255), userAgent ? String(userAgent).slice(0, 500) : null]
  );
}

async function getUserLoginHistories(userId, { limit = 10 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
  const [rows] = await pool.query(
    `SELECT id, ip_address AS ipAddress, user_agent AS userAgent, created_at AS createdAt
     FROM user_login_histories
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [userId, safeLimit]
  );
  return rows;
}


async function clearExpiredLoginRestriction(userId) {
  const pool = getPool();
  await pool.query(
    `UPDATE users
     SET account_status = ?,
         login_restricted_until = NULL,
         is_login_restriction_permanent = 0
     WHERE id = ?`,
    [LOGIN_STATUS.ACTIVE, userId]
  );
}

async function ensureResolvedLoginRestriction(user) {
  if (!user) return null;

  const state = getLoginRestrictionState(user);
  if (!state.isExpired) return user;

  await clearExpiredLoginRestriction(user.id);
  return findById(user.id);
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


async function getUserNotifications(userId, { limit = 50 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));

  const [rows] = await pool.query(
    `SELECT *
     FROM (
       SELECT
         CONCAT('post-comment-', c.id) AS notificationKey,
         'post_comment' AS type,
         c.id AS sourceId,
         c.post_id AS postId,
         p.title AS postTitle,
         NULL AS inquiryId,
         c.parent_id AS parentId,
         c.content AS content,
         c.created_at AS createdAt,
         COALESCE(u.nickname, '익명') AS actorNickname,
         CONCAT('내 게시글 "', p.title, '"에 새로운 댓글이 달렸습니다.') AS message
       FROM comments c
       INNER JOIN posts p ON p.id = c.post_id
       LEFT JOIN users u ON u.id = c.user_id
       WHERE p.user_id = ?
         AND c.user_id <> ?
         AND c.parent_id IS NULL
         AND c.is_deleted = 0
         AND c.is_hidden = 0
         AND p.is_deleted = 0
         AND p.is_hidden = 0

       UNION ALL

       SELECT
         CONCAT('comment-reply-', c.id) AS notificationKey,
         'comment_reply' AS type,
         c.id AS sourceId,
         c.post_id AS postId,
         p.title AS postTitle,
         NULL AS inquiryId,
         c.parent_id AS parentId,
         c.content AS content,
         c.created_at AS createdAt,
         COALESCE(u.nickname, '익명') AS actorNickname,
         CONCAT('내 댓글에 새로운 대댓글이 달렸습니다. (', p.title, ')') AS message
       FROM comments c
       INNER JOIN comments parent ON parent.id = c.parent_id
       INNER JOIN posts p ON p.id = c.post_id
       LEFT JOIN users u ON u.id = c.user_id
       WHERE parent.user_id = ?
         AND c.user_id <> ?
         AND c.is_deleted = 0
         AND c.is_hidden = 0
         AND parent.is_deleted = 0
         AND p.is_deleted = 0
         AND p.is_hidden = 0
     ) notifications
     ORDER BY createdAt DESC, sourceId DESC
     LIMIT ?`,
    [userId, userId, userId, userId, safeLimit]
  );

  return rows.map((row) => ({
    notificationKey: row.notificationKey,
    type: row.type,
    sourceId: Number(row.sourceId),
    postId: Number(row.postId),
    inquiryId: row.inquiryId ? Number(row.inquiryId) : null,
    parentId: row.parentId ? Number(row.parentId) : null,
    postTitle: row.postTitle,
    content: row.content,
    actorNickname: row.actorNickname,
    message: row.message,
    createdAt: row.createdAt
  }));
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
  clearExpiredLoginRestriction,
  ensureResolvedLoginRestriction,
  createUser,
  findByKakaoId,
  attachKakaoIdToUser,
  findByEmail,
  findById,
  findByNickname,
  findByNicknameExceptUser,
  updateUserProfile,
  recordUserLoginHistory,
  getUserLoginHistories,
  getUserActivityStats,
  getUserPointHistories,
  getUserActivityDetails,
  getUserNotifications
};
