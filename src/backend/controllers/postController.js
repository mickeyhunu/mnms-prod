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
    const comments = await postModel.listComments(postId);
    res.json({ ...post, comments });
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
    res.json(comments);
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

    const { content } = req.body;
    if (!content) return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });

    await postModel.createComment({ postId, userId: req.user.id, content });
    const comments = await postModel.listComments(postId);
    res.status(201).json({ success: true, comments });
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
  listComments,
  createComment
};
