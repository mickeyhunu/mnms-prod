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
    memberType: user.member_type || user.memberType || 'GENERAL',
    isAdmin: user.role === 'ADMIN',
    isAdvertiser: (user.member_type || user.memberType) === 'ADVERTISER',
    totalPoints,
    level: memberLevel.level,
    levelEmoji: memberLevel.emoji,
    levelTitle: memberLevel.title,
    levelLabel: memberLevel.label,
    phone: user.phone || '',
    name: user.name || '',
    birthDate: user.birth_date || null,
    emailConsent: Boolean(user.email_consent),
    smsConsent: Boolean(user.sms_consent),
    nicknameChangeAvailableAt: user.last_nickname_changed_at
      ? new Date(new Date(user.last_nickname_changed_at).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null
  };
}

module.exports = { pickUserRow };
