/** 관리자에게서 회원에게 전달되는 개별 쪽지를 관리한다. */
const { getPool } = require('../config/database');

async function create({ recipientUserId, senderAdminId, title, content }) {
  const [result] = await getPool().query(
    `INSERT INTO admin_user_messages (recipient_user_id, sender_admin_id, title, content)
     VALUES (?, ?, ?, ?)`,
    [recipientUserId, senderAdminId, title, content]
  );
  return findForRecipient(result.insertId, recipientUserId);
}

async function listForRecipient(recipientUserId, { limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const [rows] = await getPool().query(
    `SELECT m.id, m.title, m.content, m.read_at AS readAt, m.created_at AS createdAt,
            COALESCE(NULLIF(a.nickname, ''), '운영팀') AS senderNickname
       FROM admin_user_messages m
       LEFT JOIN users a ON a.id = m.sender_admin_id
      WHERE m.recipient_user_id = ?
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ?`,
    [recipientUserId, safeLimit]
  );
  return rows;
}

async function listPageForRecipient(recipientUserId, { page = 1, limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const offset = (safePage - 1) * safeLimit;
  const [countResult, rowsResult] = await Promise.all([
    getPool().query(
      'SELECT COUNT(*) AS total FROM admin_user_messages WHERE recipient_user_id = ?',
      [recipientUserId]
    ),
    getPool().query(
      `SELECT m.id, m.title, m.content, m.read_at AS readAt, m.created_at AS createdAt,
              COALESCE(NULLIF(a.nickname, ''), '운영팀') AS senderNickname
         FROM admin_user_messages m
         LEFT JOIN users a ON a.id = m.sender_admin_id
        WHERE m.recipient_user_id = ?
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ? OFFSET ?`,
      [recipientUserId, safeLimit, offset]
    )
  ]);
  const countRow = countResult[0][0];
  const rows = rowsResult[0];
  const total = Number(countRow?.total || 0);
  return { rows, page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) };
}

async function listSentPage({ page = 1, limit = 20, recipientUserId } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const offset = (safePage - 1) * safeLimit;
  const safeRecipientUserId = Number.parseInt(recipientUserId, 10);
  const whereClause = Number.isInteger(safeRecipientUserId) && safeRecipientUserId > 0
    ? 'WHERE m.recipient_user_id = ?'
    : '';
  const filterParams = whereClause ? [safeRecipientUserId] : [];
  const [countResult, rowsResult] = await Promise.all([
    getPool().query(
      `SELECT COUNT(*) AS total FROM admin_user_messages m ${whereClause}`,
      filterParams
    ),
    getPool().query(
      `SELECT m.id, m.title, m.content, m.read_at AS readAt, m.created_at AS createdAt,
              m.recipient_user_id AS recipientUserId,
              COALESCE(NULLIF(r.nickname, ''), NULLIF(r.login_id, ''), CONCAT('회원 #', m.recipient_user_id)) AS recipientNickname,
              COALESCE(NULLIF(a.nickname, ''), NULLIF(a.login_id, ''), '운영팀') AS senderNickname
         FROM admin_user_messages m
         LEFT JOIN users r ON r.id = m.recipient_user_id
         LEFT JOIN users a ON a.id = m.sender_admin_id
        ${whereClause}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ? OFFSET ?`,
      [...filterParams, safeLimit, offset]
    )
  ]);
  const total = Number(countResult[0][0]?.total || 0);
  return {
    rows: rowsResult[0],
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit)
  };
}

async function findForRecipient(id, recipientUserId) {
  const [rows] = await getPool().query(
    `SELECT m.id, m.title, m.content, m.read_at AS readAt, m.created_at AS createdAt,
            COALESCE(NULLIF(a.nickname, ''), '운영팀') AS senderNickname
       FROM admin_user_messages m
       LEFT JOIN users a ON a.id = m.sender_admin_id
      WHERE m.id = ? AND m.recipient_user_id = ?`,
    [id, recipientUserId]
  );
  return rows[0] || null;
}

async function markRead(id, recipientUserId) {
  await getPool().query(
    `UPDATE admin_user_messages SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND recipient_user_id = ?`,
    [id, recipientUserId]
  );
  return findForRecipient(id, recipientUserId);
}

module.exports = { create, listForRecipient, listPageForRecipient, listSentPage, findForRecipient, markRead };
