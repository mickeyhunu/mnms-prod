/** 출근자 정보에 달린 익명 코멘트와 신고를 관리한다. */
const { getPool } = require('../config/database');

async function listPublic(storeNo, workerName, viewerUserId = null) {
  const [rows] = await getPool().query(
    `SELECT id, content, created_at AS createdAt, (user_id = ?) AS isMine,
            EXISTS(SELECT 1 FROM attendance_comment_reports r WHERE r.comment_id = c.id) AS isReported
       FROM attendance_comments c
      WHERE store_no = ? AND worker_name = ? AND is_deleted = 0
      ORDER BY created_at DESC, id DESC`,
    [viewerUserId, storeNo, workerName]
  );
  return rows.map((row) => ({
    ...row,
    author: '익명',
    isMine: Boolean(row.isMine),
    isReported: Boolean(row.isReported)
  }));
}

async function create({ storeNo, workerName, userId, content }) {
  const [result] = await getPool().query(
    'INSERT INTO attendance_comments (store_no, worker_name, user_id, content) VALUES (?, ?, ?, ?)',
    [storeNo, workerName, userId, content]
  );
  const [rows] = await getPool().query('SELECT id, content, created_at AS createdAt FROM attendance_comments WHERE id = ?', [result.insertId]);
  return { ...rows[0], author: '익명', isReported: false };
}

async function report(commentId, reporterUserId) {
  const [comments] = await getPool().query('SELECT id FROM attendance_comments WHERE id = ? AND is_deleted = 0', [commentId]);
  if (!comments.length) return false;
  await getPool().query(
    'INSERT IGNORE INTO attendance_comment_reports (comment_id, reporter_user_id) VALUES (?, ?)',
    [commentId, reporterUserId]
  );
  return true;
}

async function listAdmin() {
  const [rows] = await getPool().query(
    `SELECT c.id, c.store_no AS storeNo, c.worker_name AS workerName, c.content,
            c.created_at AS createdAt, u.login_id AS authorLoginId, u.nickname AS authorNickname,
            COUNT(r.id) AS reportCount, MAX(r.created_at) AS lastReportedAt
       FROM attendance_comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN attendance_comment_reports r ON r.comment_id = c.id
      WHERE c.is_deleted = 0
      GROUP BY c.id, c.store_no, c.worker_name, c.content, c.created_at, u.login_id, u.nickname
      ORDER BY (COUNT(r.id) > 0) DESC, COALESCE(MAX(r.created_at), c.created_at) DESC`
  );
  return rows.map((row) => ({ ...row, reportCount: Number(row.reportCount || 0) }));
}

async function countReported() {
  const [rows] = await getPool().query(
    `SELECT COUNT(DISTINCT c.id) AS total FROM attendance_comments c
      JOIN attendance_comment_reports r ON r.comment_id = c.id WHERE c.is_deleted = 0`
  );
  return Number(rows[0]?.total || 0);
}

async function remove(commentId) {
  const [result] = await getPool().query('UPDATE attendance_comments SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [commentId]);
  return result.affectedRows > 0;
}

async function updateOwn(commentId, userId, content) {
  const [result] = await getPool().query(
    'UPDATE attendance_comments SET content = ? WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [content, commentId, userId]
  );
  return result.affectedRows > 0;
}

async function removeOwn(commentId, userId) {
  const [result] = await getPool().query(
    'UPDATE attendance_comments SET is_deleted = 1 WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [commentId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = { listPublic, create, report, listAdmin, countReported, remove, updateOwn, removeOwn };
