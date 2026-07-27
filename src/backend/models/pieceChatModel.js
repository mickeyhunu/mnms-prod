const { getPool } = require('../config/database');

function extractSelectedAdId(content = '') {
  const selectedAdLine = String(content).split('\n').find((line) => line.includes('선택 광고')) || '';
  const match = selectedAdLine.match(/\/business-info\/[^\s)]*-(\d+)(?:\s|$|\))/);
  return match ? Number(match[1]) : null;
}

async function getRoomContext(postId, userId) {
  const pool = getPool();
  const [postResult, adminResult, participantResult, readResult] = await Promise.all([
    pool.query(`SELECT p.id, p.title, p.content, p.created_at AS createdAt, p.piece_closed_at AS pieceClosedAt, p.user_id AS leaderId, u.nickname AS leaderNickname,
                       u.profile_image_url AS leaderProfileImageUrl
                  FROM posts p LEFT JOIN users u ON u.id = p.user_id
                 WHERE p.id = ? AND p.board_type = 'PIECE' AND p.is_deleted = 0`, [postId]),
    pool.query("SELECT id, nickname, profile_image_url AS profileImageUrl FROM users WHERE role = 'ADMIN' AND account_status = 'ACTIVE' ORDER BY id"),
    pool.query(`SELECT pp.user_id AS userId, u.nickname, u.profile_image_url AS profileImageUrl,
                       pp.attended_at AS attendedAt, pp.attendance_status AS attendanceStatus, pp.created_at AS joinedAt
                  FROM piece_participants pp JOIN users u ON u.id = pp.user_id
                 WHERE pp.post_id = ? AND pp.removed_at IS NULL ORDER BY pp.created_at`, [postId]),
    pool.query('SELECT user_id AS userId, last_read_message_id AS lastReadMessageId FROM piece_chat_reads WHERE post_id = ?', [postId])
  ]);
  const post = postResult[0][0];
  const admins = adminResult[0];
  const participants = participantResult[0];
  if (!post) return null;
  const adId = extractSelectedAdId(post.content);
  let advertiser = null;
  if (adId) {
    const [rows] = await pool.query(`SELECT u.id, u.nickname, u.profile_image_url AS profileImageUrl
                                      FROM business_ads ba JOIN users u ON u.id = ba.owner_user_id WHERE ba.id = ? LIMIT 1`, [adId]);
    advertiser = rows[0] || null;
  }
  const memberIds = new Set([Number(post.leaderId), ...admins.map((u) => Number(u.id)), ...participants.map((u) => Number(u.userId))]);
  if (advertiser) memberIds.add(Number(advertiser.id));
  const viewerRole = admins.some((u) => Number(u.id) === Number(userId)) ? 'ADMIN'
    : Number(post.leaderId) === Number(userId) ? 'LEADER'
      : advertiser && Number(advertiser.id) === Number(userId) ? 'ADVERTISER'
        : participants.some((u) => Number(u.userId) === Number(userId)) ? 'MEMBER' : null;
  return { post, admins, advertiser, participants, readStates: readResult[0], viewerRole, canManage: ['ADMIN', 'LEADER', 'ADVERTISER'].includes(viewerRole), isMember: memberIds.has(Number(userId)) };
}

async function markRead(postId, userId, messageId) {
  await getPool().query(`INSERT INTO piece_chat_reads (post_id, user_id, last_read_message_id) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id))`, [postId, userId, messageId]);
}

async function getUnreadCount(postId, userId) {
  const [rows] = await getPool().query(`SELECT COUNT(*) AS unreadCount
    FROM piece_chat_messages pcm
    LEFT JOIN piece_chat_reads pcr ON pcr.post_id = pcm.post_id AND pcr.user_id = ?
    WHERE pcm.post_id = ? AND pcm.message_type = 'CHAT' AND pcm.user_id <> ?
      AND pcm.id > COALESCE(pcr.last_read_message_id, 0)`, [userId, postId, userId]);
  return Number(rows[0]?.unreadCount) || 0;
}

async function listMessages(postId) {
  const [rows] = await getPool().query(`SELECT pcm.id, pcm.user_id AS userId, pcm.content, pcm.message_type AS messageType, pcm.created_at AS createdAt,
                                              u.nickname, u.profile_image_url AS profileImageUrl, u.role
                                         FROM piece_chat_messages pcm JOIN users u ON u.id = pcm.user_id
                                        WHERE pcm.post_id = ? ORDER BY pcm.created_at ASC, pcm.id ASC LIMIT 300`, [postId]);
  return rows;
}

async function listMessagesAfter(postId, afterId) {
  const [rows] = await getPool().query(`SELECT pcm.id, pcm.user_id AS userId, pcm.content, pcm.message_type AS messageType, pcm.created_at AS createdAt,
                                              u.nickname, u.profile_image_url AS profileImageUrl, u.role
                                         FROM piece_chat_messages pcm JOIN users u ON u.id = pcm.user_id
                                        WHERE pcm.post_id = ? AND pcm.id > ? ORDER BY pcm.id ASC LIMIT 300`, [postId, afterId]);
  return rows;
}

async function createMessage(postId, userId, content) {
  const [result] = await getPool().query('INSERT INTO piece_chat_messages (post_id, user_id, content) VALUES (?, ?, ?)', [postId, userId, content]);
  const [rows] = await getPool().query(`SELECT pcm.id, pcm.user_id AS userId, pcm.content, pcm.message_type AS messageType, pcm.created_at AS createdAt,
                                              u.nickname, u.profile_image_url AS profileImageUrl, u.role
                                         FROM piece_chat_messages pcm JOIN users u ON u.id = pcm.user_id WHERE pcm.id = ?`, [result.insertId]);
  return rows[0];
}

async function setAttendance(postId, userId, status) {
  await getPool().query(`UPDATE piece_participants SET attendance_status = ?, attended_at = CASE WHEN ? = 'PRESENT' THEN COALESCE(attended_at, NOW()) ELSE NULL END
                          WHERE post_id = ? AND user_id = ? AND removed_at IS NULL`, [status, status, postId, userId]);
}

async function removeParticipant(postId, userId) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [participants] = await connection.query(
      `SELECT COALESCE(u.nickname, '조각원') AS nickname
         FROM piece_participants pp LEFT JOIN users u ON u.id = pp.user_id
        WHERE pp.post_id = ? AND pp.user_id = ? AND pp.removed_at IS NULL FOR UPDATE`,
      [postId, userId]
    );
    if (participants.length) {
      await connection.query('UPDATE piece_participants SET removed_at = NOW(), expelled_at = NOW() WHERE post_id = ? AND user_id = ?', [postId, userId]);
      await connection.query(
        "INSERT INTO piece_chat_messages (post_id, user_id, content, message_type) VALUES (?, ?, ?, 'SYSTEM')",
        [postId, userId, `${participants[0].nickname}님이 조각에서 내보내졌습니다.`]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { getRoomContext, listMessages, listMessagesAfter, createMessage, markRead, getUnreadCount, setAttendance, removeParticipant };
