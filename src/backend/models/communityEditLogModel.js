/**
 * 파일 역할: 커뮤니티 게시글/댓글 수정 로그 저장 및 보관기간 관리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const TARGET_TYPES = {
  POST: 'post',
  COMMENT: 'comment'
};

function normalizeTargetType(targetType) {
  const normalized = String(targetType || '').trim().toLowerCase();
  if (normalized === TARGET_TYPES.POST) return TARGET_TYPES.POST;
  if (normalized === TARGET_TYPES.COMMENT) return TARGET_TYPES.COMMENT;
  return null;
}

async function cleanupExpiredEditLogs() {
  const pool = getPool();
  await pool.query('DELETE FROM community_edit_logs WHERE retention_until < NOW()');
}

async function createPostEditLog({ postId, editorUserId, previousTitle, previousContent, nextTitle, nextContent }) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO community_edit_logs
      (target_type, target_id, editor_user_id, previous_title, previous_content, next_title, next_content, retention_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MONTH))`,
    [TARGET_TYPES.POST, postId, editorUserId, previousTitle, previousContent, nextTitle, nextContent]
  );
}

async function createCommentEditLog({ commentId, editorUserId, previousContent, nextContent }) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO community_edit_logs
      (target_type, target_id, editor_user_id, previous_content, next_content, retention_until)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MONTH))`,
    [TARGET_TYPES.COMMENT, commentId, editorUserId, previousContent, nextContent]
  );
}

async function extendRetentionForReportedTarget({ targetType, targetId }) {
  const pool = getPool();
  const normalizedTargetType = normalizeTargetType(targetType);
  const normalizedTargetId = Number.parseInt(targetId, 10);
  if (!normalizedTargetType || !Number.isInteger(normalizedTargetId) || normalizedTargetId <= 0) return;

  await pool.query(
    `UPDATE community_edit_logs
     SET reported_at = COALESCE(reported_at, NOW()),
         retention_until = CASE
           WHEN retention_until >= DATE_ADD(NOW(), INTERVAL 1 YEAR) THEN retention_until
           ELSE DATE_ADD(NOW(), INTERVAL 1 YEAR)
         END
     WHERE target_type = ?
       AND target_id = ?`,
    [normalizedTargetType, normalizedTargetId]
  );
}

module.exports = {
  TARGET_TYPES,
  normalizeTargetType,
  cleanupExpiredEditLogs,
  createPostEditLog,
  createCommentEditLog,
  extendRetentionForReportedTarget
};
