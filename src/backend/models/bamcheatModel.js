/**
 * 파일 역할: 기업회원 전용 밤치트 전화번호 코멘트 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');
const crypto = require('crypto');

function hashAccessCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function isValidAccessCode(code) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) return false;

  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT 1 FROM blackcheck_access_codes WHERE code_hash = ? AND is_active = 1 LIMIT 1',
    [hashAccessCode(normalizedCode)]
  );
  return rows.length > 0;
}

function normalizePhoneNumber(phoneNumber) {
  return String(phoneNumber || '').replace(/[^0-9]/g, '').trim();
}

async function findCommentsByPhoneNumber(phoneNumber, viewerUserId) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhoneNumber) return [];

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT comments.id,
            comments.phoneNumber,
            comments.comment,
            comments.region,
            comments.district,
            comments.createdAt,
            comments.authorNickname,
            comments.recommendationCount,
            comments.isRecommendedByMe,
            comments.source,
            comments.isReadOnly
       FROM (
      SELECT bc.id,
            bc.phone_number AS phoneNumber,
            bc.comment,
            bc.region,
            bc.district,
            bc.created_at AS createdAt,
            u.nickname AS authorNickname,
            COUNT(bcr.id) AS recommendationCount,
            MAX(CASE WHEN bcr.user_id = ? THEN 1 ELSE 0 END) AS isRecommendedByMe,
            'gangnam_DB' AS source,
            0 AS isReadOnly
       FROM bamcheat_comments bc
       JOIN users u ON u.id = bc.author_user_id
       LEFT JOIN bamcheat_comment_recommendations bcr ON bcr.comment_id = bc.id
      WHERE bc.phone_number = ?
      GROUP BY bc.id, bc.phone_number, bc.comment, bc.region, bc.district, bc.created_at, u.nickname
      UNION ALL
      SELECT bc.id,
             bc.phone_number AS phoneNumber,
             bc.comment,
             bc.region,
             bc.district,
             bc.created_at AS createdAt,
             u.nickname AS authorNickname,
             0 AS recommendationCount,
             0 AS isRecommendedByMe,
             'mnms_prod' AS source,
             1 AS isReadOnly
        FROM mnms_prod.bamcheat_comments bc
        JOIN mnms_prod.users u ON u.id = bc.author_user_id
       WHERE bc.phone_number = ?
       ) comments
      ORDER BY comments.createdAt DESC, comments.id DESC`,
    [viewerUserId || 0, normalizedPhoneNumber, normalizedPhoneNumber]
  );

  return rows;
}

async function createComment({ phoneNumber, authorUserId, region, district, comment }) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const trimmedRegion = String(region || '').trim();
  const trimmedDistrict = String(district || '').trim();
  const trimmedComment = String(comment || '').trim();
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO bamcheat_comments (phone_number, author_user_id, region, district, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [normalizedPhoneNumber, authorUserId, trimmedRegion, trimmedDistrict, trimmedComment]
  );

  const [rows] = await pool.query(
    `SELECT bc.id,
            bc.phone_number AS phoneNumber,
            bc.comment,
            bc.region,
            bc.district,
            bc.created_at AS createdAt,
            u.nickname AS authorNickname,
            0 AS recommendationCount,
            0 AS isRecommendedByMe,
            'gangnam_DB' AS source,
            0 AS isReadOnly
       FROM bamcheat_comments bc
       JOIN users u ON u.id = bc.author_user_id
      WHERE bc.id = ?`,
    [result.insertId]
  );

  return rows[0] || null;
}

async function toggleCommentRecommendation({ commentId, userId }) {
  const pool = getPool();
  const [existingRows] = await pool.query(
    'SELECT id FROM bamcheat_comment_recommendations WHERE comment_id = ? AND user_id = ? LIMIT 1',
    [commentId, userId]
  );

  let isRecommendedByMe = false;
  if (existingRows.length) {
    await pool.query(
      'DELETE FROM bamcheat_comment_recommendations WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );
  } else {
    const [result] = await pool.query(
      'INSERT IGNORE INTO bamcheat_comment_recommendations (comment_id, user_id) SELECT id, ? FROM bamcheat_comments WHERE id = ?',
      [userId, commentId]
    );
    isRecommendedByMe = result.affectedRows > 0;
  }

  const [rows] = await pool.query(
    'SELECT COUNT(*) AS recommendationCount FROM bamcheat_comment_recommendations WHERE comment_id = ?',
    [commentId]
  );

  return {
    recommendationCount: Number(rows[0]?.recommendationCount || 0),
    isRecommendedByMe
  };
}

async function deleteComment(commentId) {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM bamcheat_comments WHERE id = ?', [commentId]);
  return result.affectedRows > 0;
}

module.exports = {
  isValidAccessCode,
  normalizePhoneNumber,
  findCommentsByPhoneNumber,
  createComment,
  toggleCommentRecommendation,
  deleteComment
};
