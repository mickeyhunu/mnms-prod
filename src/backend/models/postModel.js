const { getPool } = require('../config/database');

async function listPosts(page = 0, size = 10) {
  const pool = getPool();
  const offset = page * size;
  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM posts');
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.user_id AS userId, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [size, offset]
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
    `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.content, c.created_at AS createdAt,
            COALESCE(u.nickname, '비회원') AS authorNickname
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows;
}

async function createComment({ postId, userId, content }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [postId, userId, content]
  );
  return result.insertId;
}

module.exports = {
  listPosts,
  createPost,
  findPostById,
  updatePost,
  deletePost,
  listComments,
  createComment
};
