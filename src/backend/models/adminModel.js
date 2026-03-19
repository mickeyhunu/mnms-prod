/**
 * 파일 역할: 관리자 전용 회원/광고 데이터 조회 및 수정 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');
const { pickUserRow } = require('../utils/response');
const { ensureResolvedLoginRestriction } = require('./userModel');

async function listUsers() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT *
     FROM users
     WHERE role = 'USER'
     ORDER BY created_at DESC, id DESC`
  );
  const resolvedRows = [];
  for (const row of rows) {
    const resolved = await ensureResolvedLoginRestriction(row);
    resolvedRows.push(pickUserRow(resolved || row));
  }
  return resolvedRows;
}

async function findUserById(userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  return ensureResolvedLoginRestriction(rows[0] || null);
}

async function getUserDetail(userId) {
  const user = await findUserById(userId);
  return user ? pickUserRow(user) : null;
}

async function updateUserRole(userId, role) {
  const pool = getPool();
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}


async function updateUserMemberType(userId, memberType) {
  const pool = getPool();
  await pool.query('UPDATE users SET member_type = ? WHERE id = ?', [memberType, userId]);
}

async function updateUserByAdmin(userId, payload) {
  const pool = getPool();
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'nickname')) {
    fields.push('nickname = ?');
    values.push(payload.nickname);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
    fields.push('password = ?');
    values.push(payload.password);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    fields.push('phone = ?');
    values.push(payload.phone || null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email_consent')) {
    fields.push('email_consent = ?');
    values.push(payload.email_consent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sms_consent')) {
    fields.push('sms_consent = ?');
    values.push(payload.sms_consent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
    fields.push('role = ?');
    values.push(payload.role);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'member_type')) {
    fields.push('member_type = ?');
    values.push(payload.member_type);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'account_status')) {
    fields.push('account_status = ?');
    values.push(payload.account_status);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'login_restricted_until')) {
    fields.push('login_restricted_until = ?');
    values.push(payload.login_restricted_until);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'is_login_restriction_permanent')) {
    fields.push('is_login_restriction_permanent = ?');
    values.push(payload.is_login_restriction_permanent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'total_points')) {
    fields.push('total_points = ?');
    values.push(payload.total_points);
  }

  if (!fields.length) return;

  values.push(userId);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
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
  getUserDetail,
  updateUserRole,
  updateUserMemberType,
  updateUserByAdmin,
  deleteUser,
  listAds,
  createAd,
  findAdById,
  updateAd,
  deleteAd
};
