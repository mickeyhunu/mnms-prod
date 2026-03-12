/**
 * 파일 역할: postModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

async function listPosts(page = 0, size = 10, options = {}) {
  const pool = getPool();
  const offset = page * size;
  const keyword = typeof options.keyword === 'string' ? options.keyword.trim() : '';
  const searchType = options.searchType || 'bbs_title';

  const whereConditions = [];
  const whereParams = [];

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

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM posts p
     ${whereClause}`,
    whereParams
  );

  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.user_id AS userId, p.view_count AS viewCount, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, size, offset]
  );
  return { rows, total: Number(countRows[0].total) };
}

async function createPost({ userId, title, content }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
    [userId || null, title, content]
  );
  return result.insertId;
}

async function findPostById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [id]);
  return rows[0] || null;
}


async function findPostDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.user_id AS userId, p.view_count AS viewCount, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
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
  await pool.query('DELETE FROM posts WHERE id = ?', [id]);
}

async function listComments(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId, c.is_secret AS isSecret, c.is_deleted AS isDeleted, c.content, c.created_at AS createdAt,
            COALESCE(u.nickname, '비회원') AS authorNickname
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
  await pool.query("UPDATE comments SET is_deleted = 1, content = '삭제된 댓글입니다.' WHERE id = ?", [id]);
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
  const liked = await isPostLikedByUser(postId, userId);

  if (liked) {
    await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } else {
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }

  const [countRows] = await pool.query('SELECT COUNT(*) AS likeCount FROM post_likes WHERE post_id = ?', [postId]);
  return {
    isLiked: !liked,
    likeCount: Number(countRows[0].likeCount)
  };
}

module.exports = {
  listPosts,
  createPost,
  findPostById,
  findPostDetailById,
  incrementPostViewCount,
  updatePost,
  deletePost,
  listComments,
  findCommentById,
  createComment,
  updateComment,
  deleteComment,
  isPostLikedByUser,
  togglePostLike
};
