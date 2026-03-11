/**
 * 파일 역할: postController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const postModel = require('../models/postModel');

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


function canViewSecretComment(comment, post, currentUser) {
  if (!comment.isSecret) {
    return true;
  }

  if (!currentUser) {
    return false;
  }

  return Number(currentUser.id) === Number(comment.userId)
    || Number(currentUser.id) === Number(post.user_id)
    || currentUser.role === 'ADMIN';
}

function sanitizeCommentForViewer(comment, post, currentUser) {
  const normalized = {
    ...comment,
    isSecret: Boolean(comment.isSecret),
    isDeleted: Boolean(comment.isDeleted)
  };

  if (normalized.isDeleted) {
    return {
      ...normalized,
      content: '삭제된 댓글입니다.',
      authorNickname: '알 수 없음'
    };
  }

  if (canViewSecretComment(normalized, post, currentUser)) {
    return normalized;
  }

  return {
    ...normalized,
    content: '비밀댓글입니다.',
    authorNickname: '비공개'
  };
}

async function listPosts(req, res, next) {
  try {
    const { page, size } = parsePagination(req.query.page, req.query.size);
    const { rows, total } = await postModel.listPosts(page, size);
    res.json({ content: rows, totalElements: total, page, size, totalPages: Math.ceil(total / size) });
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

    await postModel.incrementPostViewCount(postId);

    const postDetail = await postModel.findPostDetailById(postId);
    const comments = await postModel.listComments(postId);
    const visibleComments = comments.map((comment) => sanitizeCommentForViewer(comment, post, req.user));

    const isLiked = req.user
      ? await postModel.isPostLikedByUser(postId, req.user.id)
      : false;

    res.json({ ...postDetail, isLiked, comments: visibleComments });
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

    const result = await postModel.togglePostLike(postId, req.user.id);
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

    const postId = await postModel.createPost({ userId: req.user.id, title, content });
    const post = await postModel.findPostById(postId);
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

    await postModel.updatePost(postId, {
      title: req.body.title ?? post.title,
      content: req.body.content ?? post.content
    });

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

    const post = await postModel.findPostById(postId);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (!req.user || (post.user_id !== req.user.id && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    await postModel.deletePost(postId);
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

    const comments = await postModel.listComments(postId);
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

    const { content, parentId: rawParentId, isSecret } = req.body;
    if (!content) return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });

    const parentId = rawParentId == null ? null : parseId(rawParentId);
    if (rawParentId != null && !parentId) {
      return res.status(400).json({ message: '유효하지 않은 부모 댓글 ID입니다.' });
    }

    if (parentId) {
      const parentComment = await postModel.findCommentById(parentId);
      if (!parentComment || Number(parentComment.post_id) !== Number(postId)) {
        return res.status(400).json({ message: '같은 게시글의 댓글에만 답글을 작성할 수 있습니다.' });
      }
    }

    await postModel.createComment({
      postId,
      userId: req.user.id,
      content,
      parentId,
      isSecret: Boolean(isSecret)
    });
    const comments = await postModel.listComments(postId);
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

    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });

    await postModel.updateComment(commentId, content);
    const post = await postModel.findPostById(comment.post_id);
    const comments = await postModel.listComments(comment.post_id);
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

    await postModel.deleteComment(commentId);
    const post = await postModel.findPostById(comment.post_id);
    const comments = await postModel.listComments(comment.post_id);
    const visibleComments = comments.map((item) => sanitizeCommentForViewer(item, post, req.user));
    res.json({ success: true, comments: visibleComments });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPosts,
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
