/** 출근자 정보에 달린 익명 코멘트와 신고를 관리한다. */
const { getPool } = require('../config/database');

async function listPublic(storeNo, workerName, viewer = null) {
  const viewerUserId = viewer?.id ?? viewer ?? null;
  const isAdminViewer = String(viewer?.role || '').toUpperCase() === 'ADMIN';
  const [rows] = await getPool().query(
    `SELECT c.id, c.content, c.created_at AS createdAt, (c.user_id = ?) AS isMine,
            c.is_hidden AS isHidden,
            u.login_id AS authorLoginId, u.nickname AS authorNickname,
            u.profile_image_url AS authorProfileImageUrl,
            EXISTS(SELECT 1 FROM attendance_comment_reports r WHERE r.comment_id = c.id AND r.reporter_user_id = ?) AS isReported
       FROM attendance_comments c
       JOIN users u ON u.id = c.user_id
      WHERE c.store_no = ? AND c.worker_name = ? AND c.is_deleted = 0
        AND (c.is_hidden = 0 OR c.user_id = ? OR ?)
      ORDER BY c.created_at DESC, c.id DESC`,
    [viewerUserId, viewerUserId, storeNo, workerName, viewerUserId, isAdminViewer]
  );
  return rows.map((row) => {
    const { authorLoginId, authorNickname, authorProfileImageUrl, ...comment } = row;
    const author = isAdminViewer
      ? `${authorNickname || '닉네임 없음'} (${authorLoginId})`
      : '익명';

    return {
      ...comment,
      author,
      ...(isAdminViewer ? { authorLoginId, authorNickname, authorProfileImageUrl } : {}),
      isMine: Boolean(row.isMine),
      isReported: Boolean(row.isReported),
      isHidden: Boolean(row.isHidden),
      content: row.isHidden && row.isMine && !isAdminViewer ? '관리자에 의해 제한된 코멘트입니다.' : row.content
    };
  });
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
            c.created_at AS createdAt, c.is_deleted AS isDeleted, c.deleted_at AS deletedAt,
            c.is_hidden AS isHidden, u.id AS authorUserId, u.login_id AS authorLoginId,
            u.nickname AS authorNickname, u.profile_image_url AS authorProfileImageUrl,
            COUNT(r.id) AS reportCount, MAX(r.created_at) AS lastReportedAt
       FROM attendance_comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN attendance_comment_reports r ON r.comment_id = c.id
      GROUP BY c.id, c.store_no, c.worker_name, c.content, c.created_at, c.is_deleted,
               c.deleted_at, c.is_hidden, u.id, u.login_id, u.nickname, u.profile_image_url
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
  const [result] = await getPool().query('UPDATE attendance_comments SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0', [commentId]);
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
    'UPDATE attendance_comments SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [commentId, userId]
  );
  return result.affectedRows > 0;
}

async function setHidden(commentId, adminId, isHidden) {
  const [result] = await getPool().query(
    `UPDATE attendance_comments
        SET is_hidden = ?, hidden_by = ?, hidden_at = ?
      WHERE id = ? AND is_deleted = 0`,
    [isHidden ? 1 : 0, isHidden ? adminId : null, isHidden ? new Date() : null, commentId]
  );
  return result.affectedRows > 0;
}

module.exports = { listPublic, create, report, listAdmin, countReported, remove, updateOwn, removeOwn, setHidden };
