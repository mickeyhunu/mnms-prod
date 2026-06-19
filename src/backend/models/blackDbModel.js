/**
 * 파일 역할: 기업회원 전용 BLACK DB 전화번호 코멘트 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

function normalizePhoneNumber(phoneNumber) {
  return String(phoneNumber || '').replace(/[^0-9]/g, '').trim();
}

async function findCommentsByPhoneNumber(phoneNumber) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhoneNumber) return [];

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT bc.id,
            bc.phone_number AS phoneNumber,
            bc.comment,
            bc.created_at AS createdAt,
            u.nickname AS authorNickname
       FROM black_db_comments bc
       JOIN users u ON u.id = bc.author_user_id
      WHERE bc.phone_number = ?
      ORDER BY bc.created_at DESC, bc.id DESC`,
    [normalizedPhoneNumber]
  );

  return rows;
}

async function createComment({ phoneNumber, authorUserId, comment }) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const trimmedComment = String(comment || '').trim();
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO black_db_comments (phone_number, author_user_id, comment)
     VALUES (?, ?, ?)`,
    [normalizedPhoneNumber, authorUserId, trimmedComment]
  );

  const [rows] = await pool.query(
    `SELECT bc.id,
            bc.phone_number AS phoneNumber,
            bc.comment,
            bc.created_at AS createdAt,
            u.nickname AS authorNickname
       FROM black_db_comments bc
       JOIN users u ON u.id = bc.author_user_id
      WHERE bc.id = ?`,
    [result.insertId]
  );

  return rows[0] || null;
}

module.exports = {
  normalizePhoneNumber,
  findCommentsByPhoneNumber,
  createComment
};
