/**
 * 파일 역할: 백엔드에서 공통 응답 포맷/헬퍼 로직을 제공하는 유틸리티 파일.
 */
const { resolveMemberLevel } = require('./memberLevel');

function pickUserRow(user) {
  const totalPoints = Number(user.total_points ?? user.totalPoints ?? 0);
  const memberLevel = resolveMemberLevel(totalPoints);

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    isAdmin: user.role === 'ADMIN',
    totalPoints,
    level: memberLevel.level,
    levelEmoji: memberLevel.emoji,
    levelTitle: memberLevel.title,
    levelLabel: memberLevel.label
  };
}

module.exports = { pickUserRow };
