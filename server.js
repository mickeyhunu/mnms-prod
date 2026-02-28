const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const STATIC_DIR = path.join(__dirname, 'src/main/resources/static');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'midnigthmans',
  connectionLimit: 10,
  charset: 'utf8mb4'
};

let pool;

function pickUserRow(userRow) {
  return {
    id: userRow.id,
    email: userRow.email,
    nickname: userRow.nickname,
    company: userRow.company,
    department: userRow.department,
    jobPosition: userRow.job_position,
    role: userRow.role,
    isAdmin: userRow.role === 'ADMIN'
  };
}

async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    charset: 'utf8mb4'
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  pool = mysql.createPool(dbConfig);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      nickname VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      department VARCHAR(255),
      job_position VARCHAR(255),
      role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(128) PRIMARY KEY,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      content TEXT NOT NULL,
      parent_id BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS likes (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_like (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_bookmark (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      sender_id BIGINT NOT NULL,
      receiver_id BIGINT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@company.com']);
  if (adminRows.length === 0) {
    await pool.query(
      'INSERT INTO users (email, password, nickname, company, department, job_position, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['admin@company.com', 'admin1234', '관리자001', 'AdminCorp', '운영팀', '매니저', 'ADMIN']
    );
  }
}

async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });

    const [rows] = await pool.query(
      `SELECT u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
      [token]
    );

    if (!rows.length) return res.status(401).json({ message: '세션이 유효하지 않습니다.' });

    req.user = rows[0];
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  next();
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(STATIC_DIR));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, password, company, companyName, department, jobPosition } = req.body;
    const resolvedCompany = company || companyName;

    if (!email || !password || !resolvedCompany) {
      return res.status(400).json({ message: '이메일, 비밀번호, 회사명은 필수입니다.' });
    }

    const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });

    const nickname = `${resolvedCompany}${Math.floor(Math.random() * 900 + 100)}`;
    const [result] = await pool.query(
      `INSERT INTO users (email, password, nickname, company, department, job_position, role)
       VALUES (?, ?, ?, ?, ?, ?, 'USER')`,
      [email, password, nickname, resolvedCompany, department || null, jobPosition || null]
    );

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.json({ success: true, message: '회원가입이 완료되었습니다.', user: pickUserRow(users[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!rows.length) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);

    const userPayload = pickUserRow(user);
    res.json({ success: true, token, ...userPayload });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sessions WHERE token = ?', [req.token]);
    res.json({ success: true, message: '로그아웃되었습니다.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(pickUserRow(req.user));
});

app.get('/api/posts', async (req, res, next) => {
  try {
    const page = Number(req.query.page || 0);
    const size = Number(req.query.size || 10);
    const offset = page * size;

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM posts');
    const totalElements = Number(countRows[0].total);

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.image_url AS imageUrl, p.user_id AS userId, p.created_at AS createdAt, p.updated_at AS updatedAt,
              u.nickname AS authorNickname,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [size, offset]
    );

    res.json({ content: rows, totalElements, page, size, totalPages: Math.ceil(totalElements / size) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:id', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.image_url AS imageUrl, p.user_id AS userId, p.created_at AS createdAt, p.updated_at AS updatedAt,
              u.nickname AS authorNickname,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
              (SELECT COUNT(*) FROM bookmarks b WHERE b.post_id = p.id) AS bookmarkCount
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [postId]
    );

    if (!rows.length) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

    const [comments] = await pool.query(
      `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.content, c.parent_id AS parentId, c.created_at AS createdAt,
              u.nickname AS authorNickname
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json({ ...rows[0], comments });
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts', authMiddleware, async (req, res, next) => {
  try {
    const { title, content, imageUrl } = req.body;
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content, image_url) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content, imageUrl || null]
    );
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, post: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put('/api/posts/:id', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!rows.length) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

    const post = rows[0];
    if (post.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }

    const title = req.body.title ?? post.title;
    const content = req.body.content ?? post.content;
    await pool.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, postId]);

    const [updated] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    res.json({ success: true, post: updated[0] });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/posts/:id', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!rows.length) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });

    const post = rows[0];
    if (post.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [existing] = await pool.query('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);

    if (existing.length) {
      await pool.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    } else {
      await pool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    }

    const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM likes WHERE post_id = ?', [postId]);
    res.json({ success: true, liked: !existing.length, likeCount: Number(countRows[0].cnt) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:id/bookmark', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const [existing] = await pool.query('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);

    if (existing.length) {
      await pool.query('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    } else {
      await pool.query('INSERT INTO bookmarks (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    }

    res.json({ success: true, bookmarked: !existing.length, isBookmarked: !existing.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:postId/comments', async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const [rows] = await pool.query(
      `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.content, c.parent_id AS parentId, c.created_at AS createdAt,
              u.nickname AS authorNickname
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json({ content: rows });
  } catch (error) {
    next(error);
  }
});


app.get('/api/users/me/comments', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.post_id AS postId, c.content, c.created_at AS createdAt
       FROM comments c
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/me/stats', authMiddleware, async (req, res, next) => {
  try {
    const [[posts]] = await pool.query('SELECT COUNT(*) AS postCount FROM posts WHERE user_id = ?', [req.user.id]);
    const [[comments]] = await pool.query('SELECT COUNT(*) AS commentCount FROM comments WHERE user_id = ?', [req.user.id]);
    const [[likes]] = await pool.query(
      `SELECT COUNT(*) AS likeCount
       FROM likes l
       JOIN posts p ON p.id = l.post_id
       WHERE p.user_id = ?`,
      [req.user.id]
    );

    res.json({
      postCount: Number(posts.postCount),
      commentCount: Number(comments.commentCount),
      likeCount: Number(likes.likeCount)
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/comments', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const content = typeof req.body === 'string' ? req.body : req.body.content;
    const parentId = req.body.parentId || null;
    if (!content) return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });

    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, content, parentId]
    );

    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, comment: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put('/api/comments/:id', authMiddleware, async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!rows.length) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

    const comment = rows[0];
    if (comment.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const content = typeof req.body === 'string' ? req.body : req.body.content;
    await pool.query('UPDATE comments SET content = ? WHERE id = ?', [content, commentId]);

    const [updated] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    res.json({ success: true, comment: updated[0] });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/comments/:id', authMiddleware, async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!rows.length) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

    const comment = rows[0];
    if (comment.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookmarks/my', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.image_url AS imageUrl, p.created_at AS createdAt, p.updated_at AS updatedAt,
              p.user_id AS userId, u.nickname AS authorNickname
       FROM bookmarks b
       JOIN posts p ON p.id = b.post_id
       JOIN users u ON u.id = p.user_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookmarks/check/:postId', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const [rows] = await pool.query('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    const bookmarked = rows.length > 0;
    res.json({ bookmarked, isBookmarked: bookmarked });
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookmarks/:postId/toggle', authMiddleware, async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const [existing] = await pool.query('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);

    if (existing.length) {
      await pool.query('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    } else {
      await pool.query('INSERT INTO bookmarks (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    }

    res.json({ success: true, bookmarked: !existing.length, isBookmarked: !existing.length });
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/messages', authMiddleware, async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) return res.status(400).json({ message: '필수값이 누락되었습니다.' });

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [req.user.id, Number(receiverId), content]
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/messages/received', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM messages WHERE receiver_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/messages/sent', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM messages WHERE sender_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.put('/api/posts/messages/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const messageId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ? AND receiver_id = ?', [messageId, req.user.id]);
    if (!rows.length) return res.status(404).json({ message: '쪽지를 찾을 수 없습니다.' });

    await pool.query('UPDATE messages SET is_read = TRUE WHERE id = ?', [messageId]);
    const [updated] = await pool.query('SELECT * FROM messages WHERE id = ?', [messageId]);
    res.json({ success: true, message: updated[0] });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/posts/messages/:id', authMiddleware, async (req, res, next) => {
  try {
    const messageId = Number(req.params.id);
    await pool.query('DELETE FROM messages WHERE id = ? AND (receiver_id = ? OR sender_id = ?)', [messageId, req.user.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/messages/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS unreadCount FROM messages WHERE receiver_id = ? AND is_read = FALSE', [req.user.id]);
    res.json({ unreadCount: Number(rows[0].unreadCount) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/search/posts', async (req, res, next) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.created_at AS createdAt, p.user_id AS userId, u.nickname AS authorNickname
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.title LIKE ? OR p.content LIKE ?
       ORDER BY p.created_at DESC`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/posts', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.user_id AS userId, p.created_at AS createdAt,
              u.nickname AS authorNickname,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, email, nickname, company, department, job_position AS jobPosition, role, created_at AS createdAt FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/comments', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.post_id AS postId, c.user_id AS userId, c.created_at AS createdAt,
              u.nickname AS authorNickname
       FROM comments c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/stats/posts', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS totalPosts FROM posts');
    res.json({ totalPosts: Number(rows[0].totalPosts) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/stats/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS totalUsers, SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS totalAdmins FROM users");
    res.json({ totalUsers: Number(rows[0].totalUsers), totalAdmins: Number(rows[0].totalAdmins || 0) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/stats/comments', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS totalComments FROM comments');
    res.json({ totalComments: Number(rows[0].totalComments) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/posts/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/comments/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM comments WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

const pageMap = {
  '/': 'index.html',
  '/index': 'index.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/create-post': 'create-post.html',
  '/post-detail': 'post-detail.html',
  '/my-page': 'my-page.html',
  '/bookmarks': 'bookmarks.html',
  '/admin': 'admin.html'
};

Object.entries(pageMap).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(STATIC_DIR, file));
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.', detail: err.message });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Node.js + MySQL server running on http://localhost:${PORT}`);
      console.log(`MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    });
  })
  .catch((error) => {
    console.error('DB 초기화 실패:', error.message);
    process.exit(1);
  });
