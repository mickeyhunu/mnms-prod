/**
 * 파일 역할: 룸빵위키 용어 질문 댓글의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

function normalizeQuestionRow(row = {}) {
  return {
    id: Number(row.id),
    term: row.term,
    content: row.content,
    status: row.status,
    authorNickname: row.authorNickname || row.author_nickname || '익명',
    createdAt: row.createdAt || row.created_at,
    reviewedAt: row.reviewedAt || row.reviewed_at,
    reviewedBy: row.reviewedBy || row.reviewed_by || null
  };
}

async function deleteExpiredAddedQuestions() {
  const pool = getPool();
  await pool.query(
    `UPDATE wiki_term_questions
        SET is_deleted = 1, deleted_at = NOW()
      WHERE is_deleted = 0
        AND status = 'ADDED'
        AND reviewed_at IS NOT NULL
        AND reviewed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
}

async function listQuestions({ includeReviewed = false } = {}) {
  const pool = getPool();
  await deleteExpiredAddedQuestions();
  const where = includeReviewed
    ? 'q.is_deleted = 0'
    : "q.is_deleted = 0 AND (q.status = 'PENDING' OR (q.status = 'ADDED' AND q.reviewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)))";
  const [rows] = await pool.query(
    `SELECT q.id, q.term, q.content, q.status, q.created_at AS createdAt,
            q.reviewed_at AS reviewedAt, q.reviewed_by AS reviewedBy,
            COALESCE(u.nickname, q.author_nickname, '익명') AS authorNickname
       FROM wiki_term_questions q
       LEFT JOIN users u ON u.id = q.user_id
      WHERE ${where}
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT 100`
  );
  return rows.map(normalizeQuestionRow);
}

async function createQuestion({ userId = null, authorNickname = '익명', term, content }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO wiki_term_questions (user_id, author_nickname, term, content)
     VALUES (?, ?, ?, ?)`,
    [userId, authorNickname, term, content]
  );
  const [rows] = await pool.query(
    `SELECT q.id, q.term, q.content, q.status, q.created_at AS createdAt,
            q.reviewed_at AS reviewedAt, q.reviewed_by AS reviewedBy,
            COALESCE(u.nickname, q.author_nickname, '익명') AS authorNickname
       FROM wiki_term_questions q
       LEFT JOIN users u ON u.id = q.user_id
      WHERE q.id = ?`,
    [result.insertId]
  );
  return normalizeQuestionRow(rows[0]);
}

async function markQuestionAdded(id, reviewerId) {
  const pool = getPool();
  const [result] = await pool.query(
    `UPDATE wiki_term_questions
        SET status = 'ADDED', reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ? AND is_deleted = 0`,
    [reviewerId, id]
  );
  return result.affectedRows > 0;
}

async function deleteQuestion(id) {
  const pool = getPool();
  const [result] = await pool.query(
    `UPDATE wiki_term_questions
        SET is_deleted = 1, deleted_at = NOW()
      WHERE id = ? AND is_deleted = 0`,
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = { listQuestions, createQuestion, markQuestionAdded, deleteQuestion, deleteExpiredAddedQuestions };
