/**
 * 파일 역할: 애플리케이션의 데이터베이스 연결 설정을 담당하는 구성 파일.
 */
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'midnightmens',
  connectionLimit: 10,
  charset: 'utf8mb4'
};

let pool;

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
      user_id BIGINT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@company.com']);
  if (!adminRows.length) {
    await pool.query(
      'INSERT INTO users (email, password, nickname, role) VALUES (?, ?, ?, ?)',
      ['admin@company.com', 'admin1234', '관리자001', 'ADMIN']
    );
  }
}

function getPool() {
  if (!pool) throw new Error('Database is not initialized');
  return pool;
}

module.exports = { dbConfig, initDatabase, getPool };
