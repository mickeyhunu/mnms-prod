/**
 * 파일 역할: 공지사항/FAQ 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const SUPPORT_CATEGORIES = {
  NOTICE: 'NOTICE',
  FAQ: 'FAQ'
};

const INQUIRY_STATUSES = {
  PENDING: 'PENDING',
  ANSWERED: 'ANSWERED'
};

const INQUIRY_TYPES = {
  QUESTION: 'question',
  POST_REPORT: 'post_report',
  COMMENT_REPORT: 'comment_report',
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

async function listArticles(category, includeDeleted = false) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return [];

  const whereDeleted = includeDeleted ? '' : 'AND a.is_deleted = 0';
  const [rows] = await pool.query(
    `SELECT a.id, a.id AS sourceId, 'SUPPORT' AS sourceType,
            a.category, a.title, a.content, a.created_by AS createdBy, a.updated_by AS updatedBy,
            a.created_at AS createdAt, a.updated_at AS updatedAt,
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

async function findPublicArticleDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT a.id, a.category, a.title, a.content,
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

async function createArticle({ category, title, content, userId }) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category);
  const [result] = await pool.query(
    'INSERT INTO support_articles (category, title, content, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
    [normalizedCategory, title, content, userId, userId]
  );
  return result.insertId;
}

async function updateArticle(id, { category, title, content, userId }) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category) || SUPPORT_CATEGORIES.NOTICE;
  await pool.query(
    'UPDATE support_articles SET category = ?, title = ?, content = ?, updated_by = ? WHERE id = ?',
    [normalizedCategory, title, content, userId, id]
  );
}

async function deleteArticle(id) {
  const pool = getPool();
  await pool.query('UPDATE support_articles SET is_deleted = 1 WHERE id = ?', [id]);
}

async function createInquiry({ userId, type, title, content, targetType = null, targetId = null }) {
  const pool = getPool();
  const normalizedType = normalizeInquiryType(type);
  const normalizedTargetType = String(targetType || '').trim().toLowerCase() || null;
  const normalizedTargetId = Number.isInteger(Number(targetId)) && Number(targetId) > 0 ? Number(targetId) : null;

  const [result] = await pool.query(
    `INSERT INTO support_inquiries
      (user_id, inquiry_type, target_type, target_id, title, content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, normalizedType, normalizedTargetType, normalizedTargetId, title, content, INQUIRY_STATUSES.PENDING]
  );

  return result.insertId;
}

async function listInquiriesByUser(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId, i.inquiry_type AS type,
            i.target_type AS targetType, i.target_id AS targetId,
            i.title, i.content, i.status,
            i.answer_content AS answerContent, i.answered_at AS answeredAt,
            i.created_at AS createdAt, i.updated_at AS updatedAt
     FROM support_inquiries i
     WHERE i.user_id = ?
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId]
  );
  return rows;
}

async function findInquiryById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM support_inquiries WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
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
            u.nickname AS userNickname, u.email AS userEmail,
            i.inquiry_type AS type,
            i.target_type AS targetType, i.target_id AS targetId,
            i.title, i.content, i.status,
            i.answer_content AS answerContent, i.answered_at AS answeredAt,
            i.created_at AS createdAt, i.updated_at AS updatedAt,
            i.answered_by AS answeredBy,
            au.nickname AS answeredByNickname
     FROM support_inquiries i
     INNER JOIN users u ON u.id = i.user_id
     LEFT JOIN users au ON au.id = i.answered_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY i.created_at DESC, i.id DESC`,
    values
  );
  return rows;
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
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  normalizeCategory,
  normalizeInquiryStatus,
  normalizeInquiryType,
  listArticles,
  findArticleById,
  findPublicArticleDetailById,
  createArticle,
  updateArticle,
  deleteArticle,
  createInquiry,
  listInquiriesByUser,
  findInquiryById,
  listInquiriesForAdmin,
  answerInquiry
};
