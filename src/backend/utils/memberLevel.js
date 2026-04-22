/**
 * 파일 역할: 회원 포인트 기반 레벨/등급 계산 규칙을 제공하는 유틸리티 파일.
 */
const MEMBER_LEVELS = [
  { level: 1, emoji: '/assets/lv-badges/lv1.png', title: '신입', minPoints: 0 },
  { level: 2, emoji: '/assets/lv-badges/lv2.png', title: '룸린이', minPoints: 100 },
  { level: 3, emoji: '/assets/lv-badges/lv3.png', title: '단골', minPoints: 400 },
  { level: 4, emoji: '/assets/lv-badges/lv4.png', title: '빠꼼이', minPoints: 1000 },
  { level: 5, emoji: '/assets/lv-badges/lv5.png', title: '룸박사', minPoints: 3000 },
  { level: 6, emoji: '/assets/lv-badges/lv6.png', title: 'VIP', minPoints: 8000 },
  { level: 7, emoji: '/assets/lv-badges/lv7.png', title: '전설', minPoints: 20000 }
];

function normalizePoints(points) {
  const parsed = Number(points || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function resolveMemberLevel(totalPoints) {
  const normalizedPoints = normalizePoints(totalPoints);
  let current = MEMBER_LEVELS[0];

  for (const info of MEMBER_LEVELS) {
    if (normalizedPoints >= info.minPoints) {
      current = info;
    } else {
      break;
    }
  }

  return {
    ...current,
    label: `${current.emoji} ${current.title}`,
    totalPoints: normalizedPoints
  };
}

module.exports = { MEMBER_LEVELS, resolveMemberLevel };
