/**
 * 파일 역할: 애플리케이션의 데이터베이스 연결 설정을 담당하는 구성 파일.
 */
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MNMS_MYSQL_HOST || process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.MNMS_MYSQL_PORT || process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MNMS_MYSQL_USER || process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MNMS_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'root',
  database: process.env.MNMS_MYSQL_DATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'mnms_DB',
  connectionLimit: 10,
  charset: 'utf8mb4'
};

const chatbotDbConfig = {
  host: process.env.CHATBOT_MYSQL_HOST || dbConfig.host,
  port: Number(process.env.CHATBOT_MYSQL_PORT || dbConfig.port),
  user: process.env.CHATBOT_MYSQL_USER || dbConfig.user,
  password: process.env.CHATBOT_MYSQL_PASSWORD || dbConfig.password,
  database: process.env.CHATBOT_MYSQL_DATABASE || 'chatBot_DB',
  connectionLimit: 10,
  charset: 'utf8mb4'
};

const CHATBOT_DATABASE_FALLBACKS = ['chatBot_DB', 'chatbot_db', 'chatbotdb'];

let pool;
let chatbotPool;
let chatbotPoolPromise;
let resolvedChatbotDbConfig;

function getChatbotDatabaseCandidates() {
  return [...new Set([
    chatbotDbConfig.database,
    process.env.CHATBOT_MYSQL_DATABASE,
    ...CHATBOT_DATABASE_FALLBACKS
  ].map((value) => String(value || '').trim()).filter(Boolean))];
}

async function resolveChatbotDbConfig() {
  if (resolvedChatbotDbConfig) return resolvedChatbotDbConfig;

  const bootstrap = await mysql.createConnection({
    host: chatbotDbConfig.host,
    port: chatbotDbConfig.port,
    user: chatbotDbConfig.user,
    password: chatbotDbConfig.password,
    charset: chatbotDbConfig.charset
  });

  try {
    const [rows] = await bootstrap.query('SHOW DATABASES');
    const databaseNames = rows.map((row) => String(Object.values(row)[0] || '').trim()).filter(Boolean);
    const normalizedMap = new Map(databaseNames.map((databaseName) => [databaseName.toLowerCase(), databaseName]));
    const candidates = getChatbotDatabaseCandidates();

    const matchedDatabase = candidates.find((candidate) => databaseNames.includes(candidate))
      || candidates.map((candidate) => normalizedMap.get(candidate.toLowerCase())).find(Boolean)
      || chatbotDbConfig.database;

    resolvedChatbotDbConfig = {
      ...chatbotDbConfig,
      database: matchedDatabase
    };

    return resolvedChatbotDbConfig;
  } finally {
    await bootstrap.end();
  }
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
      nickname VARCHAR(255) NOT NULL UNIQUE,
      role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
      member_type ENUM('GENERAL','ADVERTISER') NOT NULL DEFAULT 'GENERAL',
      account_status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
      login_restricted_until DATETIME NULL,
      is_login_restriction_permanent TINYINT(1) NOT NULL DEFAULT 0,
      total_points BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [totalPointsColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'total_points'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!totalPointsColumn.length) {
    await pool.query('ALTER TABLE users ADD COLUMN total_points BIGINT NOT NULL DEFAULT 0 AFTER role');
  }


  const [memberTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'member_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!memberTypeColumn.length) {
    await pool.query("ALTER TABLE users ADD COLUMN member_type ENUM('GENERAL','ADVERTISER') NOT NULL DEFAULT 'GENERAL' AFTER role");
  }

  const userColumnDefinitions = [
    { name: 'name', query: "ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL AFTER nickname" },
    { name: 'birth_date', query: "ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER name" },
    { name: 'phone', query: "ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER birth_date" },
    { name: 'email_consent', query: "ALTER TABLE users ADD COLUMN email_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER phone" },
    { name: 'sms_consent', query: "ALTER TABLE users ADD COLUMN sms_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER email_consent" },
    { name: 'last_nickname_changed_at', query: "ALTER TABLE users ADD COLUMN last_nickname_changed_at DATETIME NULL AFTER sms_consent" },
    { name: 'account_status', query: "ALTER TABLE users ADD COLUMN account_status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER member_type" },
    { name: 'login_restricted_until', query: "ALTER TABLE users ADD COLUMN login_restricted_until DATETIME NULL AFTER account_status" },
    { name: 'is_login_restriction_permanent', query: "ALTER TABLE users ADD COLUMN is_login_restriction_permanent TINYINT(1) NOT NULL DEFAULT 0 AFTER login_restricted_until" }
  ];

  for (const column of userColumnDefinitions) {
    const [rows] = await pool.query(
      `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [dbConfig.database, column.name]
    );

    if (!rows.length) {
      await pool.query(column.query);
    }
  }

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
      user_id BIGINT NULL,
      board_type ENUM('FREE','ANON','REVIEW','STORY','QUESTION') NOT NULL DEFAULT 'FREE',
      is_notice TINYINT(1) NOT NULL DEFAULT 0,
      notice_type ENUM('NOTICE','IMPORTANT') NULL,
      is_pinned TINYINT(1) NOT NULL DEFAULT 0,
      notice_target_boards VARCHAR(50) NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_urls LONGTEXT NULL,
      is_hidden TINYINT(1) NOT NULL DEFAULT 0,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      view_count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [viewCountColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'view_count'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!viewCountColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0');
  }

  const [postIsDeletedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_deleted'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postIsDeletedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER content');
  }

  const [postImageUrlsColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'image_urls'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postImageUrlsColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN image_urls LONGTEXT NULL AFTER content');
  }

  const [postIsHiddenColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_hidden'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postIsHiddenColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER image_urls');
  }

  const [postCreatePointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'create_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postCreatePointAwardedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN create_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER is_deleted');
  }

  const [postReviewBonusAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'review_bonus_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postReviewBonusAwardedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN review_bonus_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER create_point_awarded');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ads (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      image_url VARCHAR(1000) NOT NULL,
      link_url VARCHAR(1000) NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [boardTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'board_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!boardTypeColumn.length) {
    await pool.query("ALTER TABLE posts ADD COLUMN board_type ENUM('FREE','ANON','REVIEW','STORY','QUESTION') NOT NULL DEFAULT 'FREE' AFTER user_id");
  }


  await pool.query("ALTER TABLE posts MODIFY COLUMN board_type ENUM('FREE','ANON','REVIEW','STORY','QUESTION') NOT NULL DEFAULT 'FREE'");

  const [isNoticeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_notice'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isNoticeColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_notice TINYINT(1) NOT NULL DEFAULT 0 AFTER board_type');
  }

  const [noticeTargetColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'notice_target_boards'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!noticeTargetColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN notice_target_boards VARCHAR(50) NULL AFTER is_notice');
  }


  const [noticeTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'notice_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!noticeTypeColumn.length) {
    await pool.query("ALTER TABLE posts ADD COLUMN notice_type ENUM('NOTICE','IMPORTANT') NULL AFTER is_notice");
  }

  const [isPinnedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_pinned'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isPinnedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER notice_type');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      parent_id BIGINT NULL,
      is_secret TINYINT(1) NOT NULL DEFAULT 0,
      is_hidden TINYINT(1) NOT NULL DEFAULT 0,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [parentIdColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'parent_id'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!parentIdColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN parent_id BIGINT NULL AFTER user_id');
    await pool.query('ALTER TABLE comments ADD CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE');
  }

  const [isSecretColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'is_secret'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isSecretColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN is_secret TINYINT(1) NOT NULL DEFAULT 0 AFTER parent_id');
  }

  const [isHiddenColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'is_hidden'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isHiddenColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER is_secret');
  }

  const [isDeletedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'is_deleted'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isDeletedColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_secret');
  }

  const [commentPointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!commentPointAwardedColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER is_deleted');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      liker_point_awarded TINYINT(1) NOT NULL DEFAULT 0,
      author_point_awarded TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [likerPointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'post_likes'
       AND COLUMN_NAME = 'liker_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!likerPointAwardedColumn.length) {
    await pool.query('ALTER TABLE post_likes ADD COLUMN liker_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id');
  }

  const [authorPointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'post_likes'
       AND COLUMN_NAME = 'author_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!authorPointAwardedColumn.length) {
    await pool.query('ALTER TABLE post_likes ADD COLUMN author_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER liker_point_awarded');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS point_histories (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      action_type ENUM('REGISTER','LOGIN_DAILY','CREATE_POST','CREATE_REVIEW_BONUS','CREATE_COMMENT','LIKE_POST','RECEIVE_POST_LIKE','REVOKE_CREATE_POST','REVOKE_CREATE_REVIEW_BONUS','REVOKE_CREATE_COMMENT','REVOKE_LIKE_POST','REVOKE_RECEIVE_POST_LIKE') NOT NULL,
      points INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_point_histories_user_action_created_at (user_id, action_type, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);


  await pool.query(`
    ALTER TABLE point_histories
    MODIFY COLUMN action_type ENUM('REGISTER','LOGIN_DAILY','CREATE_POST','CREATE_REVIEW_BONUS','CREATE_COMMENT','LIKE_POST','RECEIVE_POST_LIKE','REVOKE_CREATE_POST','REVOKE_CREATE_REVIEW_BONUS','REVOKE_CREATE_COMMENT','REVOKE_LIKE_POST','REVOKE_RECEIVE_POST_LIKE') NOT NULL
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_articles (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      category ENUM('NOTICE','FAQ') NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_by BIGINT NULL,
      updated_by BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);



  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_inquiries (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      inquiry_type VARCHAR(50) NOT NULL,
      target_type VARCHAR(20) NULL,
      target_id BIGINT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      attachment_urls LONGTEXT NULL,
      status ENUM('PENDING','ANSWERED') NOT NULL DEFAULT 'PENDING',
      answer_content TEXT NULL,
      answered_by BIGINT NULL,
      answered_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_support_inquiries_user_created (user_id, created_at),
      INDEX idx_support_inquiries_status_created (status, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [supportAttachmentUrlsColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'support_inquiries'
       AND COLUMN_NAME = 'attachment_urls'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!supportAttachmentUrlsColumn.length) {
    await pool.query('ALTER TABLE support_inquiries ADD COLUMN attachment_urls LONGTEXT NULL AFTER content');
  }

  const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@company.com']);
  if (!adminRows.length) {
    await pool.query(
      'INSERT INTO users (email, password, nickname, role, member_type) VALUES (?, ?, ?, ?, ?)',
      ['admin@admin.com', 'admin1234', '관리자', 'ADMIN', 'GENERAL']
    );
  }
}

function getPool() {
  if (!pool) throw new Error('Database is not initialized');
  return pool;
}

async function getChatbotPool() {
  if (chatbotPool) return chatbotPool;

  if (!chatbotPoolPromise) {
    chatbotPoolPromise = resolveChatbotDbConfig()
      .then((config) => {
        chatbotPool = mysql.createPool(config);
        return chatbotPool;
      })
      .catch((error) => {
        chatbotPoolPromise = null;
        throw error;
      });
  }

  return chatbotPoolPromise;
}

module.exports = {
  dbConfig,
  chatbotDbConfig,
  initDatabase,
  getPool,
  getChatbotPool
};
