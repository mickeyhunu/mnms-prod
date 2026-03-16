/**
 * 파일 역할: 관리자 전용 회원/광고 데이터 조회 및 수정 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

async function listUsers() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, email, nickname, role, member_type AS memberType, total_points AS totalPoints, created_at AS createdAt
     FROM users
     WHERE role = 'USER'
     ORDER BY created_at DESC, id DESC`
  );
  return rows;
}

async function findUserById(userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId]);
  return rows[0] || null;
}

async function updateUserRole(userId, role) {
  const pool = getPool();
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}


async function updateUserMemberType(userId, memberType) {
  const pool = getPool();
  await pool.query('UPDATE users SET member_type = ? WHERE id = ?', [memberType, userId]);
}

async function deleteUser(userId) {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

async function listAds() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl, display_order AS displayOrder,
            is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
     FROM ads
     ORDER BY display_order ASC, id DESC`
  );
  return rows;
}

async function createAd({ title, imageUrl, linkUrl, displayOrder = 0, isActive = true }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO ads (title, image_url, link_url, display_order, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [title, imageUrl, linkUrl, displayOrder, isActive ? 1 : 0]
  );
  return result.insertId;
}

async function findAdById(adId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id FROM ads WHERE id = ?', [adId]);
  return rows[0] || null;
}

async function updateAd(adId, { title, imageUrl, linkUrl, displayOrder = 0, isActive = true }) {
  const pool = getPool();
  await pool.query(
    `UPDATE ads
     SET title = ?, image_url = ?, link_url = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [title, imageUrl, linkUrl, displayOrder, isActive ? 1 : 0, adId]
  );
}

async function deleteAd(adId) {
  const pool = getPool();
  await pool.query('DELETE FROM ads WHERE id = ?', [adId]);
}

module.exports = {
  listUsers,
  findUserById,
  updateUserRole,
  updateUserMemberType,
  deleteUser,
  listAds,
  createAd,
  findAdById,
  updateAd,
  deleteAd
};
