/**
 * 파일 역할: userController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const { getUserActivityStats, getUserPointHistories, getUserActivityDetails } = require('../models/userModel');
const { resolveMemberLevel, MEMBER_LEVELS } = require('../utils/memberLevel');
const { POINT_RULES } = require('../models/pointModel');



const POINT_ACTION_LABELS = {
  REGISTER: '회원가입',
  LOGIN_DAILY: '출석 체크',
  CREATE_POST: '게시글 작성',
  CREATE_REVIEW_BONUS: '후기 게시글 보너스',
  CREATE_COMMENT: '댓글 작성',
  LIKE_POST: '좋아요 누름',
  RECEIVE_POST_LIKE: '내 게시글 좋아요 받음',
  REVOKE_CREATE_POST: '게시글 삭제로 포인트 차감',
  REVOKE_CREATE_REVIEW_BONUS: '후기 보너스 포인트 차감',
  REVOKE_CREATE_COMMENT: '댓글 삭제로 포인트 차감',
  REVOKE_LIKE_POST: '좋아요 취소로 포인트 차감',
  REVOKE_RECEIVE_POST_LIKE: '받은 좋아요 취소로 포인트 차감'
};

function formatPointRule(ruleKey, rule) {
  const limitLabel = rule.dailyLimit == null ? '제한 없음' : `일 ${rule.dailyLimit}회`;
  return {
    actionType: ruleKey,
    actionLabel: POINT_ACTION_LABELS[ruleKey] || ruleKey,
    points: Number(rule.points || 0),
    dailyLimit: rule.dailyLimit,
    dailyLimitLabel: limitLabel
  };
}

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
      nextLevelLabel: nextLevel ? `${nextLevel.emoji} ${nextLevel.title}` : 'MAX',
      progressRate,
      nextLevelMinPoints: nextLevel ? nextLevel.minPoints : totalPoints
    });
  } catch (error) {
    next(error);
  }
}





async function myActivity(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    const { posts, comments, likedPosts } = await getUserActivityDetails(req.user.id, { limit });

    res.json({
      posts: posts.map((post) => ({
        id: Number(post.id),
        title: post.title,
        content: post.content,
        createdAt: post.createdAt,
        likeCount: Number(post.likeCount || 0),
        commentCount: Number(post.commentCount || 0)
      })),
      comments: comments.map((comment) => ({
        id: Number(comment.id),
        postId: Number(comment.postId),
        postTitle: comment.postTitle,
        content: comment.content,
        createdAt: comment.createdAt
      })),
      likedPosts: likedPosts.map((post) => ({
        id: Number(post.id),
        title: post.title,
        content: post.content,
        createdAt: post.createdAt,
        likedAt: post.likedAt,
        likeCount: Number(post.likeCount || 0),
        commentCount: Number(post.commentCount || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
}
async function myPointHistories(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 20));
    const { histories, pagination } = await getUserPointHistories(req.user.id, { page, limit });
    const totalPoints = Number(req.user.total_points || 0);
    const currentLevel = resolveMemberLevel(totalPoints);

    const levelGuide = MEMBER_LEVELS.map((info, index) => ({
      level: info.level,
      label: `${info.emoji} ${info.title}`,
      minPoints: info.minPoints,
      maxPoints: MEMBER_LEVELS[index + 1] ? MEMBER_LEVELS[index + 1].minPoints - 1 : null
    }));

    const pointRuleGuide = Object.entries(POINT_RULES)
      .map(([ruleKey, rule]) => formatPointRule(ruleKey, rule));

    res.json({
      totalPoints,
      level: currentLevel.level,
      levelLabel: currentLevel.label,
      pointHistories: histories.map((row) => ({
        id: Number(row.id),
        actionType: row.actionType,
        actionLabel: POINT_ACTION_LABELS[row.actionType] || row.actionType,
        points: Number(row.points || 0),
        createdAt: row.createdAt
      })),
      pointRuleGuide,
      levelGuide,
      pagination
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { myStats, myPointHistories, myActivity };
