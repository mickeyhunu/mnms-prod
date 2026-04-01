/**
 * 파일 역할: userController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const {
  getUserActivityStats,
  getUserDailyActivityStats,
  getUserPointHistories,
  getUserActivityDetails,
  getUserNotifications,
  getUserNotificationReadMap,
  markNotificationsAsRead,
  getUserReadPostIdSet,
  markPostsAsRead,
  findByNicknameExceptUser,
  updateUserProfile,
  findById
} = require('../models/userModel');
const { resolveMemberLevel, MEMBER_LEVELS } = require('../utils/memberLevel');
const { POINT_RULES } = require('../models/pointModel');
const supportModel = require('../models/supportModel');
const adminModel = require('../models/adminModel');
const { deleteS3ObjectByUrl } = require('../utils/fileUpload');


function isNicknameChangeLocked(lastChangedAt) {
  if (!lastChangedAt) return false;
  const nextAllowedAt = new Date(lastChangedAt);
  nextAllowedAt.setDate(nextAllowedAt.getDate() + 1);
  return nextAllowedAt > new Date();
}

function getNicknameChangeAvailableAt(lastChangedAt) {
  if (!lastChangedAt) return null;
  const date = new Date(lastChangedAt);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

async function updateMyProfile(req, res, next) {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '').trim();
    const emailConsent = Boolean(req.body.emailConsent);
    const smsConsent = Boolean(req.body.smsConsent);

    if (!nickname || nickname.length < 2) {
      return res.status(400).json({ message: '닉네임은 2글자 이상이어야 합니다.' });
    }

    const updates = {
      phone,
      email_consent: emailConsent,
      sms_consent: smsConsent
    };

    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ message: '비밀번호는 4글자 이상이어야 합니다.' });
      }
      updates.password = password;
    }

    if (nickname !== req.user.nickname) {
      if (isNicknameChangeLocked(req.user.last_nickname_changed_at)) {
        return res.status(400).json({
          message: '닉네임은 하루에 한 번만 변경할 수 있습니다.',
          availableAt: getNicknameChangeAvailableAt(req.user.last_nickname_changed_at)
        });
      }

      const duplicateNickname = await findByNicknameExceptUser(nickname, req.user.id);
      if (duplicateNickname) {
        return res.status(400).json({ message: '이미 사용 중인 닉네임입니다. 중복 확인 후 다시 입력해주세요.' });
      }

      updates.nickname = nickname;
    }

    await updateUserProfile(req.user.id, updates);
    const updatedUser = await findById(req.user.id);

    res.json({
      success: true,
      message: '내 정보가 저장되었습니다.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        phone: updatedUser.phone || '',
        name: updatedUser.name || '',
        birthDate: updatedUser.birth_date || null,
        emailConsent: Boolean(updatedUser.email_consent),
        smsConsent: Boolean(updatedUser.sms_consent),
        nicknameChangeAvailableAt: getNicknameChangeAvailableAt(updatedUser.last_nickname_changed_at)
      }
    });
  } catch (error) {
    next(error);
  }
}

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
        boardType: post.boardType,
        createdAt: post.createdAt,
        likeCount: Number(post.likeCount || 0),
        commentCount: Number(post.commentCount || 0)
      })),
      comments: comments.map((comment) => ({
        id: Number(comment.id),
        postId: Number(comment.postId),
        postTitle: comment.postTitle,
        postBoardType: comment.postBoardType,
        content: comment.content,
        createdAt: comment.createdAt
      })),
      likedPosts: likedPosts.map((post) => ({
        id: Number(post.id),
        title: post.title,
        content: post.content,
        boardType: post.boardType,
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


async function myLiveAccessStatus(req, res, next) {
  try {
    const dailyStats = await getUserDailyActivityStats(req.user.id);
    const todayPostCount = Number(dailyStats.todayPostCount || 0);
    const todayCommentCount = Number(dailyStats.todayCommentCount || 0);
    const levelInfo = resolveMemberLevel(req.user.total_points || 0);
    const isPpakkomLevel = Number(levelInfo.level || 0) >= 3;
    const isRoomDoctorLevel = Number(levelInfo.level || 0) >= 4;
    const hasDailyActivity = todayPostCount >= 1 || todayCommentCount >= 5;

    res.json({
      level: Number(levelInfo.level || 0),
      levelLabel: levelInfo.label,
      todayPostCount,
      todayCommentCount,
      hasDailyActivity,
      access: {
        choice: true,
        chojoong: isPpakkomLevel || hasDailyActivity,
        waiting: isPpakkomLevel || hasDailyActivity,
        entry: isRoomDoctorLevel || (isPpakkomLevel && hasDailyActivity)
      }
    });
  } catch (error) {
    next(error);
  }
}

async function myNotifications(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const [commentNotifications, notices, answeredInquiries] = await Promise.all([
      getUserNotifications(req.user.id, { limit }),
      supportModel.listArticles(supportModel.SUPPORT_CATEGORIES.NOTICE, false),
      supportModel.listAnsweredInquiriesByUser(req.user.id, { limit })
    ]);

    const normalizedNotifications = [
      ...commentNotifications.map((item) => ({
        ...item,
        targetUrl: item.postId ? `/post-detail?id=${item.postId}` : '/'
      })),
      ...notices.map((notice) => ({
        notificationKey: `admin-notice-${notice.sourceType || 'SUPPORT'}-${notice.sourceId || notice.id}`,
        type: 'admin_notice',
        sourceId: Number(notice.sourceId || notice.id),
        postId: null,
        inquiryId: null,
        parentId: null,
        postTitle: null,
        content: notice.content,
        actorNickname: notice.createdByNickname || '운영팀',
        title: notice.title,
        message: `관리자 알림: ${notice.title}`,
        createdAt: notice.createdAt,
        sourceType: notice.sourceType || 'SUPPORT',
        targetUrl: `/support?articleId=${notice.sourceId || notice.id}&sourceType=${String(notice.sourceType || 'SUPPORT').toUpperCase()}`
      })),
      ...answeredInquiries.map((item) => ({
        notificationKey: `inquiry-answer-${item.id}`,
        type: 'inquiry_answer',
        sourceId: item.id,
        postId: null,
        inquiryId: item.id,
        parentId: null,
        postTitle: null,
        content: item.answerContent,
        actorNickname: '운영팀',
        title: item.title,
        message: `1:1 문의 "${item.title}"에 답변이 등록되었습니다.`,
        createdAt: item.answeredAt || item.updatedAt,
        targetUrl: `/my-inquiries/${item.id}`
      }))
    ]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);

    const readMap = await getUserNotificationReadMap(
      req.user.id,
      normalizedNotifications.map((item) => item.notificationKey)
    );
    const content = normalizedNotifications.map((item) => ({
      ...item,
      isRead: Boolean(readMap[item.notificationKey]),
      readAt: readMap[item.notificationKey] || null
    }));
    const unreadCount = content.filter((item) => !item.isRead).length;

    res.json({
      content,
      totalElements: content.length,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
}

async function markMyNotificationsRead(req, res, next) {
  try {
    const notificationKeys = Array.isArray(req.body.notificationKeys) ? req.body.notificationKeys : [];
    const markedCount = await markNotificationsAsRead(req.user.id, notificationKeys);
    res.json({
      success: true,
      markedCount
    });
  } catch (error) {
    next(error);
  }
}

async function markMyNotificationsReadAll(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.body.limit) || 100));
    const [commentNotifications, notices, answeredInquiries] = await Promise.all([
      getUserNotifications(req.user.id, { limit }),
      supportModel.listArticles(supportModel.SUPPORT_CATEGORIES.NOTICE, false),
      supportModel.listAnsweredInquiriesByUser(req.user.id, { limit })
    ]);

    const allNotificationKeys = [
      ...commentNotifications.map((item) => item.notificationKey),
      ...notices.map((notice) => `admin-notice-${notice.sourceType || 'SUPPORT'}-${notice.sourceId || notice.id}`),
      ...answeredInquiries.map((item) => `inquiry-answer-${item.id}`)
    ];

    const markedCount = await markNotificationsAsRead(req.user.id, allNotificationKeys);
    res.json({
      success: true,
      markedCount
    });
  } catch (error) {
    next(error);
  }
}

async function myReadPosts(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 500));
    const postIds = await getUserReadPostIdSet(req.user.id, { limit });
    res.json({
      content: postIds,
      totalElements: postIds.length
    });
  } catch (error) {
    next(error);
  }
}

async function markMyPostsRead(req, res, next) {
  try {
    const postIds = Array.isArray(req.body.postIds) ? req.body.postIds : [];
    const markedCount = await markPostsAsRead(req.user.id, postIds);
    res.json({
      success: true,
      markedCount
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

async function listMyBusinessAds(req, res, next) {
  try {
    const ads = await adminModel.listBusinessAdsByOwner(req.user.id);
    res.json({ content: ads, totalElements: ads.length });
  } catch (error) {
    next(error);
  }
}

async function createMyBusinessAd(req, res, next) {
  try {
    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    const insertId = await adminModel.createBusinessAd({
      ownerUserId: req.user.id,
      title,
      imageUrl,
      linkUrl,
      displayOrder,
      isActive
    });
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
}

async function updateMyBusinessAd(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findBusinessAdById(id);
    if (!target || Number(target.ownerUserId) !== Number(req.user.id)) {
      return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }

    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    await adminModel.updateBusinessAd(id, { title, imageUrl, linkUrl, displayOrder, isActive });
    if (target.imageUrl && target.imageUrl !== imageUrl) {
      await deleteS3ObjectByUrl(target.imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function deleteMyBusinessAd(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findBusinessAdById(id);
    if (!target || Number(target.ownerUserId) !== Number(req.user.id)) {
      return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }

    await adminModel.deleteBusinessAd(id);
    if (target.imageUrl) {
      await deleteS3ObjectByUrl(target.imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  myStats,
  myPointHistories,
  myActivity,
  myLiveAccessStatus,
  myNotifications,
  markMyNotificationsRead,
  markMyNotificationsReadAll,
  myReadPosts,
  markMyPostsRead,
  updateMyProfile,
  listMyBusinessAds,
  createMyBusinessAd,
  updateMyBusinessAd,
  deleteMyBusinessAd
};
