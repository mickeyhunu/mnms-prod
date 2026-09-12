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

module.exports = { create, listForRecipient, findForRecipient, markRead };
