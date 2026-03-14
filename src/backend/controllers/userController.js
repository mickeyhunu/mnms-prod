/**
 * 파일 역할: userController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const { getUserActivityStats } = require('../models/userModel');
const { resolveMemberLevel, MEMBER_LEVELS } = require('../utils/memberLevel');

function getNextLevelInfo(level) {
  return MEMBER_LEVELS.find((item) => item.level === level + 1) || null;
}

async function myStats(req, res, next) {
  try {
    const stats = await getUserActivityStats(req.user.id);
    const totalPoints = Number(req.user.total_points || 0);
    const currentLevel = resolveMemberLevel(totalPoints);
    const nextLevel = getNextLevelInfo(currentLevel.level);

    const currentLevelMinPoints = currentLevel.minPoints;
    const currentLevelRange = nextLevel ? nextLevel.minPoints - currentLevelMinPoints : 0;
    const currentProgress = nextLevel ? totalPoints - currentLevelMinPoints : currentLevelRange;
    const progressRate = nextLevel && currentLevelRange > 0
      ? Math.max(0, Math.min(100, Math.floor((currentProgress / currentLevelRange) * 100)))
      : 100;

    res.json({
      loginId: req.user.email,
      nickname: req.user.nickname,
      totalPoints,
      level: currentLevel.level,
      levelLabel: currentLevel.label,
      joinedAt: req.user.created_at,
      postCount: Number(stats.postCount || 0),
      commentCount: Number(stats.commentCount || 0),
      attendanceCount: Number(stats.attendanceCount || 0),
      reviewCount: Number(stats.reviewCount || 0),
      recommendCount: Number(stats.recommendCount || 0),
      neededPointsToNextLevel: nextLevel ? Math.max(0, nextLevel.minPoints - totalPoints) : 0,
      nextLevelLabel: nextLevel ? `Lv.${nextLevel.level}` : 'MAX',
      progressRate,
      nextLevelMinPoints: nextLevel ? nextLevel.minPoints : totalPoints
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { myStats };
