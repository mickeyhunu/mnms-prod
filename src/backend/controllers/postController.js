/**
 * 파일 역할: postController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const postModel = require('../models/postModel');
const communityEditLogModel = require('../models/communityEditLogModel');
const { awardPointByAction, revokePointByAction } = require('../models/pointModel');
const {
  deleteS3ObjectsByUrls,
  normalizeExistingFileUrls,
  parseDataUrl,
  uploadDataUrlToS3
} = require('../utils/fileUpload');

const BOARD_TYPES = postModel.BOARD_TYPES || {
  FREE: 'FREE',
  ANON: 'ANON',
  REVIEW: 'REVIEW',
  STORY: 'STORY',
  ATTENDANCE: 'ATTENDANCE',
  QUESTION: 'QUESTION',
  EVENT: 'EVENT',
  PROMOTION: 'PROMOTION'
};

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

function parsePagination(rawPage, rawSize) {
  const page = Number.parseInt(rawPage, 10);
  const size = Number.parseInt(rawSize, 10);

  return {
    page: Number.isInteger(page) && page >= 0 ? page : DEFAULT_PAGE,
    size: Number.isInteger(size) && size > 0 ? Math.min(size, MAX_SIZE) : DEFAULT_SIZE
  };
}

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseBoardType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'ALL') return 'ALL';
  if (Object.values(BOARD_TYPES).includes(normalized)) return normalized;
  return BOARD_TYPES.FREE;
}

function isBusinessUser(user) {
  const role = String(user?.role || '').toUpperCase();
  const memberType = String(user?.member_type || user?.memberType || '').toUpperCase();
  return role === 'BUSINESS' || memberType === 'BUSINESS';
}

function isAdvertiserAuthor(author) {
  const role = String(author?.authorRole || author?.role || '').toUpperCase();
  const memberType = String(author?.authorMemberType || author?.memberType || author?.member_type || '').toUpperCase();
  return role === 'BUSINESS' || memberType === 'BUSINESS';
}


function parseNoticeType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'NOTICE' || normalized === 'IMPORTANT') return normalized;
  return null;
}


function parseNoticeTargetBoards(value, fallbackBoardType = BOARD_TYPES.FREE) {
  const values = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : []);
  const normalized = Array.from(new Set(values
    .map((item) => parseBoardType(item))
    .filter((item) => item !== 'ALL')))
    .slice(0, 1);

  if (normalized.length) return normalized;
  return [parseBoardType(fallbackBoardType)];
}


async function resolveImageUrls(payload) {
  const arrayValue = Array.isArray(payload?.imageUrls)
    ? payload.imageUrls
    : (payload?.imageUrl ? [payload.imageUrl] : []);

  const existingUrls = normalizeExistingFileUrls(arrayValue, { maxCount: 5 });
  const newDataUrls = arrayValue
    .map((url) => String(url || '').trim())
    .filter((url) => parseDataUrl(url)?.mimeType?.startsWith('image/'))
    .slice(0, 5);

  const extensionByMimeType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
  };

  const uploadedUrls = [];
  for (const [index, dataUrl] of newDataUrls.entries()) {
    const parsed = parseDataUrl(dataUrl);
    const extension = extensionByMimeType[parsed?.mimeType] || 'jpg';
    const uploadResult = await uploadDataUrlToS3({
      dataUrl,
      fileName: `post-image-${index + 1}.${extension}`,
      folder: 'posts',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
      maxBytes: 8 * 1024 * 1024
    });
    uploadedUrls.push(uploadResult.url);
  }

  return [...existingUrls, ...uploadedUrls].slice(0, 5);
}

function extractImageUrlsFromPost(post) {
  if (!post) return [];

  if (Array.isArray(post.imageUrls)) {
    return normalizeExistingFileUrls(post.imageUrls, { maxCount: 5 });
  }

  if (typeof post.image_urls === 'string') {
    try {
      const parsed = JSON.parse(post.image_urls);
      return normalizeExistingFileUrls(parsed, { maxCount: 5 });
    } catch (error) {
      return [];
    }
  }

  if (typeof post.imageUrls === 'string') {
    try {
      const parsed = JSON.parse(post.imageUrls);
      return normalizeExistingFileUrls(parsed, { maxCount: 5 });
    } catch (error) {
      return normalizeExistingFileUrls([post.imageUrls], { maxCount: 5 });
    }
  }

  return normalizeExistingFileUrls([post.imageUrl], { maxCount: 5 });
}

function getPostAuthorId(post) {
  return post?.user_id ?? post?.userId;
}

function getCommentAuthorId(comment) {
  return comment?.userId ?? comment?.user_id;
}

function getCommentParentId(comment) {
  return comment?.parentId ?? comment?.parent_id;
}

function isAdminViewer(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

function isSameUserId(left, right) {
  if (left == null || right == null) return false;
  return Number(left) === Number(right);
}

function getSecretThreadOwnerId(comment) {
  return comment?.secretThreadOwnerId ?? comment?.secret_thread_owner_id;
}

function canParticipateInSecretComment(comment, post, currentUser) {
  if (!currentUser) return false;

  const currentUserId = currentUser.id;
  return isSameUserId(currentUserId, getCommentAuthorId(comment))
    || isSameUserId(currentUserId, getPostAuthorId(post))
    || isSameUserId(currentUserId, getSecretThreadOwnerId(comment));
}


function stripSecretThreadMetadata(comment) {
  const sanitized = { ...comment };
  delete sanitized.secretThreadOwnerId;
  delete sanitized.secret_thread_owner_id;
  return sanitized;
}

function canViewSecretComment(comment, post, currentUser) {
  if (!comment.isSecret) {
    return true;
  }

  return canParticipateInSecretComment(comment, post, currentUser) || isAdminViewer(currentUser);
}

function canReplyToComment(comment, post, currentUser) {
  if (!currentUser || comment.isDeleted) {
    return false;
  }

  if (!comment.isSecret) {
    return true;
  }

  return canParticipateInSecretComment(comment, post, currentUser);
}

function canReportComment(comment, post, currentUser) {
  if (!currentUser || comment.isDeleted || comment.isHidden) {
    return false;
  }

  if (isSameUserId(currentUser.id, getCommentAuthorId(comment))) {
    return false;
  }

  if (!comment.isSecret) {
    return true;
  }

  return isSameUserId(currentUser.id, getPostAuthorId(post))
    || isSameUserId(currentUser.id, getSecretThreadOwnerId(comment));
}

function annotateSecretThreadOwnerIds(comments = []) {
  const commentMap = new Map();

  comments.forEach((comment) => {
    commentMap.set(Number(comment.id), comment);
  });

  const resolveSecretThreadOwnerId = (comment, visiting = new Set()) => {
    if (!comment || !comment.isSecret) return null;
    if (Object.prototype.hasOwnProperty.call(comment, 'secretThreadOwnerId')) {
      return comment.secretThreadOwnerId;
    }

    if (visiting.has(Number(comment.id))) {
      comment.secretThreadOwnerId = getCommentAuthorId(comment);
      return comment.secretThreadOwnerId;
    }

    visiting.add(Number(comment.id));
    const parentId = getCommentParentId(comment);
    const parentComment = parentId ? commentMap.get(Number(parentId)) : null;
    const parentSecretThreadOwnerId = parentComment && parentComment.isSecret
      ? resolveSecretThreadOwnerId(parentComment, visiting)
      : null;

    comment.secretThreadOwnerId = parentSecretThreadOwnerId ?? getCommentAuthorId(comment);
    visiting.delete(Number(comment.id));
    return comment.secretThreadOwnerId;
  };

  comments.forEach((comment) => {
    comment.secretThreadOwnerId = comment.isSecret ? resolveSecretThreadOwnerId(comment) : null;
  });

  return comments;
}


function formatAnonymousAuthorNickname(nickname, currentUser) {
  const trimmedNickname = String(nickname || '').trim();
  if (!isAdminViewer(currentUser) || !trimmedNickname || trimmedNickname === '익명') {
    return '익명';
  }

  return `익명(${trimmedNickname})`;
}

function sanitizePostForViewer(post, currentUser = null) {
  if (!post) return post;

  const normalized = {
    ...post,
    boardType: parseBoardType(post.boardType),
    isNotice: Boolean(post.isNotice),
    isPinned: Boolean(post.isPinned),
    isHidden: Boolean(post.isHidden),
    noticeType: parseNoticeType(post.noticeType),
    noticeTargetBoards: Array.isArray(post.noticeTargetBoards) ? post.noticeTargetBoards.map((board) => parseBoardType(board)) : []
  };

  if (normalized.isHidden) {
    normalized.content = '관리자에 의해 제한된 게시글입니다.';
    normalized.imageUrls = [];
    normalized.imageUrl = null;
  }

  if (normalized.boardType === BOARD_TYPES.ANON) {
    normalized.authorIsBusiness = isAdvertiserAuthor(normalized);
    if (!normalized.authorIsBusiness) {
      normalized.authorNickname = formatAnonymousAuthorNickname(normalized.authorNickname, currentUser);
    }
  } else {
    normalized.authorIsBusiness = isAdvertiserAuthor(normalized);
  }

  return normalized;
}

function isHiddenPost(post) {
  return Boolean(post?.is_hidden || post?.isHidden);
}

function ensurePostAccessible(post, res) {
  if (!isHiddenPost(post)) {
    return true;
  }

  res.status(403).json({ message: '제한된 게시글입니다.' });
  return false;
}

function sanitizeCommentForViewer(comment, post, currentUser) {
  const normalized = {
    ...comment,
    isSecret: Boolean(comment.isSecret),
    isHidden: Boolean(comment.isHidden),
    isDeleted: Boolean(comment.isDeleted)
  };

  normalized.canReply = canReplyToComment(normalized, post, currentUser);
  normalized.canReport = canReportComment(normalized, post, currentUser);

  const isAdminUser = isAdminViewer(currentUser);

  normalized.authorIsBusiness = isAdvertiserAuthor(normalized);

  if ((post.board_type === BOARD_TYPES.ANON || post.boardType === BOARD_TYPES.ANON) && !normalized.authorIsBusiness) {
    normalized.authorNickname = formatAnonymousAuthorNickname(normalized.authorNickname, currentUser);
  }

  if (normalized.isDeleted && !isAdminUser) {
    return stripSecretThreadMetadata({
      ...normalized,
      content: '삭제된 댓글입니다.',
      authorNickname: '알 수 없음'
    });
  }

  if (normalized.isHidden) {
    return stripSecretThreadMetadata({
      ...normalized,
      content: '관리자에 의해 제한된 댓글입니다.'
    });
  }

  if (canViewSecretComment(normalized, post, currentUser)) {
    return stripSecretThreadMetadata(normalized);
  }

  return stripSecretThreadMetadata({
    ...normalized,
    content: '비밀댓글입니다.',
    authorNickname: '비공개'
  });
}

async function listPosts(req, res, next) {
  try {
    const { page, size } = parsePagination(req.query.page, req.query.size);
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const searchType = typeof req.query.search === 'string' ? req.query.search : 'bbs_title';
    const boardType = parseBoardType(req.query.boardType || 'ALL');
    const { rows, total } = await postModel.listPosts(page, size, { keyword, searchType, boardType });
    const normalizedRows = rows.map((item) => sanitizePostForViewer(item, req.user));
    res.json({ content: normalizedRows, totalElements: total, page, size, totalPages: Math.ceil(total / size) });
  } catch (error) {
    next(error);
  }
}

async function listBestPosts(req, res, next) {
  try {
    const result = await postModel.listBestPosts();
    const normalizeRows = (rows = []) => rows.map((item) => sanitizePostForViewer(item, req.user));

    res.json({
      daily: normalizeRows(result.daily),
      weekly: normalizeRows(result.weekly)
    });
  } catch (error) {
    next(error);
  }
}

async function getPost(req, res, next) {
  try {
    const postId = parseId(req.params.id);
    if (!postId) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostById(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (!ensurePostAccessible(post, res)) return;

    await postModel.incrementPostViewCount(postId);

    const postDetail = await postModel.findPostDetailById(postId);
    const comments = annotateSecretThreadOwnerIds(await postModel.listComments(postId));
    const visibleComments = comments.map((comment) => sanitizeCommentForViewer(comment, post, req.user));
    const adjacentPosts = await postModel.findAdjacentPosts(postId);

    const isLiked = req.user
      ? await postModel.isPostLikedByUser(postId, req.user.id)
      : false;

    res.json({
      ...sanitizePostForViewer(postDetail, req.user),
      isLiked,
      comments: visibleComments,
      previousPost: adjacentPosts.previous,
      nextPost: adjacentPosts.next
    });
  } catch (error) {
    next(error);
  }
}

async function toggleLike(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다.' });

    const postId = parseId(req.params.id);
    if (!postId) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostById(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_hidden) return res.status(403).json({ message: '관리자에 의해 제한된 게시글은 추천할 수 없습니다.' });

    const result = await postModel.togglePostLike(postId, req.user.id);

    if (result.isLiked) {
      const likePointResult = await awardPointByAction(req.user.id, 'LIKE_POST');
      let authorPointAwarded = false;

      if (Number(post.user_id) !== Number(req.user.id)) {
        const receivePointResult = await awardPointByAction(post.user_id, 'RECEIVE_POST_LIKE');
        authorPointAwarded = receivePointResult.awarded;
      }

      await postModel.updatePostLikePointAwards(postId, req.user.id, {
        likerPointAwarded: likePointResult.awarded,
        authorPointAwarded
      });
    } else {
      if (result.likerPointAwarded) {
        await revokePointByAction(req.user.id, 'LIKE_POST');
      }

      if (result.authorPointAwarded && Number(post.user_id) !== Number(req.user.id)) {
        await revokePointByAction(post.user_id, 'RECEIVE_POST_LIKE');
      }
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createPost(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다.' });

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });
    if (!String(req.body.boardType || '').trim()) {
      return res.status(400).json({ message: '게시판을 선택해주세요.' });
    }

    const boardType = parseBoardType(req.body.boardType);
    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && boardType === BOARD_TYPES.EVENT) {
      return res.status(403).json({ message: '이벤트게시판은 관리자만 글을 작성할 수 있습니다.' });
    }
    if (!isAdmin && !isBusinessUser(req.user) && boardType === BOARD_TYPES.PROMOTION) {
      return res.status(403).json({ message: '홍보게시판은 광고자 또는 관리자만 글을 작성할 수 있습니다.' });
    }
    if (isBusinessUser(req.user) && boardType !== BOARD_TYPES.PROMOTION) {
      return res.status(403).json({ message: '광고자 계정은 홍보게시판에만 글을 작성할 수 있습니다.' });
    }
    if (boardType === BOARD_TYPES.ATTENDANCE) {
      const existingAttendancePost = await postModel.findUserAttendancePostForCurrentDbDay(req.user.id);
      if (existingAttendancePost) {
        return res.status(409).json({ message: '출석게시판은 하루에 한 번만 글을 작성할 수 있습니다.' });
      }
    }
    const isNotice = isAdmin ? Boolean(req.body.isNotice) : false;
    const noticeType = isNotice ? parseNoticeType(req.body.noticeType) || 'NOTICE' : null;
    const isPinned = isNotice && isAdmin ? Boolean(req.body.isPinned) : false;
    const noticeTargetBoards = isNotice
      ? parseNoticeTargetBoards(req.body.noticeTargetBoards, boardType)
      : [];
    const postId = await postModel.createPost({
      userId: req.user.id,
      title,
      content,
      boardType,
      imageUrls: await resolveImageUrls(req.body),
      isNotice,
      noticeType,
      isPinned,
      noticeTargetBoards
    });
    const post = await postModel.findPostById(postId);
    const createPostPointResult = await awardPointByAction(req.user.id, 'CREATE_POST');
    let reviewBonusAwarded = false;

    if (boardType === BOARD_TYPES.REVIEW) {
      const reviewBonusResult = await awardPointByAction(req.user.id, 'CREATE_REVIEW_BONUS');
      reviewBonusAwarded = reviewBonusResult.awarded;
    }

    await postModel.updatePostPointAwards(postId, {
      createPointAwarded: createPostPointResult.awarded,
      reviewBonusPointAwarded: reviewBonusAwarded
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    next(error);
  }
}

async function updatePost(req, res, next) {
  try {
    const postId = parseId(req.params.id);
    if (!postId) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostById(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (!req.user || (post.user_id !== req.user.id && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }
    if (Boolean(post.is_notice)) {
      return res.status(403).json({ message: '공지글/필독글은 관리자 페이지에서만 수정할 수 있습니다.' });
    }
    const targetBoardType = parseBoardType(post.board_type || post.boardType);
    if (isBusinessUser(req.user) && targetBoardType !== BOARD_TYPES.PROMOTION) {
      return res.status(403).json({ message: '광고자 계정은 홍보게시판 글만 수정할 수 있습니다.' });
    }

    const previousImageUrls = extractImageUrlsFromPost(post);

    const nextImageUrls = await resolveImageUrls(req.body);
    const nextTitle = req.body.title ?? post.title;
    const nextContent = req.body.content ?? post.content;
    const hasPostBodyChanged = String(nextTitle) !== String(post.title)
      || String(nextContent) !== String(post.content);

    if (hasPostBodyChanged) {
      await communityEditLogModel.cleanupExpiredEditLogs();
      await communityEditLogModel.createPostEditLog({
        postId,
        editorUserId: req.user.id,
        previousTitle: post.title,
        previousContent: post.content,
        nextTitle,
        nextContent
      });
    }

    await postModel.updatePost(postId, {
      title: nextTitle,
      content: nextContent,
      imageUrls: nextImageUrls,
      isNotice: req.user.role === 'ADMIN' ? Boolean(req.body.isNotice) : Boolean(post.is_notice),
      noticeType: req.user.role === 'ADMIN'
        ? (Boolean(req.body.isNotice) ? (parseNoticeType(req.body.noticeType) || 'NOTICE') : null)
        : post.notice_type,
      isPinned: req.user.role === 'ADMIN'
        ? (Boolean(req.body.isNotice) && Boolean(req.body.isPinned))
        : Boolean(post.is_pinned),
      noticeTargetBoards: req.user.role === 'ADMIN'
        ? (Boolean(req.body.isNotice)
          ? parseNoticeTargetBoards(req.body.noticeTargetBoards, post.board_type || post.boardType)
          : [])
        : parseNoticeTargetBoards(post.notice_target_boards || post.noticeTargetBoards, post.board_type || post.boardType)
    });

    const removedImageUrls = previousImageUrls.filter((url) => !nextImageUrls.includes(url));
    await deleteS3ObjectsByUrls(removedImageUrls);

    const updated = await postModel.findPostById(postId);
    res.json({ success: true, post: updated });
  } catch (error) {
    next(error);
  }
}

async function deletePost(req, res, next) {
  try {
    const postId = parseId(req.params.id);
    if (!postId) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostByIdIncludingDeleted(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_deleted) return res.status(400).json({ message: '이미 삭제된 게시글입니다.' });
    if (Boolean(post.is_notice)) {
      return res.status(403).json({ message: '공지글/필독글은 관리자 페이지에서만 삭제할 수 있습니다.' });
    }
    if (!req.user || (post.user_id !== req.user.id && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    const likes = await postModel.listPointAwardedLikesByPostId(postId);
    for (const like of likes) {
      if (like.likerPointAwarded) {
        await revokePointByAction(like.userId, 'LIKE_POST');
      }

      if (like.authorPointAwarded && Number(post.user_id) !== Number(like.userId)) {
        await revokePointByAction(post.user_id, 'RECEIVE_POST_LIKE');
      }
    }

    const comments = await postModel.listPointAwardedCommentsByPostId(postId);
    for (const comment of comments) {
      await revokePointByAction(comment.userId, 'CREATE_COMMENT');
    }

    if (post.create_point_awarded) {
      await revokePointByAction(post.user_id, 'CREATE_POST');
    }

    if (post.review_bonus_point_awarded) {
      await revokePointByAction(post.user_id, 'CREATE_REVIEW_BONUS');
    }

    const imageUrls = extractImageUrlsFromPost(post);

    await postModel.deletePostLikesByPostId(postId);
    await postModel.markCommentsDeletedByPostId(postId);
    await postModel.deletePost(postId);

    await deleteS3ObjectsByUrls(imageUrls);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const postId = parseId(req.params.postId);
    if (!postId) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostById(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (!ensurePostAccessible(post, res)) return;

    const comments = annotateSecretThreadOwnerIds(await postModel.listComments(postId));
    const visibleComments = comments.map((comment) => sanitizeCommentForViewer(comment, post, req.user));
    res.json(visibleComments);
  } catch (error) {
    next(error);
  }
}

async function createComment(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다.' });

    const postId = parseId(req.params.postId);
    if (!postId) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostById(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_hidden) return res.status(403).json({ message: '관리자에 의해 제한된 게시글에는 댓글을 작성할 수 없습니다.' });

    const { content, parentId: rawParentId, isSecret } = req.body;
    if (!content) return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });

    const parentId = rawParentId == null ? null : parseId(rawParentId);
    if (rawParentId != null && !parentId) {
      return res.status(400).json({ message: '유효하지 않은 부모 댓글 ID입니다.' });
    }

    let parentComment = null;
    if (parentId) {
      const existingComments = annotateSecretThreadOwnerIds(await postModel.listComments(postId));
      parentComment = existingComments.find((comment) => Number(comment.id) === Number(parentId));
      if (!parentComment) {
        return res.status(400).json({ message: '같은 게시글의 댓글에만 답글을 작성할 수 있습니다.' });
      }

      const normalizedParent = {
        userId: getCommentAuthorId(parentComment),
        isSecret: Boolean(parentComment.isSecret),
        isDeleted: Boolean(parentComment.isDeleted),
        secretThreadOwnerId: getSecretThreadOwnerId(parentComment)
      };

      if (!canReplyToComment(normalizedParent, post, req.user)) {
        return res.status(403).json({ message: '답글 작성 권한이 없습니다.' });
      }
    }

    const secretCommentRequested = Boolean(isSecret);
    const inheritedSecretFromParent = Boolean(parentComment && parentComment.isSecret);
    const shouldCreateSecretComment = secretCommentRequested || inheritedSecretFromParent;

    if (isBusinessUser(req.user) && secretCommentRequested && !inheritedSecretFromParent) {
      return res.status(400).json({ message: '광고자 계정은 비밀댓글을 사용할 수 없습니다.' });
    }

    const commentId = await postModel.createComment({
      postId,
      userId: req.user.id,
      content,
      parentId,
      isSecret: shouldCreateSecretComment
    });
    const pointResult = await awardPointByAction(req.user.id, 'CREATE_COMMENT');
    await postModel.updateCommentPointAwarded(commentId, pointResult.awarded);

    const comments = annotateSecretThreadOwnerIds(await postModel.listComments(postId));
    const visibleComments = comments.map((comment) => sanitizeCommentForViewer(comment, post, req.user));
    res.status(201).json({ success: true, comments: visibleComments });
  } catch (error) {
    next(error);
  }
}


async function updateComment(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다.' });

    const commentId = parseId(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(commentId);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

    if (comment.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }

    if (comment.is_deleted) {
      return res.status(400).json({ message: '삭제된 댓글은 수정할 수 없습니다.' });
    }

    if (comment.is_hidden) {
      return res.status(400).json({ message: '관리자에 의해 제한된 댓글은 수정할 수 없습니다.' });
    }

    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });

    if (String(comment.content || '') !== content) {
      await communityEditLogModel.cleanupExpiredEditLogs();
      await communityEditLogModel.createCommentEditLog({
        commentId,
        editorUserId: req.user.id,
        previousContent: comment.content,
        nextContent: content
      });
    }

    await postModel.updateComment(commentId, content);
    const post = await postModel.findPostById(comment.post_id);
    const comments = annotateSecretThreadOwnerIds(await postModel.listComments(comment.post_id));
    const visibleComments = comments.map((item) => sanitizeCommentForViewer(item, post, req.user));
    res.json({ success: true, comments: visibleComments });
  } catch (error) {
    next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다.' });

    const commentId = parseId(req.params.commentId);
    if (!commentId) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(commentId);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });

    if (comment.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    if (comment.is_deleted) {
      return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });
    }

    if (comment.point_awarded) {
      await revokePointByAction(comment.user_id, 'CREATE_COMMENT');
      await postModel.updateCommentPointAwarded(commentId, false);
    }

    await postModel.deleteComment(commentId);
    const post = await postModel.findPostById(comment.post_id);
    const comments = annotateSecretThreadOwnerIds(await postModel.listComments(comment.post_id));
    const visibleComments = comments.map((item) => sanitizeCommentForViewer(item, post, req.user));
    res.json({ success: true, comments: visibleComments });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPosts,
  listBestPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  listComments,
  createComment,
  updateComment,
  deleteComment
};
