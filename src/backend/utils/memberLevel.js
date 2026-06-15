/**
 * 파일 역할: 회원 포인트 기반 레벨/등급 계산 규칙을 제공하는 유틸리티 파일.
 */
const ADVERTISER_AD_DAY_LEVELS = [
  { level: 1, emoji: '🌱', title: '미광고', minDays: 0 },
  { level: 2, emoji: '🥉', title: '브론즈', minDays: 1 },
  { level: 3, emoji: '🥈', title: '실버', minDays: 91 },
  { level: 4, emoji: '🥇', title: '골드', minDays: 181 },
  { level: 5, emoji: '💠', title: '플래티넘', minDays: 361 },
  { level: 6, emoji: '💎', title: '다이아', minDays: 721 },
  { level: 7, emoji: '👑', title: '레전드', minDays: 1441 }
];

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


function normalizeAdDays(days) {
  const parsed = Number(days || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function resolveAdvertiserAdDayLevel(totalAdDays) {
  const normalizedDays = normalizeAdDays(totalAdDays);
  let current = ADVERTISER_AD_DAY_LEVELS[0];

  for (const info of ADVERTISER_AD_DAY_LEVELS) {
    if (normalizedDays >= info.minDays) {
      current = info;
    } else {
      break;
    }
  }

  return {
    ...current,
    label: `${current.emoji} ${current.title}`,
    emoji: current.emoji,
    totalAdDays: normalizedDays
  };
}

function buildMemberLevelCaseSql(pointsExpression = 'total_points', nullExpression = null) {
  const normalizedPointsExpression = `COALESCE(${pointsExpression}, 0)`;
  const clauses = [...MEMBER_LEVELS]
    .sort((a, b) => b.minPoints - a.minPoints)
    .map((info) => `WHEN ${normalizedPointsExpression} >= ${info.minPoints} THEN ${info.level}`)
    .join('\n');
  const nullClause = nullExpression ? `WHEN ${nullExpression} IS NULL THEN NULL\n` : '';

  return `CASE\n${nullClause}${clauses}\nEND`;
}

module.exports = {
  MEMBER_LEVELS,
  ADVERTISER_AD_DAY_LEVELS,
  resolveMemberLevel,
  resolveAdvertiserAdDayLevel,
  buildMemberLevelCaseSql
};
