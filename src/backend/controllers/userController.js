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
  withdrawUserById,
  findById,
  getBusinessProfileByUserId,
  upsertBusinessProfileByUserId
} = require('../models/userModel');
const { resolveMemberLevel, MEMBER_LEVELS } = require('../utils/memberLevel');
const { POINT_RULES } = require('../models/pointModel');
const { STAMP_TYPES, createStampPurchase, getUserStampBalance, getUserStampHistories, getUserStampPaymentHistories } = require('../models/stampModel');
const { createStampEventRequest, listOwnerStampEventRequests, reviewStampEventRequest } = require('../models/stampEventRequestModel');
const supportModel = require('../models/supportModel');
const adminModel = require('../models/adminModel');
const { deleteS3ObjectsByUrls, parseDataUrl, uploadDataUrlToS3 } = require('../utils/fileUpload');
const {
  collectBusinessInfoImageUrls,
  deleteUnreferencedBusinessInfoImages,
  deleteUploadedBusinessInfoImagesOnFailure,
  parseBusinessInfoValue,
  uploadBusinessInfoDataUrlImages
} = require('../utils/businessProfileImages');
const { createSeoSlugWithId } = require('../utils/seoSlug');
const { validateNickname } = require('../utils/nicknamePolicy');
const { validatePassword } = require('../utils/authPolicy');
const { hashPassword } = require('../utils/passwordHasher');


const NTS_BUSINESS_STATUS_API_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';
const MIN_STAMP_EVENT_COUNT = 5;

function normalizeBusinessAdPlanTypePayload(planType) {
  return adminModel.normalizeBusinessAdPlanType(planType);
}

function normalizeBusinessRegistrationNumber(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

function formatBusinessRegistrationNumber(value) {
  const digits = normalizeBusinessRegistrationNumber(value);
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 10)].filter(Boolean).join('-');
}

function resolveBusinessRegistrationServiceKey() {
  const serviceKey = String(
    process.env.NTS_BUSINESS_API_SERVICE_KEY
    || process.env.NTS_BUSINESSMAN_API_SERVICE_KEY
    || process.env.BUSINESS_REGISTRATION_SERVICE_KEY
    || ''
  ).trim();

  try {
    return decodeURIComponent(serviceKey);
  } catch (error) {
    return serviceKey;
  }
}

function resolveNtsBusinessStatus(data = {}) {
  const statusCode = String(data.b_stt_cd || '').trim();
  const statusName = String(data.b_stt || '').trim();
  const taxType = String(data.tax_type || '').trim();
  const isNotRegistered = /등록되지 않은/u.test(taxType);
  const isActive = statusCode === '01';

  return {
    valid: Boolean(isActive && !isNotRegistered),
    statusCode,
    statusName,
    taxType,
    message: isActive && !isNotRegistered
      ? `유효한 사업자등록번호입니다.${statusName ? ` (${statusName})` : ''}`
      : '국세청에 등록된 계속사업자 번호가 아닙니다.'
  };
}

async function verifyBusinessRegistrationNumberWithNts(businessNumber) {
  const serviceKey = resolveBusinessRegistrationServiceKey();
  if (!serviceKey) {
    const error = new Error('사업자등록번호 검증 API 키가 설정되지 않았습니다.');
    error.status = 503;
    throw error;
  }

  const endpoint = new URL(NTS_BUSINESS_STATUS_API_URL);
  endpoint.searchParams.set('serviceKey', serviceKey);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ b_no: [businessNumber] })
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload?.message || '사업자등록번호 검증 API 호출에 실패했습니다.');
    error.status = 502;
    error.payload = payload;
    throw error;
  }

  const result = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!result) {
    const error = new Error('사업자등록번호 검증 API 응답을 확인할 수 없습니다.');
    error.status = 502;
    error.payload = payload;
    throw error;
  }

  return resolveNtsBusinessStatus(result);
}

const AD_REGISTRATION_STATUSES = new Set(['UNREGISTERED', 'DRAFT', 'REGISTERED']);
const BUSINESS_IMAGE_PLACEHOLDER = '등록할 이미지를 선택해주세요.';
const BUSINESS_IMAGE_OCR_VALID_STATUS = 'valid';
const BUSINESS_AD_DEFAULT_IMAGE_URL = '/src/assets/image/ad-profile-default.webp';

function isBusinessAdDefaultImageUrl(imageUrl = '') {
  return String(imageUrl || '').trim() === BUSINESS_AD_DEFAULT_IMAGE_URL;
}

const BUSINESS_AD_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const BUSINESS_AD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const BUSINESS_AD_DESCRIPTION_IMAGE_LIMIT = 20;

function isDataUrlImage(value = '') {
  return Boolean(parseDataUrl(value)?.mimeType?.startsWith('image/'));
}

function getImageExtensionFromDataUrl(dataUrl = '') {
  const mimeType = parseDataUrl(dataUrl)?.mimeType || 'image/jpeg';
  const extensionByMimeType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
  };
  return extensionByMimeType[mimeType] || 'jpg';
}

function extractImageSrcsFromHtml(html = '') {
  const imageSrcs = new Set();
  const imageSrcPattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let matched;

  while ((matched = imageSrcPattern.exec(String(html || ''))) !== null) {
    const imageSrc = String(matched[1] || '').trim();
    if (imageSrc) imageSrcs.add(imageSrc);
  }

  return [...imageSrcs];
}

function collectBusinessAdImageUrls(...ads) {
  const urls = new Set();

  for (const ad of ads) {
    const representativeImageUrl = String(ad?.imageUrl || '').trim();
    if (representativeImageUrl && !isBusinessAdDefaultImageUrl(representativeImageUrl) && !isDataUrlImage(representativeImageUrl)) {
      urls.add(representativeImageUrl);
    }

    extractImageSrcsFromHtml(ad?.description).forEach((imageUrl) => {
      if (!isDataUrlImage(imageUrl)) urls.add(imageUrl);
    });
  }

  return [...urls];
}

async function uploadBusinessAdDataUrlImage(dataUrl, { fileName, folder, uploadedUrls }) {
  const uploaded = await uploadDataUrlToS3({
    dataUrl,
    fileName,
    folder,
    allowedMimeTypes: BUSINESS_AD_IMAGE_MIME_TYPES,
    maxBytes: BUSINESS_AD_IMAGE_MAX_BYTES
  });
  uploadedUrls.push(uploaded.url);
  return uploaded.url;
}

async function resolveBusinessAdImageUrl(imageUrl = '', uploadedUrls = []) {
  const normalizedImageUrl = String(imageUrl || '').trim();
  if (!isDataUrlImage(normalizedImageUrl)) return normalizedImageUrl;

  return uploadBusinessAdDataUrlImage(normalizedImageUrl, {
    fileName: `ad-profile-image.${getImageExtensionFromDataUrl(normalizedImageUrl)}`,
    folder: 'ads',
    uploadedUrls
  });
}

async function uploadBusinessAdDescriptionImages(description = '', uploadedUrls = []) {
  const pendingDataUrls = [];
  const descriptionWithPlaceholders = String(description || '').replace(/(src=["'])(data:[^"']+)(["'])/gi, (matched, prefix, dataUrl, suffix) => {
    if (!isDataUrlImage(dataUrl)) return matched;
    if (pendingDataUrls.length >= BUSINESS_AD_DESCRIPTION_IMAGE_LIMIT) {
      throw new Error(`상세정보 이미지는 최대 ${BUSINESS_AD_DESCRIPTION_IMAGE_LIMIT}개까지 등록할 수 있습니다.`);
    }

    const placeholder = `__PENDING_BUSINESS_AD_IMAGE_${pendingDataUrls.length}__`;
    pendingDataUrls.push(dataUrl);
    return `${prefix}${placeholder}${suffix}`;
  });

  const uploadedUrlsByIndex = [];
  for (const [index, dataUrl] of pendingDataUrls.entries()) {
    uploadedUrlsByIndex[index] = await uploadBusinessAdDataUrlImage(dataUrl, {
      fileName: `ad-profile-description-${index + 1}.${getImageExtensionFromDataUrl(dataUrl)}`,
      folder: 'ads/description',
      uploadedUrls
    });
  }

  return uploadedUrlsByIndex.reduce(
    (resolvedDescription, uploadedUrl, index) => resolvedDescription.replace(`__PENDING_BUSINESS_AD_IMAGE_${index}__`, uploadedUrl),
    descriptionWithPlaceholders
  );
}

async function resolveBusinessAdImages({ imageUrl = '', description = '' }, uploadedUrls = []) {
  const resolvedImageUrl = await resolveBusinessAdImageUrl(imageUrl, uploadedUrls);
  const resolvedDescription = await uploadBusinessAdDescriptionImages(description, uploadedUrls);

  return {
    imageUrl: resolvedImageUrl,
    description: resolvedDescription
  };
}

async function deleteUnreferencedBusinessAdImages(previousAd, nextAd) {
  const previousUrls = collectBusinessAdImageUrls(previousAd);
  if (!previousUrls.length) return [];

  const retainedUrls = new Set(collectBusinessAdImageUrls(nextAd));
  const removableUrls = previousUrls.filter((url) => !retainedUrls.has(url));
  if (!removableUrls.length) return [];

  return deleteS3ObjectsByUrls(removableUrls);
}

function normalizeRegistrationStatus(value, fallback = 'UNREGISTERED') {
  const status = String(value || '').trim().toUpperCase();
  return AD_REGISTRATION_STATUSES.has(status) ? status : fallback;
}

function normalizeBusinessProfileRegistrationStatus(value, fallback = 'UNREGISTERED') {
  const status = String(value || '').trim().toUpperCase();
  if (status === 'REGISTERED' || status === 'UNREGISTERED') return status;
  return fallback;
}

function isBusinessProfileRegistrationStatusAllowed(value) {
  const status = String(value || '').trim().toUpperCase();
  return status === 'REGISTERED' || status === 'UNREGISTERED';
}

function normalizeBusinessProfileApprovalStatus(value, fallback = 'PENDING') {
  const status = String(value || '').trim().toUpperCase();
  if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') return status;
  return fallback;
}

function isBusinessProfilePendingReview(profile, user) {
  if (!profile) return false;

  const registrationStatus = normalizeBusinessProfileRegistrationStatus(profile.registrationStatus, 'UNREGISTERED');
  const approvalStatus = normalizeBusinessProfileApprovalStatus(profile.approvalStatus, 'PENDING');
  const memberType = String(user?.member_type || user?.memberType || '').trim().toUpperCase();

  return memberType !== 'BUSINESS' && registrationStatus === 'REGISTERED' && approvalStatus === 'PENDING';
}

function hasSubmittedBusinessImage(businessInfo = {}, imageNameKey) {
  const imageName = String(businessInfo?.[imageNameKey] || '').trim();
  return Boolean(imageName && imageName !== BUSINESS_IMAGE_PLACEHOLDER);
}

function hasValidBusinessImageInspection(businessInfo = {}, imageNameKey, statusKey) {
  if (!hasSubmittedBusinessImage(businessInfo, imageNameKey)) return false;
  return String(businessInfo?.[statusKey] || '').trim() === BUSINESS_IMAGE_OCR_VALID_STATUS;
}

function hasBlockedBusinessImageInspection(businessInfo = {}) {
  const licenseBlocked = hasSubmittedBusinessImage(businessInfo, 'licenseImageName')
    && !hasValidBusinessImageInspection(businessInfo, 'licenseImageName', 'licenseImageOcrStatus');
  const permitBlocked = hasSubmittedBusinessImage(businessInfo, 'permitImageName')
    && !hasValidBusinessImageInspection(businessInfo, 'permitImageName', 'permitImageOcrStatus');

  return licenseBlocked || permitBlocked;
}

function isCompleteBusinessAdPayload(payload = {}) {
  const requiredValues = [
    payload.businessName,
    payload.managerName,
    payload.managerContact,
    payload.title,
    payload.region,
    payload.district,
    payload.category,
    payload.openHour,
    payload.closeHour,
    payload.description
  ];
  return requiredValues.every((value) => String(value || '').trim());
}

function pickTrimmedText(body, key, fallback = '') {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key)) return fallback;
  return String(body[key] || '').trim();
}

function normalizeBooleanPayload(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'y', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'n', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizePositiveIntPayload(value, fallback = 0) {
  const normalized = Number.parseInt(String(value || '').replace(/\D/g, ''), 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function getBusinessAdStampEventError({ useStampEvent, stampEventDescription, stampEventCount }) {
  if (!useStampEvent) return '';
  if (!String(stampEventDescription || '').trim()) {
    return '스탬프 이벤트 설명을 입력해주세요.';
  }
  if (!Number.isInteger(Number(stampEventCount)) || Number(stampEventCount) < MIN_STAMP_EVENT_COUNT) {
    return `스탬프 이벤트는 스탬프 ${MIN_STAMP_EVENT_COUNT}개부터 설정할 수 있습니다.`;
  }
  return '';
}

function stableBusinessInfoStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableBusinessInfoStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableBusinessInfoStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? '');
}

function hasBusinessInfoChanged(previousInfo, nextInfo) {
  return stableBusinessInfoStringify(parseBusinessInfoValue(previousInfo)) !== stableBusinessInfoStringify(parseBusinessInfoValue(nextInfo));
}


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
    const smsConsent = Boolean(req.body.smsConsent);

    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
      return res.status(400).json({ message: nicknameValidation.message });
    }

    const updates = {
      phone,
      sms_consent: smsConsent
    };

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }
      updates.password = await hashPassword(password);
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
        loginId: updatedUser.login_id,
        nickname: updatedUser.nickname,
        phone: updatedUser.phone || '',
        name: updatedUser.name || '',
        birthDate: updatedUser.birth_date || null,
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
  CREATE_REVIEW_BONUS: '후기 게시글 보너스 (+20P)',
  CREATE_COMMENT: '댓글 작성',
  LIKE_POST: '좋아요 누름',
  RECEIVE_POST_LIKE: '내 게시글 좋아요 받음',
  REVOKE_CREATE_POST: '게시글 삭제로 포인트 차감',
  REVOKE_CREATE_REVIEW_BONUS: '후기 보너스 포인트 차감',
  REVOKE_CREATE_COMMENT: '댓글 삭제로 포인트 차감',
  REVOKE_LIKE_POST: '좋아요 취소로 포인트 차감',
  REVOKE_RECEIVE_POST_LIKE: '받은 좋아요 취소로 포인트 차감',
  ADMIN_ADJUST_ADD: '관리자 수동 적립',
  ADMIN_ADJUST_DEDUCT: '관리자 수동 차감'
};



function isRegularMemberUser(user = {}) {
  const role = String(user.role || '').toUpperCase();
  const memberType = String(user.member_type || user.memberType || '').toUpperCase();
  return role === 'MEMBER' && memberType === 'MEMBER';
}

function resolveUserStampType(user = {}) {
  const role = String(user.role || '').toUpperCase();
  const memberType = String(user.member_type || user.memberType || '').toUpperCase();
  return role === 'BUSINESS' || memberType === 'BUSINESS' ? STAMP_TYPES.BUSINESS : STAMP_TYPES.MEMBER;
}

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

    const stampType = resolveUserStampType(req.user);
    const totalStamps = await getUserStampBalance(req.user.id, stampType);

    res.json({
      loginId: req.user.login_id,
      nickname: req.user.nickname,
      totalPoints,
      totalStamps,
      stampType,
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
    const isAdmin = req.user?.role === 'ADMIN';
    const dailyStats = await getUserDailyActivityStats(req.user.id);
    const todayPostCount = Number(dailyStats.todayPostCount || 0);
    const todayCommentCount = Number(dailyStats.todayCommentCount || 0);
    const levelInfo = resolveMemberLevel(req.user.total_points || 0);
    const isChojoongUnlockedLevel = Number(levelInfo.level || 0) >= 3;
    const isEntryUnlockedLevel = Number(levelInfo.level || 0) >= 4;
    const hasDailyActivity = todayPostCount >= 1 || todayCommentCount >= 5;

    res.json({
      level: Number(levelInfo.level || 0),
      levelLabel: levelInfo.label,
      todayPostCount,
      todayCommentCount,
      hasDailyActivity,
      access: {
        choice: true,
        chojoong: isAdmin || isChojoongUnlockedLevel || hasDailyActivity,
        waiting: isAdmin || isChojoongUnlockedLevel || hasDailyActivity,
        entry: isAdmin || isEntryUnlockedLevel || (isChojoongUnlockedLevel && hasDailyActivity)
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
        targetUrl: item.postTitle ? `/post-detail/${encodeURIComponent(createSeoSlugWithId(item.postTitle, item.postId, 'post'))}` : '/'
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


async function myStampHistories(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 50));
    const stampType = resolveUserStampType(req.user);
    const [totalStamps, stampHistories] = await Promise.all([
      getUserStampBalance(req.user.id, stampType),
      getUserStampHistories(req.user.id, { stampType, limit })
    ]);

    res.json({
      totalStamps,
      stampType,
      stampHistories
    });
  } catch (error) {
    next(error);
  }
}


async function myStampPaymentHistories(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 50));
    const stampType = resolveUserStampType(req.user);
    const stampPaymentHistories = await getUserStampPaymentHistories(req.user.id, { stampType, limit });

    res.json({
      stampType,
      stampPaymentHistories
    });
  } catch (error) {
    next(error);
  }
}


async function purchaseMyStamps(req, res, next) {
  try {
    const planCode = String(req.body?.planCode || '').trim();
    const stampType = resolveUserStampType(req.user);
    const purchase = await createStampPurchase(req.user.id, { planCode, stampType });
    const totalStamps = await getUserStampBalance(req.user.id, stampType);

    res.status(201).json({
      success: true,
      message: '스탬프 구매가 완료되었습니다.',
      purchase,
      totalStamps,
      stampType
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
        reason: row.reason || '',
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
  const uploadedUrls = [];

  try {
    const businessName = String(req.body?.businessName || '').trim();
    const managerName = String(req.body?.managerName || '').trim();
    const managerContact = String(req.body?.managerContact || '').trim();
    const title = String(req.body?.title || '').trim();
    const requestedImageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '#').trim() || '#';
    const region = String(req.body?.region || '').trim();
    const district = String(req.body?.district || '').trim();
    const category = String(req.body?.category || '').trim();
    const openHour = String(req.body?.openHour || '').trim();
    const closeHour = String(req.body?.closeHour || '').trim();
    const requestedDescription = String(req.body?.description || '').trim();
    const kakaoTalkId = String(req.body?.kakaoTalkId || '').trim();
    const telegramId = String(req.body?.telegramId || '').trim();
    const showBusinessAddressMap = normalizeBooleanPayload(req.body?.showBusinessAddressMap, false);
    const useStampEvent = normalizeBooleanPayload(req.body?.useStampEvent, false);
    const useVisitVerification = useStampEvent;
    const stampEventDescription = useStampEvent ? String(req.body?.stampEventDescription || '').trim() : '';
    const stampEventCount = useStampEvent ? normalizePositiveIntPayload(req.body?.stampEventCount, 0) : 0;
    const planType = normalizeBusinessAdPlanTypePayload(req.body?.planType || 'BASIC');
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const requestedStatus = normalizeRegistrationStatus(req.body?.registrationStatus, 'UNREGISTERED');
    const isRegisteredStatus = requestedStatus === 'REGISTERED';
    const isActive = false;

    if (isRegisteredStatus && !isCompleteBusinessAdPayload({
      businessName, managerName, managerContact, title, region, district, category, openHour, closeHour, description: requestedDescription
    })) {
      return res.status(400).json({ message: '광고프로필 필수 항목을 모두 입력해주세요.' });
    }

    const stampEventError = getBusinessAdStampEventError({ useStampEvent, stampEventDescription, stampEventCount });
    if (stampEventError) {
      return res.status(400).json({ message: stampEventError });
    }

    const { imageUrl, description } = await resolveBusinessAdImages({
      imageUrl: requestedImageUrl,
      description: requestedDescription
    }, uploadedUrls);

    const insertId = await adminModel.createBusinessAd({
      ownerUserId: req.user.id,
      businessName,
      managerName,
      managerContact,
      title,
      imageUrl: imageUrl || BUSINESS_AD_DEFAULT_IMAGE_URL,
      linkUrl,
      region,
      district,
      category,
      openHour,
      closeHour,
      description,
      kakaoTalkId,
      telegramId,
      showBusinessAddressMap,
      useVisitVerification,
      useStampEvent,
      stampEventDescription,
      stampEventCount,
      planType,
      displayOrder,
      isActive,
      registrationStatus: requestedStatus
    });
    uploadedUrls.length = 0;
    res.status(201).json({ id: insertId });
  } catch (error) {
    await deleteS3ObjectsByUrls(uploadedUrls);
    next(error);
  }
}

async function updateMyBusinessAd(req, res, next) {
  const uploadedUrls = [];

  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findBusinessAdById(id);
    if (!target || Number(target.ownerUserId) !== Number(req.user.id)) {
      return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }

    const businessName = pickTrimmedText(req.body, 'businessName', target.businessName || '');
    const managerName = pickTrimmedText(req.body, 'managerName', target.managerName || '');
    const managerContact = pickTrimmedText(req.body, 'managerContact', target.managerContact || '');
    const title = pickTrimmedText(req.body, 'title', target.title || '');
    const hasImageUrlPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'imageUrl');
    const requestedImageUrl = hasImageUrlPayload ? pickTrimmedText(req.body, 'imageUrl', '') : String(target.imageUrl || '').trim();
    const linkUrl = pickTrimmedText(req.body, 'linkUrl', target.linkUrl || '#') || '#';
    const region = pickTrimmedText(req.body, 'region', target.region || '');
    const district = pickTrimmedText(req.body, 'district', target.district || '');
    const category = pickTrimmedText(req.body, 'category', target.category || '');
    const openHour = pickTrimmedText(req.body, 'openHour', target.openHour || '');
    const closeHour = pickTrimmedText(req.body, 'closeHour', target.closeHour || '');
    const requestedDescription = pickTrimmedText(req.body, 'description', target.description || '');
    const kakaoTalkId = pickTrimmedText(req.body, 'kakaoTalkId', target.kakaoTalkId || '');
    const telegramId = pickTrimmedText(req.body, 'telegramId', target.telegramId || '');
    const showBusinessAddressMap = Object.prototype.hasOwnProperty.call(req.body || {}, 'showBusinessAddressMap')
      ? normalizeBooleanPayload(req.body?.showBusinessAddressMap, false)
      : normalizeBooleanPayload(target.showBusinessAddressMap, false);
    const useStampEvent = Object.prototype.hasOwnProperty.call(req.body || {}, 'useStampEvent')
      ? normalizeBooleanPayload(req.body?.useStampEvent, false)
      : normalizeBooleanPayload(target.useStampEvent, false);
    const useVisitVerification = useStampEvent;
    const stampEventDescription = useStampEvent
      ? pickTrimmedText(req.body, 'stampEventDescription', target.stampEventDescription || '')
      : '';
    const stampEventCount = useStampEvent
      ? normalizePositiveIntPayload(
        Object.prototype.hasOwnProperty.call(req.body || {}, 'stampEventCount') ? req.body?.stampEventCount : target.stampEventCount,
        0
      )
      : 0;
    const planType = normalizeBusinessAdPlanTypePayload(pickTrimmedText(req.body, 'planType', target.planType || 'BASIC'));
    const displayOrder = Object.prototype.hasOwnProperty.call(req.body || {}, 'displayOrder') ? (Number(req.body?.displayOrder) || 0) : (Number(target.displayOrder) || 0);
    const requestedStatus = normalizeRegistrationStatus(req.body?.registrationStatus, target.registrationStatus || 'UNREGISTERED');
    const isRegisteredStatus = requestedStatus === 'REGISTERED';
    const isActive = isRegisteredStatus && target.registrationStatus === 'REGISTERED'
      ? normalizeBooleanPayload(target.isActive, false)
      : false;

    if (isRegisteredStatus && !isCompleteBusinessAdPayload({
      businessName, managerName, managerContact, title, region, district, category, openHour, closeHour, description: requestedDescription
    })) {
      return res.status(400).json({ message: '광고프로필 필수 항목을 모두 입력해주세요.' });
    }

    const stampEventError = getBusinessAdStampEventError({ useStampEvent, stampEventDescription, stampEventCount });
    if (stampEventError) {
      return res.status(400).json({ message: stampEventError });
    }

    const { imageUrl, description } = await resolveBusinessAdImages({
      imageUrl: requestedImageUrl,
      description: requestedDescription
    }, uploadedUrls);
    const nextAdImages = { imageUrl: imageUrl || BUSINESS_AD_DEFAULT_IMAGE_URL, description };

    await adminModel.updateBusinessAd(id, {
      businessName,
      managerName,
      managerContact,
      title,
      imageUrl: nextAdImages.imageUrl,
      linkUrl,
      region,
      district,
      category,
      openHour,
      closeHour,
      description,
      kakaoTalkId,
      telegramId,
      showBusinessAddressMap,
      useVisitVerification,
      useStampEvent,
      stampEventDescription,
      stampEventCount,
      planType,
      displayOrder,
      isActive,
      registrationStatus: requestedStatus
    });
    uploadedUrls.length = 0;
    await deleteUnreferencedBusinessAdImages(target, nextAdImages);
    res.json({ success: true });
  } catch (error) {
    await deleteS3ObjectsByUrls(uploadedUrls);
    next(error);
  }
}

async function createMyStampEventRequest(req, res, next) {
  try {
    const businessAdId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(businessAdId) || businessAdId <= 0) {
      return res.status(400).json({ message: '유효한 광고 ID가 필요합니다.' });
    }
    if (!isRegularMemberUser(req.user)) {
      return res.status(403).json({ message: '광고 이벤트는 일반 회원만 참여할 수 있습니다.' });
    }

    const request = await createStampEventRequest({
      businessAdId,
      applicantUserId: req.user.id,
      requestType: req.body?.requestType
    });

    return res.status(201).json({
      message: '스탬프 이벤트 신청이 접수되었습니다.',
      content: request
    });
  } catch (error) {
    next(error);
  }
}

async function myStampEventRequests(req, res, next) {
  try {
    const requests = await listOwnerStampEventRequests(req.user.id, {
      status: req.query?.status || 'PENDING',
      limit: req.query?.limit
    });

    return res.json({
      content: requests,
      totalElements: requests.length
    });
  } catch (error) {
    next(error);
  }
}

async function reviewMyStampEventRequest(req, res, next) {
  try {
    const requestId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: '유효한 신청 ID가 필요합니다.' });
    }

    const result = await reviewStampEventRequest({
      requestId,
      ownerUserId: req.user.id,
      status: req.body?.status,
      rejectionReason: req.body?.rejectionReason
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}


async function updateMyBusinessAdActivation(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findBusinessAdById(id);
    if (!target || Number(target.ownerUserId) !== Number(req.user.id)) {
      return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }

    const nextActive = normalizeBooleanPayload(req.body?.isActive, false);
    if (!nextActive) {
      await adminModel.setBusinessAdActivationOff(id);
      const updated = await adminModel.findBusinessAdById(id);
      return res.json({
        success: true,
        message: updated?.isCurrentlyVisible
          ? '광고 활성화가 OFF되었습니다. 진행 중인 광고는 만료일까지 노출됩니다.'
          : '광고 활성화가 OFF되었습니다.',
        content: updated
      });
    }

    const activation = await adminModel.activateBusinessAdWithStamp({
      adId: id,
      ownerUserId: req.user.id
    });
    const totalStamps = await getUserStampBalance(req.user.id, STAMP_TYPES.BUSINESS);
    const updated = await adminModel.findBusinessAdById(id);

    return res.json({
      success: true,
      message: activation.consumedStampCount > 0
        ? `스탬프 1개를 사용해 ${activation.durationDays}일간 광고가 활성화되었습니다.`
        : '진행 중인 광고 활성화가 ON으로 변경되었습니다.',
      activation,
      totalStamps,
      content: updated
    });
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
    await deleteS3ObjectsByUrls(collectBusinessAdImageUrls(target));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function getMyBusinessProfile(req, res, next) {
  try {
    const profile = await getBusinessProfileByUserId(req.user.id);
    if (!profile) {
      return res.json({
        registrationStatus: 'UNREGISTERED',
        approvalStatus: 'PENDING',
        rejectionReason: '',
        businessInfo: {}
      });
    }

    const rawBusinessInfo = profile.businessInfo;
    let businessInfo = {};
    if (rawBusinessInfo && typeof rawBusinessInfo === 'object') {
      businessInfo = rawBusinessInfo;
    } else if (typeof rawBusinessInfo === 'string') {
      try {
        businessInfo = JSON.parse(rawBusinessInfo);
      } catch (error) {
        businessInfo = {};
      }
    }

    const normalizedApprovalStatus = normalizeBusinessProfileApprovalStatus(profile.approvalStatus, 'PENDING');
    const hasLastApprovedBusinessInfo = Object.keys(parseBusinessInfoValue(profile.lastApprovedBusinessInfo)).length > 0;

    res.json({
      registrationStatus: normalizeBusinessProfileRegistrationStatus(profile.registrationStatus, 'UNREGISTERED'),
      approvalStatus: normalizedApprovalStatus,
      rejectionReason: profile.rejectionReason || '',
      businessInfo,
      revertedToLastApprovedBusinessInfo: normalizedApprovalStatus === 'REJECTED' && hasLastApprovedBusinessInfo
    });
  } catch (error) {
    next(error);
  }
}

async function saveMyBusinessProfile(req, res, next) {
  try {
    const businessInfo = (req.body?.businessInfo && typeof req.body.businessInfo === 'object') ? req.body.businessInfo : {};

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'registrationStatus')
      && !isBusinessProfileRegistrationStatusAllowed(req.body.registrationStatus)) {
      return res.status(400).json({ message: '사업자정보 임시저장은 지원하지 않습니다.' });
    }

    const registrationStatus = normalizeBusinessProfileRegistrationStatus(req.body?.registrationStatus, 'UNREGISTERED');
    const existingProfile = await getBusinessProfileByUserId(req.user.id);
    if (isBusinessProfilePendingReview(existingProfile, req.user)) {
      return res.status(409).json({ message: '이미 접수된 기업회원 신청이 검토중입니다. 검토 완료 후 다시 이용해주세요.' });
    }

    if (hasBlockedBusinessImageInspection(businessInfo)) {
      return res.status(400).json({ message: '이미지 검사 통과 후 사업자정보를 저장할 수 있습니다.' });
    }

    let businessRegistrationVerification = null;

    if (registrationStatus === 'REGISTERED') {
      const requiredValues = {
        licenseImageName: String(businessInfo.licenseImageName || '').trim(),
        businessNumber: normalizeBusinessRegistrationNumber(businessInfo.businessNumber),
        businessName: String(businessInfo.businessName || '').trim(),
        businessOwner: String(businessInfo.businessOwner || '').trim(),
        businessAddress: String(businessInfo.businessAddress || '').trim()
      };

      if (Object.values(requiredValues).some((value) => !value) || requiredValues.businessNumber.length !== 10) {
        return res.status(400).json({ message: '사업자정보 필수 항목을 모두 입력해주세요.' });
      }

      if (!hasValidBusinessImageInspection(businessInfo, 'licenseImageName', 'licenseImageOcrStatus')
        || !hasValidBusinessImageInspection(businessInfo, 'permitImageName', 'permitImageOcrStatus')) {
        return res.status(400).json({ message: '사업자등록증과 영업허가증 이미지 검사 통과 후 기업회원 신청/사업자정보 저장이 가능합니다.' });
      }

      businessRegistrationVerification = await verifyBusinessRegistrationNumberWithNts(requiredValues.businessNumber);
      if (!businessRegistrationVerification.valid) {
        return res.status(400).json({ message: businessRegistrationVerification.message || '국세청에 등록된 계속사업자 번호가 아닙니다.' });
      }
    }

    const uploadedBusinessInfoImageUrls = [];
    let normalizedBusinessInfo;
    let shouldResetReviewStatus = false;
    let shouldCaptureInitialApprovedSnapshot = false;

    try {
      normalizedBusinessInfo = await uploadBusinessInfoDataUrlImages({
        ...businessInfo,
        businessNumber: formatBusinessRegistrationNumber(businessInfo.businessNumber)
      }, uploadedBusinessInfoImageUrls);
      delete normalizedBusinessInfo.billingType;

      if (businessRegistrationVerification?.valid) {
        normalizedBusinessInfo.businessNumberVerificationStatus = 'valid';
        normalizedBusinessInfo.businessRegistrationStatusName = businessRegistrationVerification.statusName || '';
        normalizedBusinessInfo.businessRegistrationStatusCode = businessRegistrationVerification.statusCode || '';
      }

      const isBusinessMember = String(req.user?.member_type || req.user?.memberType || '').toUpperCase() === 'BUSINESS';
      const isApprovedBusinessProfile = existingProfile
        && normalizeBusinessProfileRegistrationStatus(existingProfile.registrationStatus, 'UNREGISTERED') === 'REGISTERED'
        && normalizeBusinessProfileApprovalStatus(existingProfile.approvalStatus, 'PENDING') === 'APPROVED';
      const businessInfoChanged = existingProfile ? hasBusinessInfoChanged(existingProfile.businessInfo, normalizedBusinessInfo) : true;
      shouldResetReviewStatus = registrationStatus === 'REGISTERED'
        && (!isBusinessMember || (isBusinessMember && businessInfoChanged));
      shouldCaptureInitialApprovedSnapshot = isBusinessMember
        && isApprovedBusinessProfile
        && !existingProfile.lastApprovedBusinessInfo
        && businessInfoChanged;

      await upsertBusinessProfileByUserId(req.user.id, {
        companyName: String(businessInfo.businessName || '').trim() || null,
        businessRegistrationNumber: normalizedBusinessInfo.businessNumber || null,
        managerName: String(businessInfo.businessOwner || '').trim() || null,
        contactPhone: String(req.user.phone || '').trim() || null,
        registrationStatus,
        businessInfo: normalizedBusinessInfo,
        lastApprovedBusinessInfo: shouldCaptureInitialApprovedSnapshot ? parseBusinessInfoValue(existingProfile.businessInfo) : undefined,
        approvalStatus: shouldResetReviewStatus ? 'PENDING' : null,
        rejectionReason: shouldResetReviewStatus ? null : undefined
      });
    } catch (error) {
      await deleteUploadedBusinessInfoImagesOnFailure(uploadedBusinessInfoImageUrls);
      throw error;
    }

    if (existingProfile) {
      await deleteUnreferencedBusinessInfoImages(existingProfile.businessInfo, [
        normalizedBusinessInfo,
        existingProfile.lastApprovedBusinessInfo,
        shouldCaptureInitialApprovedSnapshot ? existingProfile.businessInfo : null
      ]);
    }

    res.json({
      success: true,
      registrationStatus,
      approvalStatus: shouldResetReviewStatus ? 'PENDING' : (existingProfile?.approvalStatus || 'PENDING'),
      requiresAdminReview: shouldResetReviewStatus
    });
  } catch (error) {
    next(error);
  }
}


async function verifyMyBusinessRegistration(req, res, next) {
  try {
    const businessNumber = normalizeBusinessRegistrationNumber(req.body?.businessNumber);
    if (businessNumber.length !== 10) {
      return res.status(400).json({ message: '사업자등록번호 숫자 10자리를 입력해주세요.' });
    }

    const verification = await verifyBusinessRegistrationNumberWithNts(businessNumber);
    res.json({
      success: true,
      businessNumber: formatBusinessRegistrationNumber(businessNumber),
      ...verification
    });
  } catch (error) {
    next(error);
  }
}

async function withdrawMyAccount(req, res, next) {
  try {
    const reason = String(req.body?.reason || '').trim();
    const identityVerificationId = String(req.body?.identityVerificationId || '').trim();

    if (!reason) {
      return res.status(400).json({ message: '탈퇴 사유를 입력해주세요.' });
    }

    if (!identityVerificationId) {
      return res.status(400).json({ message: '본인인증 확인 정보가 필요합니다.' });
    }

    const [businessProfile, businessAds] = await Promise.all([
      getBusinessProfileByUserId(req.user.id),
      adminModel.listBusinessAdsByOwner(req.user.id)
    ]);

    await withdrawUserById(req.user.id, { reason });
    await deleteS3ObjectsByUrls([
      ...collectBusinessInfoImageUrls(businessProfile?.businessInfo, businessProfile?.lastApprovedBusinessInfo),
      ...collectBusinessAdImageUrls(...businessAds)
    ]);
    res.json({ success: true, message: '회원 탈퇴가 완료되었습니다.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  myStats,
  myPointHistories,
  myStampHistories,
  myStampPaymentHistories,
  purchaseMyStamps,
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
  updateMyBusinessAdActivation,
  deleteMyBusinessAd,
  getMyBusinessProfile,
  saveMyBusinessProfile,
  verifyMyBusinessRegistration,
  createMyStampEventRequest,
  myStampEventRequests,
  reviewMyStampEventRequest,
  withdrawMyAccount
};
