/**
 * 파일 역할: 관리자 전용 회원/광고 데이터 조회 및 수정 쿼리를 담당하는 모델 파일.
 */
const { getPool, getChatbotPool } = require('../config/database');
const { pickUserRow } = require('../utils/response');
const { ensureResolvedLoginRestriction } = require('./userModel');
const { getStoreByNo, listStores } = require('./liveModel');

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

function encodeEntryId({ storeNo, workerName, createdAtKey }) {
  return Buffer.from(JSON.stringify({
    storeNo: Number(storeNo),
    workerName: String(workerName || ''),
    createdAtKey: Number.parseInt(createdAtKey, 10)
  })).toString('base64url');
}

function decodeEntryId(entryId) {
  try {
    const raw = Buffer.from(String(entryId || ''), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const storeNo = Number.parseInt(parsed.storeNo, 10);
    const workerName = String(parsed.workerName || '').trim();
    const createdAtKey = Number.parseInt(parsed.createdAtKey, 10);

    if (!Number.isInteger(storeNo) || storeNo <= 0 || !workerName || !Number.isInteger(createdAtKey) || createdAtKey <= 0) {
      return null;
    }

    return { storeNo, workerName, createdAtKey };
  } catch (error) {
    return null;
  }
}

async function listEntryStores() {
  const stores = await listStores();
  return stores.filter((store) => Number.isInteger(store.storeNo) && store.storeNo > 0 && store.storeName);
}

async function listEntries(storeNo) {
  const chatbotPool = await getChatbotPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
      ORDER BY createdAt DESC, workerName ASC`,
    [normalizedStoreNo]
  );

  return rows.map((row) => ({
    entryId: encodeEntryId(row),
    storeNo: Number(row.storeNo),
    workerName: String(row.workerName || '').trim(),
    mentionCount: Number(row.mentionCount || 0),
    insertCount: Number(row.insertCount || 0),
    createdAt: row.createdAt
  }));
}

async function findEntryById(entryId) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return null;

  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?
      LIMIT 1`,
    [decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  if (!rows.length) {
    const fallbackRow = await findEntryByStoreAndName(decoded.storeNo, decoded.workerName);
    if (!fallbackRow) return null;

    return {
      entryId: encodeEntryId(fallbackRow),
      storeNo: Number(fallbackRow.storeNo),
      workerName: String(fallbackRow.workerName || '').trim(),
      mentionCount: Number(fallbackRow.mentionCount || 0),
      insertCount: Number(fallbackRow.insertCount || 0),
      createdAt: fallbackRow.createdAt
    };
  }

  return {
    entryId: encodeEntryId(rows[0]),
    storeNo: Number(rows[0].storeNo),
    workerName: String(rows[0].workerName || '').trim(),
    mentionCount: Number(rows[0].mentionCount || 0),
    insertCount: Number(rows[0].insertCount || 0),
    createdAt: rows[0].createdAt
  };
}

async function findEntryByStoreAndName(storeNo, workerName) {
  const chatbotPool = await getChatbotPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const normalizedWorkerName = String(workerName || '').trim();
  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
      ORDER BY createdAt DESC
      LIMIT 1`,
    [normalizedStoreNo, normalizedWorkerName]
  );

  return rows[0] || null;
}

async function createEntry({ storeNo, workerName }) {
  const chatbotPool = await getChatbotPool();
  await chatbotPool.query(
    `INSERT INTO ENTRY_TODAY (storeNo, workerName, mentionCount, insertCount, createdAt)
     VALUES (?, ?, 0, 0, NOW())`,
    [storeNo, workerName]
  );

  const createdRow = await findEntryByStoreAndName(storeNo, workerName);
  return createdRow ? {
    entryId: encodeEntryId(createdRow),
    storeNo: Number(createdRow.storeNo),
    workerName: String(createdRow.workerName || '').trim(),
    mentionCount: Number(createdRow.mentionCount || 0),
    insertCount: Number(createdRow.insertCount || 0),
    createdAt: createdRow.createdAt
  } : null;
}

async function updateEntry(entryId, { workerName }) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return null;

  await chatbotPool.query(
    `UPDATE ENTRY_TODAY
        SET workerName = ?
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?`,
    [workerName, decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  const updatedRow = await findEntryByStoreAndName(decoded.storeNo, workerName);
  return updatedRow ? {
    entryId: encodeEntryId(updatedRow),
    storeNo: Number(updatedRow.storeNo),
    workerName: String(updatedRow.workerName || '').trim(),
    mentionCount: Number(updatedRow.mentionCount || 0),
    insertCount: Number(updatedRow.insertCount || 0),
    createdAt: updatedRow.createdAt
  } : null;
}

async function deleteEntry(entryId) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return false;

  const [result] = await chatbotPool.query(
    `DELETE FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?`,
    [decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  if (result.affectedRows > 0) {
    return true;
  }

  const [fallbackResult] = await chatbotPool.query(
    `DELETE FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?`,
    [decoded.storeNo, decoded.workerName]
  );

  return fallbackResult.affectedRows > 0;
}

module.exports = {
  createEntry,
  encodeEntryId,
  decodeEntryId,
  deleteEntry,
  listUsers,
  listEntryStores,
  listEntries,
  findUserById,
  findEntryById,
  findEntryByStoreAndName,
  getUserDetail,
  updateUserRole,
  updateUserMemberType,
  updateUserByAdmin,
  deleteUser,
  listAds,
  createAd,
  findAdById,
  getStoreByNo,
  updateAd,
  deleteAd,
  updateEntry
};
