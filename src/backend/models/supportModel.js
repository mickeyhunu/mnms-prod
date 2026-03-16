/**
 * 파일 역할: 공지사항/FAQ 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const SUPPORT_CATEGORIES = {
  NOTICE: 'NOTICE',
  FAQ: 'FAQ'
};

function normalizeCategory(category) {
  const normalized = String(category || '').toUpperCase();
  return Object.values(SUPPORT_CATEGORIES).includes(normalized) ? normalized : null;
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

  if (normalizedCategory !== SUPPORT_CATEGORIES.NOTICE) {
    return rows;
  }

  const postDeletedFilter = includeDeleted ? '' : 'AND p.is_deleted = 0';
  const [adminNoticePosts] = await pool.query(
    `SELECT p.id, p.id AS sourceId, 'POST' AS sourceType,
            'NOTICE' AS category, p.title, p.content,
            p.user_id AS createdBy, p.user_id AS updatedBy,
            p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '관리자') AS createdByNickname,
            COALESCE(u.nickname, '관리자') AS updatedByNickname
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE (
         p.is_notice = 1
         OR EXISTS (
           SELECT 1
           FROM users au
           WHERE au.id = p.user_id
             AND au.role = 'ADMIN'
         )
       )
       ${postDeletedFilter}
     ORDER BY p.created_at DESC, p.id DESC`
  );

  const mergedRows = [...rows, ...adminNoticePosts]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return Number(b.id || 0) - Number(a.id || 0);
    });

  return mergedRows;
}

async function findArticleById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM support_articles WHERE id = ? LIMIT 1', [id]);
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

async function updateArticle(id, { title, content, userId }) {
  const pool = getPool();
  await pool.query(
    'UPDATE support_articles SET title = ?, content = ?, updated_by = ? WHERE id = ?',
    [title, content, userId, id]
  );
}

async function deleteArticle(id) {
  const pool = getPool();
  await pool.query('UPDATE support_articles SET is_deleted = 1 WHERE id = ?', [id]);
}

module.exports = {
  SUPPORT_CATEGORIES,
  normalizeCategory,
  listArticles,
  findArticleById,
  createArticle,
  updateArticle,
  deleteArticle
};
