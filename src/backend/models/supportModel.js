/**
 * 파일 역할: 공지사항/FAQ 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');
const { createSeoSlug } = require('../utils/seoSlug');
const communityEditLogModel = require('./communityEditLogModel');

const SUPPORT_CATEGORIES = {
  NOTICE: 'NOTICE',
  FAQ: 'FAQ'
};

const SOURCE_TYPES = {
  SUPPORT: 'SUPPORT'
};

const SUPPORT_ONLY_BOARD_TYPE = 'SUPPORT_ONLY';
const NOTICE_TYPES = {
  NOTICE: 'NOTICE',
  IMPORTANT: 'IMPORTANT'
};

const INQUIRY_STATUSES = {
  PENDING: 'PENDING',
  ANSWERED: 'ANSWERED'
};

const INQUIRY_TYPES = {
  QUESTION: 'question',
  POST_REPORT: 'post_report',
  COMMENT_REPORT: 'comment_report',
  ACCOUNT: 'account',
  SERVICE_ERROR: 'service_error',
  AD_INQUIRY: 'ad_inquiry',
  ETC: 'etc',
  OTHER: 'other'
};

function normalizeCategory(category) {
  const normalized = String(category || '').toUpperCase();
  return Object.values(SUPPORT_CATEGORIES).includes(normalized) ? normalized : null;
}

function normalizeInquiryStatus(status) {
  const normalized = String(status || '').toUpperCase();
  return Object.values(INQUIRY_STATUSES).includes(normalized) ? normalized : null;
}

function normalizeInquiryType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return Object.values(INQUIRY_TYPES).includes(normalized) ? normalized : INQUIRY_TYPES.OTHER;
}

function normalizeSourceType(sourceType) {
  const normalized = String(sourceType || '').toUpperCase();
  return Object.values(SOURCE_TYPES).includes(normalized) ? normalized : null;
}

function normalizeBoardType(boardType) {
  const normalized = String(boardType || '').toUpperCase();
  if (normalized === SUPPORT_ONLY_BOARD_TYPE) return SUPPORT_ONLY_BOARD_TYPE;
  return ['FREE', 'ANON', 'REVIEW', 'STORY', 'ATTENDANCE', 'QUESTION', 'EVENT', 'PROMOTION'].includes(normalized)
    ? normalized
    : SUPPORT_ONLY_BOARD_TYPE;
}

function normalizeNoticeType(noticeType) {
  const normalized = String(noticeType || '').toUpperCase();
  return Object.values(NOTICE_TYPES).includes(normalized) ? normalized : NOTICE_TYPES.NOTICE;
}

function normalizeAttachmentUrls(attachmentUrls) {
  if (!Array.isArray(attachmentUrls)) return [];
  return attachmentUrls
    .map((url) => String(url || '').trim())
    .filter((url) => url.startsWith('http://') || url.startsWith('https://'))
    .slice(0, 3);
}

function parseAttachmentUrls(raw) {
  if (!raw) return [];

  try {
    return normalizeAttachmentUrls(JSON.parse(raw));
  } catch (error) {
    return [];
  }
}

function buildInquiryTarget(row) {
  const targetType = String(row.targetType || row.target_type || '').trim().toLowerCase();
  const targetId = Number(row.targetId || row.target_id || 0);
  if (!targetType || !targetId) return null;

  const postId = Number(row.targetPostId || row.target_post_id || (targetType === 'post' ? targetId : 0)) || null;
  const postTitle = row.targetPostTitle || row.target_post_title || null;
  const content = row.targetContent || row.target_content || null;
  const authorNickname = row.targetAuthorNickname || row.target_author_nickname || null;
  const isDeleted = Boolean(row.targetIsDeleted ?? row.target_is_deleted);
  const isHidden = Boolean(row.targetIsHidden ?? row.target_is_hidden);

  return {
    type: targetType,
    id: targetId,
    postId,
    postTitle,
    title: targetType === 'post' ? postTitle : null,
    content,
    authorNickname,
    isDeleted,
    isHidden,
    url: postTitle ? `/post-detail/${encodeURIComponent(createSeoSlug(postTitle))}` : null
  };
}

function normalizeInquiryRow(row) {
  const target = buildInquiryTarget(row);
  return {
    ...row,
    attachmentUrls: parseAttachmentUrls(row.attachmentUrls),
    target
  };
}

const INQUIRY_TARGET_SELECT_SQL = `
            CASE WHEN i.target_type = 'post' THEN p.id WHEN i.target_type = 'comment' THEN c.post_id ELSE NULL END AS targetPostId,
            CASE WHEN i.target_type = 'post' THEN p.title WHEN i.target_type = 'comment' THEN cp.title ELSE NULL END AS targetPostTitle,
            CASE WHEN i.target_type = 'post' THEN p.content WHEN i.target_type = 'comment' THEN c.content ELSE NULL END AS targetContent,
            CASE WHEN i.target_type = 'post' THEN COALESCE(pu.nickname, '비회원') WHEN i.target_type = 'comment' THEN COALESCE(cu.nickname, '비회원') ELSE NULL END AS targetAuthorNickname,
            CASE WHEN i.target_type = 'post' THEN p.is_deleted WHEN i.target_type = 'comment' THEN c.is_deleted ELSE NULL END AS targetIsDeleted,
            CASE WHEN i.target_type = 'post' THEN p.is_hidden WHEN i.target_type = 'comment' THEN c.is_hidden ELSE NULL END AS targetIsHidden`;

const INQUIRY_TARGET_JOIN_SQL = `
     LEFT JOIN posts p ON i.target_type = 'post' AND p.id = i.target_id
     LEFT JOIN users pu ON pu.id = p.user_id
     LEFT JOIN comments c ON i.target_type = 'comment' AND c.id = i.target_id
     LEFT JOIN posts cp ON cp.id = c.post_id
     LEFT JOIN users cu ON cu.id = c.user_id`;

async function listArticles(category, includeDeleted = false, { sourceType = null } = {}) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return [];

  const normalizedSourceType = normalizeSourceType(sourceType);
  if (normalizedSourceType && normalizedSourceType !== SOURCE_TYPES.SUPPORT) {
    return [];
  }

  const whereDeleted = includeDeleted ? '' : 'AND a.is_deleted = 0';
  const [rows] = await pool.query(
    `SELECT a.id, a.id AS sourceId, 'SUPPORT' AS sourceType,
            a.category, a.title, a.content, a.created_by AS createdBy, a.updated_by AS updatedBy,
            a.created_at AS createdAt, a.updated_at AS updatedAt,
            a.board_type AS boardType,
            a.view_count AS viewCount,
            CASE WHEN a.category = 'NOTICE' THEN 1 ELSE 0 END AS isNotice,
            a.notice_type AS noticeType, a.is_pinned AS isPinned,
            COALESCE(cu.nickname, '관리자') AS createdByNickname,
            COALESCE(uu.nickname, '관리자') AS updatedByNickname
     FROM support_articles a
     LEFT JOIN users cu ON cu.id = a.created_by
     LEFT JOIN users uu ON uu.id = a.updated_by
     WHERE a.category = ? ${whereDeleted}
     ORDER BY a.created_at DESC, a.id DESC`,
    [normalizedCategory]
  );

  return rows;
}

async function findArticleById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM support_articles WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function incrementArticleViewCount(id) {
  const pool = getPool();
  const [result] = await pool.query(
    'UPDATE support_articles SET view_count = view_count + 1 WHERE id = ? AND is_deleted = 0',
    [id]
  );
  return result.affectedRows > 0;
}

async function findPublicArticleDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT a.id, a.category, a.title, a.content,
            a.board_type AS boardType,
            a.notice_type AS noticeType,
            a.is_pinned AS isPinned,
            a.view_count AS viewCount,
            a.created_by AS createdBy, a.updated_by AS updatedBy,
            a.created_at AS createdAt, a.updated_at AS updatedAt,
            COALESCE(cu.nickname, '운영팀') AS createdByNickname,
            COALESCE(uu.nickname, '운영팀') AS updatedByNickname
     FROM support_articles a
     LEFT JOIN users cu ON cu.id = a.created_by
     LEFT JOIN users uu ON uu.id = a.updated_by
     WHERE a.id = ?
       AND a.is_deleted = 0
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createArticle({ category, title, content, userId, boardType = SUPPORT_ONLY_BOARD_TYPE, noticeType = NOTICE_TYPES.NOTICE, isPinned = false }) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category);
  const normalizedBoardType = normalizedCategory === SUPPORT_CATEGORIES.NOTICE ? normalizeBoardType(boardType) : SUPPORT_ONLY_BOARD_TYPE;
  const normalizedNoticeType = normalizedCategory === SUPPORT_CATEGORIES.NOTICE ? normalizeNoticeType(noticeType) : null;
  const normalizedIsPinned = normalizedCategory === SUPPORT_CATEGORIES.NOTICE
    && normalizedBoardType !== SUPPORT_ONLY_BOARD_TYPE
    && normalizedNoticeType === NOTICE_TYPES.IMPORTANT
    && Boolean(isPinned);

  const [result] = await pool.query(
    'INSERT INTO support_articles (category, board_type, notice_type, is_pinned, title, content, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [normalizedCategory, normalizedBoardType, normalizedNoticeType, normalizedIsPinned ? 1 : 0, title, content, userId, userId]
  );
  return result.insertId;
}

async function updateArticle(id, { category, title, content, userId, boardType = SUPPORT_ONLY_BOARD_TYPE, noticeType = NOTICE_TYPES.NOTICE, isPinned = false }) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category) || SUPPORT_CATEGORIES.NOTICE;
  const normalizedBoardType = normalizedCategory === SUPPORT_CATEGORIES.NOTICE ? normalizeBoardType(boardType) : SUPPORT_ONLY_BOARD_TYPE;
  const normalizedNoticeType = normalizedCategory === SUPPORT_CATEGORIES.NOTICE ? normalizeNoticeType(noticeType) : null;
  const normalizedIsPinned = normalizedCategory === SUPPORT_CATEGORIES.NOTICE
    && normalizedBoardType !== SUPPORT_ONLY_BOARD_TYPE
    && normalizedNoticeType === NOTICE_TYPES.IMPORTANT
    && Boolean(isPinned);

  await pool.query(
    'UPDATE support_articles SET category = ?, board_type = ?, notice_type = ?, is_pinned = ?, title = ?, content = ?, updated_by = ? WHERE id = ?',
    [normalizedCategory, normalizedBoardType, normalizedNoticeType, normalizedIsPinned ? 1 : 0, title, content, userId, id]
  );
}

async function deleteArticle(id) {
  const pool = getPool();
  await pool.query('UPDATE support_articles SET is_deleted = 1 WHERE id = ?', [id]);
}

async function createInquiry({ userId, type, title, content, targetType = null, targetId = null, attachmentUrls = [] }) {
  const pool = getPool();
  const normalizedType = normalizeInquiryType(type);
  const normalizedTargetType = String(targetType || '').trim().toLowerCase() || null;
  const normalizedTargetId = Number.isInteger(Number(targetId)) && Number(targetId) > 0 ? Number(targetId) : null;

  const [result] = await pool.query(
    `INSERT INTO support_inquiries
      (user_id, inquiry_type, target_type, target_id, title, content, attachment_urls, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, normalizedType, normalizedTargetType, normalizedTargetId, title, content, JSON.stringify(normalizeAttachmentUrls(attachmentUrls)), INQUIRY_STATUSES.PENDING]
  );

  const isReportInquiry = normalizedType === INQUIRY_TYPES.POST_REPORT || normalizedType === INQUIRY_TYPES.COMMENT_REPORT;
  if (isReportInquiry && normalizedTargetId && (normalizedTargetType === communityEditLogModel.TARGET_TYPES.POST || normalizedTargetType === communityEditLogModel.TARGET_TYPES.COMMENT)) {
    await communityEditLogModel.cleanupExpiredEditLogs();
    await communityEditLogModel.extendRetentionForReportedTarget({
      targetType: normalizedTargetType,
      targetId: normalizedTargetId
    });
  }

  return result.insertId;
}

async function listInquiriesByUser(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId, i.inquiry_type AS type,
            i.target_type AS targetType, i.target_id AS targetId,
            i.title, i.content, i.attachment_urls AS attachmentUrls, i.status,
            i.answer_content AS answerContent, i.answered_at AS answeredAt,
            i.created_at AS createdAt, i.updated_at AS updatedAt,
${INQUIRY_TARGET_SELECT_SQL}
     FROM support_inquiries i
${INQUIRY_TARGET_JOIN_SQL}
     WHERE i.user_id = ?
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId]
  );
  return rows.map((row) => normalizeInquiryRow(row));
}

async function findInquiryById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT i.*, i.attachment_urls AS attachmentUrls,
            i.target_type AS targetType, i.target_id AS targetId,
${INQUIRY_TARGET_SELECT_SQL}
     FROM support_inquiries i
${INQUIRY_TARGET_JOIN_SQL}
     WHERE i.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ? normalizeInquiryRow(rows[0]) : null;
}

async function listInquiriesForAdmin({ status = null } = {}) {
  const pool = getPool();
  const normalizedStatus = normalizeInquiryStatus(status);
  const conditions = ['1 = 1'];
  const values = [];
  if (normalizedStatus) {
    conditions.push('i.status = ?');
    values.push(normalizedStatus);
  }

  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId,
            u.nickname AS userNickname, u.login_id AS userLoginId,
            i.inquiry_type AS type,
            i.target_type AS targetType, i.target_id AS targetId,
            i.title, i.content, i.attachment_urls AS attachmentUrls, i.status,
            i.answer_content AS answerContent, i.answered_at AS answeredAt,
            i.created_at AS createdAt, i.updated_at AS updatedAt,
            i.answered_by AS answeredBy,
            au.nickname AS answeredByNickname,
${INQUIRY_TARGET_SELECT_SQL}
     FROM support_inquiries i
     INNER JOIN users u ON u.id = i.user_id
     LEFT JOIN users au ON au.id = i.answered_by
${INQUIRY_TARGET_JOIN_SQL}
     WHERE ${conditions.join(' AND ')}
     ORDER BY i.created_at DESC, i.id DESC`,
    values
  );
  return rows.map((row) => normalizeInquiryRow(row));
}

async function listAnsweredInquiriesByUser(userId, { limit = 20 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId, i.inquiry_type AS type,
            i.title, i.answer_content AS answerContent,
            i.answered_at AS answeredAt, i.updated_at AS updatedAt
     FROM support_inquiries i
     WHERE i.user_id = ?
       AND i.status = ?
       AND i.answer_content IS NOT NULL
       AND TRIM(i.answer_content) <> ''
     ORDER BY i.answered_at DESC, i.id DESC
     LIMIT ?`,
    [userId, INQUIRY_STATUSES.ANSWERED, safeLimit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    type: row.type,
    title: row.title,
    answerContent: row.answerContent,
    answeredAt: row.answeredAt,
    updatedAt: row.updatedAt
  }));
}

async function answerInquiry(id, { answerContent, answeredBy }) {
  const pool = getPool();
  await pool.query(
    `UPDATE support_inquiries
     SET answer_content = ?, status = ?, answered_by = ?, answered_at = NOW()
     WHERE id = ?`,
    [answerContent, INQUIRY_STATUSES.ANSWERED, answeredBy, id]
  );
}

module.exports = {
  SUPPORT_CATEGORIES,
  SOURCE_TYPES,
  SUPPORT_ONLY_BOARD_TYPE,
  NOTICE_TYPES,
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  normalizeCategory,
  normalizeInquiryStatus,
  normalizeInquiryType,
  normalizeSourceType,
  normalizeBoardType,
  normalizeNoticeType,
  listArticles,
  findArticleById,
  findPublicArticleDetailById,
  createArticle,
  updateArticle,
  incrementArticleViewCount,
  deleteArticle,
  createInquiry,
  listInquiriesByUser,
  findInquiryById,
  listInquiriesForAdmin,
  listAnsweredInquiriesByUser,
  answerInquiry
};
