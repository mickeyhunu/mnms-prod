/**
 * 파일 역할: 기업회원 전용 BLACK DB 전화번호 코멘트 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

function normalizePhoneNumber(phoneNumber) {
  return String(phoneNumber || '').replace(/[^0-9]/g, '').trim();
}

async function findCommentsByPhoneNumber(phoneNumber, viewerUserId) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhoneNumber) return [];

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT bc.id,
            bc.phone_number AS phoneNumber,
            bc.comment,
            bc.region,
            bc.district,
            bc.created_at AS createdAt,
            u.nickname AS authorNickname,
            COUNT(bcr.id) AS recommendationCount,
            MAX(CASE WHEN bcr.user_id = ? THEN 1 ELSE 0 END) AS isRecommendedByMe
       FROM black_db_comments bc
       JOIN users u ON u.id = bc.author_user_id
       LEFT JOIN black_db_comment_recommendations bcr ON bcr.comment_id = bc.id
      WHERE bc.phone_number = ?
      GROUP BY bc.id, bc.phone_number, bc.comment, bc.region, bc.district, bc.created_at, u.nickname
      ORDER BY bc.created_at DESC, bc.id DESC`,
    [viewerUserId || 0, normalizedPhoneNumber]
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
    `INSERT INTO black_db_comments (phone_number, author_user_id, region, district, comment)
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
            0 AS isRecommendedByMe
       FROM black_db_comments bc
       JOIN users u ON u.id = bc.author_user_id
      WHERE bc.id = ?`,
    [result.insertId]
  );

  return rows[0] || null;
}

async function toggleCommentRecommendation({ commentId, userId }) {
  const pool = getPool();
  const [existingRows] = await pool.query(
    'SELECT id FROM black_db_comment_recommendations WHERE comment_id = ? AND user_id = ? LIMIT 1',
    [commentId, userId]
  );

  let isRecommendedByMe = false;
  if (existingRows.length) {
    await pool.query(
      'DELETE FROM black_db_comment_recommendations WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );
  } else {
    const [result] = await pool.query(
      'INSERT IGNORE INTO black_db_comment_recommendations (comment_id, user_id) SELECT id, ? FROM black_db_comments WHERE id = ?',
      [userId, commentId]
    );
    isRecommendedByMe = result.affectedRows > 0;
  }

  const [rows] = await pool.query(
    'SELECT COUNT(*) AS recommendationCount FROM black_db_comment_recommendations WHERE comment_id = ?',
    [commentId]
  );

  return {
    recommendationCount: Number(rows[0]?.recommendationCount || 0),
    isRecommendedByMe
  };
}

async function deleteComment(commentId) {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM black_db_comments WHERE id = ?', [commentId]);
  return result.affectedRows > 0;
}

module.exports = {
  normalizePhoneNumber,
  findCommentsByPhoneNumber,
  createComment,
  toggleCommentRecommendation,
  deleteComment
};
