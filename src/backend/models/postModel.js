/**
 * 파일 역할: postModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const BOARD_TYPES = {
  FREE: 'FREE',
  ANON: 'ANON',
  REVIEW: 'REVIEW',
  STORY: 'STORY',
  QUESTION: 'QUESTION'
};

const BOARD_TYPE_SET = new Set(Object.values(BOARD_TYPES));

function normalizeBoardType(boardType) {
  const normalized = String(boardType || '').toUpperCase();
  return BOARD_TYPE_SET.has(normalized) ? normalized : BOARD_TYPES.FREE;
}

function normalizeBoardFilter(boardType) {
  const normalized = String(boardType || 'ALL').toUpperCase();
  return normalized === 'ALL' ? 'ALL' : normalizeBoardType(normalized);
}

async function listPosts(page = 0, size = 10, options = {}) {
  const pool = getPool();
  const offset = page * size;
  const keyword = typeof options.keyword === 'string' ? options.keyword.trim() : '';
  const searchType = options.searchType || 'bbs_title';
  const boardFilter = normalizeBoardFilter(options.boardType);

  const whereConditions = ['p.is_deleted = 0'];
  const whereParams = [];

  if (boardFilter !== 'ALL') {
    whereConditions.push('p.board_type = ?');
    whereParams.push(boardFilter);
  }

  if (keyword) {
    const likeKeyword = `%${keyword}%`;

    if (searchType === 'bbs_review') {
      whereConditions.push('p.content LIKE ?');
      whereParams.push(likeKeyword);
    } else if (searchType === 'bbs_title_review') {
      whereConditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      whereParams.push(likeKeyword, likeKeyword);
    } else {
      whereConditions.push('p.title LIKE ?');
      whereParams.push(likeKeyword);
    }
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM posts p
     ${whereClause}`,
    whereParams
  );

  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.user_id AS userId, p.board_type AS boardType,
            p.view_count AS viewCount, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            COALESCE(u.role, 'USER') AS authorRole,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount,
            (SELECT COUNT(DISTINCT pl.user_id) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, size, offset]
  );
  return { rows, total: Number(countRows[0].total) };
}

async function createPost({ userId, title, content, boardType = BOARD_TYPES.FREE }) {
  const pool = getPool();
  const normalizedBoardType = normalizeBoardType(boardType);
  const [result] = await pool.query(
    'INSERT INTO posts (user_id, board_type, title, content) VALUES (?, ?, ?, ?)',
    [userId || null, normalizedBoardType, title, content]
  );
  return result.insertId;
}

async function findPostById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ? AND is_deleted = 0', [id]);
  return rows[0] || null;
}

async function findPostByIdIncludingDeleted(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [id]);
  return rows[0] || null;
}


async function findPostDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.user_id AS userId, p.board_type AS boardType,
            p.view_count AS viewCount, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            COALESCE(u.role, 'USER') AS authorRole,
            CASE
              WHEN u.id IS NULL THEN NULL
              WHEN COALESCE(u.total_points, 0) >= 15000 THEN 7
              WHEN COALESCE(u.total_points, 0) >= 5000 THEN 6
              WHEN COALESCE(u.total_points, 0) >= 2000 THEN 5
              WHEN COALESCE(u.total_points, 0) >= 800 THEN 4
              WHEN COALESCE(u.total_points, 0) >= 300 THEN 3
              WHEN COALESCE(u.total_points, 0) >= 100 THEN 2
              ELSE 1
            END AS authorLevel,
            (SELECT COUNT(DISTINCT pl.user_id) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ? AND p.is_deleted = 0`,
    [id]
  );
  return rows[0] || null;
}

async function findAdjacentPosts(id) {
  const pool = getPool();
  const [currentRows] = await pool.query(
    'SELECT id, board_type AS boardType, created_at AS createdAt FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id]
  );

  const current = currentRows[0] || null;
  if (!current) {
    return { previous: null, next: null };
  }

  const [previousRows] = await pool.query(
    `SELECT p.id, p.title
     FROM posts p
     WHERE p.is_deleted = 0
       AND p.board_type = ?
       AND (
         p.created_at > ?
         OR (p.created_at = ? AND p.id > ?)
       )
     ORDER BY p.created_at ASC, p.id ASC
     LIMIT 1`,
    [current.boardType, current.createdAt, current.createdAt, current.id]
  );

  const [nextRows] = await pool.query(
    `SELECT p.id, p.title
     FROM posts p
     WHERE p.is_deleted = 0
       AND p.board_type = ?
       AND (
         p.created_at < ?
         OR (p.created_at = ? AND p.id < ?)
       )
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT 1`,
    [current.boardType, current.createdAt, current.createdAt, current.id]
  );

  return {
    previous: previousRows[0] || null,
    next: nextRows[0] || null
  };
}

async function incrementPostViewCount(id) {
  const pool = getPool();
  await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id]);
}
async function updatePost(id, { title, content }) {
  const pool = getPool();
  await pool.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, id]);
}

async function deletePost(id) {
  const pool = getPool();
  await pool.query("UPDATE posts SET is_deleted = 1, title = '[삭제된 게시글]', content = '삭제된 게시글입니다.' WHERE id = ?", [id]);
}

async function updatePostPointAwards(id, { createPointAwarded, reviewBonusPointAwarded }) {
  const pool = getPool();
  await pool.query(
    'UPDATE posts SET create_point_awarded = ?, review_bonus_point_awarded = ? WHERE id = ?',
    [createPointAwarded ? 1 : 0, reviewBonusPointAwarded ? 1 : 0, id]
  );
}

async function listComments(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId, c.is_secret AS isSecret, c.is_deleted AS isDeleted, c.content, c.created_at AS createdAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            CASE
              WHEN u.id IS NULL THEN NULL
              WHEN COALESCE(u.total_points, 0) >= 15000 THEN 7
              WHEN COALESCE(u.total_points, 0) >= 5000 THEN 6
              WHEN COALESCE(u.total_points, 0) >= 2000 THEN 5
              WHEN COALESCE(u.total_points, 0) >= 800 THEN 4
              WHEN COALESCE(u.total_points, 0) >= 300 THEN 3
              WHEN COALESCE(u.total_points, 0) >= 100 THEN 2
              ELSE 1
            END AS authorLevel
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows;
}

async function findCommentById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createComment({ postId, userId, content, parentId = null, isSecret = false }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO comments (post_id, user_id, parent_id, is_secret, content) VALUES (?, ?, ?, ?, ?)',
    [postId, userId, parentId, isSecret ? 1 : 0, content]
  );
  return result.insertId;
}

async function updateComment(id, content) {
  const pool = getPool();
  await pool.query('UPDATE comments SET content = ? WHERE id = ?', [content, id]);
}

async function deleteComment(id) {
  const pool = getPool();
  await pool.query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [id]);
}

async function updateCommentPointAwarded(id, pointAwarded) {
  const pool = getPool();
  await pool.query('UPDATE comments SET point_awarded = ? WHERE id = ?', [pointAwarded ? 1 : 0, id]);
}

async function isPostLikedByUser(postId, userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
    [postId, userId]
  );
  return rows.length > 0;
}

async function togglePostLike(postId, userId) {
  const pool = getPool();
  const [likeRows] = await pool.query(
    'SELECT liker_point_awarded AS likerPointAwarded, author_point_awarded AS authorPointAwarded FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
    [postId, userId]
  );
  const liked = likeRows.length > 0;
  const existingLike = likeRows[0] || null;

  if (liked) {
    await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } else {
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }

  const [countRows] = await pool.query('SELECT COUNT(DISTINCT user_id) AS likeCount FROM post_likes WHERE post_id = ?', [postId]);
  return {
    isLiked: !liked,
    likeCount: Number(countRows[0].likeCount),
    likerPointAwarded: Boolean(existingLike?.likerPointAwarded),
    authorPointAwarded: Boolean(existingLike?.authorPointAwarded)
  };
}

async function updatePostLikePointAwards(postId, userId, { likerPointAwarded, authorPointAwarded }) {
  const pool = getPool();
  await pool.query(
    'UPDATE post_likes SET liker_point_awarded = ?, author_point_awarded = ? WHERE post_id = ? AND user_id = ?',
    [likerPointAwarded ? 1 : 0, authorPointAwarded ? 1 : 0, postId, userId]
  );
}

async function listPointAwardedCommentsByPostId(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, user_id AS userId FROM comments WHERE post_id = ? AND is_deleted = 0 AND point_awarded = 1',
    [postId]
  );
  return rows;
}

async function listPointAwardedLikesByPostId(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT user_id AS userId, liker_point_awarded AS likerPointAwarded, author_point_awarded AS authorPointAwarded FROM post_likes WHERE post_id = ?',
    [postId]
  );
  return rows;
}

async function deletePostLikesByPostId(postId) {
  const pool = getPool();
  await pool.query('DELETE FROM post_likes WHERE post_id = ?', [postId]);
}

async function markCommentsDeletedByPostId(postId) {
  const pool = getPool();
  await pool.query('UPDATE comments SET is_deleted = 1, point_awarded = 0 WHERE post_id = ?', [postId]);
}

async function listBestPosts() {
  const pool = getPool();

  const selectQuery = `SELECT p.id, p.title, p.content, p.user_id AS userId, p.board_type AS boardType,
            p.view_count AS viewCount, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            COALESCE(u.role, 'USER') AS authorRole,
            COALESCE(stats.commentCount, 0) AS commentCount,
            COALESCE(stats.likeCount, 0) AS likeCount,
            ((COALESCE(stats.likeCount, 0) * 5) + (COALESCE(stats.commentCount, 0) * 2) + (p.view_count * 0.1)) AS score
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN (
       SELECT p2.id,
              COUNT(DISTINCT pl.user_id) AS likeCount,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p2.id) AS commentCount
       FROM posts p2
       LEFT JOIN post_likes pl ON pl.post_id = p2.id
       GROUP BY p2.id
     ) stats ON stats.id = p.id
     WHERE p.is_deleted = 0`;

  const [todayRows] = await pool.query(
    `${selectQuery}
     AND DATE(p.created_at) = CURDATE()
     AND COALESCE(stats.likeCount, 0) >= 3
     ORDER BY score DESC, p.created_at DESC
     LIMIT 5`
  );

  const [weeklyRows] = await pool.query(
    `${selectQuery}
     AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     AND COALESCE(stats.likeCount, 0) >= 5
     ORDER BY score DESC, p.created_at DESC
     LIMIT 3`
  );

  return {
    daily: todayRows,
    weekly: weeklyRows
  };
}

module.exports = {
  BOARD_TYPES,
  listPosts,
  createPost,
  findPostById,
  findPostDetailById,
  findAdjacentPosts,
  findPostByIdIncludingDeleted,
  incrementPostViewCount,
  updatePost,
  deletePost,
  updatePostPointAwards,
  listComments,
  findCommentById,
  createComment,
  updateComment,
  deleteComment,
  updateCommentPointAwarded,
  isPostLikedByUser,
  togglePostLike,
  updatePostLikePointAwards,
  listPointAwardedCommentsByPostId,
  listPointAwardedLikesByPostId,
  deletePostLikesByPostId,
  markCommentsDeletedByPostId,
  listBestPosts
};
