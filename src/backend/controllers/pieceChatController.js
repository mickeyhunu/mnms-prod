const model = require('../models/pieceChatModel');

const PIECE_GUIDE_MESSAGE = Object.freeze({
  id: 0,
  userId: null,
  nickname: '📢 조각안내',
  profileImageUrl: '/src/assets/live-avatars/favicon.png',
  messageType: 'CHAT',
  content: `안녕하세요! 미드나잇맨즈입니다. 🙇‍♂️

📢 조각장 안내

- 조각 시작 후에는 출석자 출석 체크를 반드시 완료해 주세요.

📢 조각원 안내

- 참석이 어려운 경우에는 미리 참여를 취소해 주셔야 패널티가 부과되지 않습니다.

⚠️ 만남 전까지는 해당 채팅방에서 연락처를 공유하지 말아 주세요.

안전하고 즐거운 조각 모임 되시길 바랍니다! 😍
`
});

function parseId(value) { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }
async function context(req, res) {
  const postId = parseId(req.params.id);
  if (!postId) { res.status(400).json({ message: '유효하지 않은 조각입니다.' }); return null; }
  const room = await model.getRoomContext(postId, req.user.id);
  if (!room) { res.status(404).json({ message: '조각 채팅방을 찾을 수 없습니다.' }); return null; }
  if (!room.isMember) { res.status(403).json({ message: '조각 채팅방 구성원만 입장할 수 있습니다.' }); return null; }
  return { postId, room };
}
function serializeMembers(room, currentUserId) {
  const members = [
    ...room.admins.map((u) => ({ ...u, userId: u.id, roomRole: 'ADMIN' })),
    { userId: room.post.leaderId, nickname: room.post.leaderNickname, profileImageUrl: room.post.leaderProfileImageUrl, roomRole: 'LEADER' },
    ...(room.advertiser ? [{ ...room.advertiser, userId: room.advertiser.id, roomRole: 'ADVERTISER' }] : []),
    ...room.participants.map((u) => ({ ...u, roomRole: 'MEMBER' }))
  ].filter((member, index, all) => all.findIndex((item) => Number(item.userId) === Number(member.userId)) === index);
  return { viewerRole: room.viewerRole, canManage: room.canManage, currentUserId, members, participants: room.participants };
}
function serializeRoom(room, messages, currentUserId) {
  const guideMessage = { ...PIECE_GUIDE_MESSAGE, createdAt: room.post.createdAt };
  return { post: room.post, ...serializeMembers(room, currentUserId), messages: [guideMessage, ...messages] };
}
async function getRoom(req, res, next) { try { const value = await context(req, res); if (!value) return; res.json(serializeRoom(value.room, await model.listMessages(value.postId), req.user.id)); } catch (e) { next(e); } }
async function getMembers(req, res, next) { try { const value = await context(req, res); if (!value) return; res.json(serializeMembers(value.room, req.user.id)); } catch (e) { next(e); } }
async function getMessages(req, res, next) { try { const value = await context(req, res); if (!value) return; const afterId = Math.max(0, Number.parseInt(req.query.afterId, 10) || 0); res.json(await model.listMessagesAfter(value.postId, afterId)); } catch (e) { next(e); } }
async function sendMessage(req, res, next) { try { const value = await context(req, res); if (!value) return; const content = String(req.body.content || '').trim(); if (!content) return res.status(400).json({ message: '메시지를 입력해주세요.' }); if (content.length > 1000) return res.status(400).json({ message: '메시지는 1,000자까지 입력할 수 있습니다.' }); res.status(201).json(await model.createMessage(value.postId, req.user.id, content)); } catch (e) { next(e); } }
async function attendance(req, res, next) { try { const value = await context(req, res); if (!value) return; if (!value.room.canManage) return res.status(403).json({ message: '조각 관리 권한이 없습니다.' }); const userId = parseId(req.params.userId); const status = String(req.body.status || '').toUpperCase(); if (!userId || !['PRESENT', 'ABSENT'].includes(status)) return res.status(400).json({ message: '출석 상태를 확인해주세요.' }); if (!value.room.participants.some((u) => Number(u.userId) === userId)) return res.status(404).json({ message: '조각원을 찾을 수 없습니다.' }); await model.setAttendance(value.postId, userId, status); const room = await model.getRoomContext(value.postId, req.user.id); res.json(serializeRoom(room, await model.listMessages(value.postId), req.user.id)); } catch (e) { next(e); } }
async function remove(req, res, next) { try { const value = await context(req, res); if (!value) return; if (!value.room.canManage) return res.status(403).json({ message: '조각 관리 권한이 없습니다.' }); const userId = parseId(req.params.userId); if (!userId || !value.room.participants.some((u) => Number(u.userId) === userId)) return res.status(404).json({ message: '조각원을 찾을 수 없습니다.' }); const protectedIds = [value.room.post.leaderId, value.room.advertiser?.id, ...value.room.admins.map((u) => u.id)].map(Number); if (protectedIds.includes(userId)) return res.status(403).json({ message: '관리자, 광고주, 조각장은 내보낼 수 없습니다.' }); await model.removeParticipant(value.postId, userId); res.json({ success: true }); } catch (e) { next(e); } }
module.exports = { getRoom, getMembers, getMessages, sendMessage, attendance, remove };
