/**
 * 파일 역할: 관리자 전용 API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const postModel = require('../models/postModel');
const adminModel = require('../models/adminModel');
const supportController = require('../controllers/supportController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/posts', async (req, res, next) => {
  try {
    const { rows, total } = await postModel.listPosts(0, 200, { boardType: 'ALL' });
    res.json({ content: rows, totalElements: total });
  } catch (error) {
    next(error);
  }
});

router.get('/comments', async (req, res, next) => {
  try {
    const rows = await postModel.listAllCommentsForAdmin();
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostByIdIncludingDeleted(id);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_deleted) return res.status(400).json({ message: '이미 삭제된 게시글입니다.' });

    await postModel.deletePost(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(id);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.is_deleted) return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });

    await postModel.deleteComment(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const rows = await adminModel.listUsers();
    const content = rows.map((user) => ({
      ...user,
      isCurrentUser: Number(user.id) === Number(req.user.id)
    }));
    res.json({ content, totalElements: content.length });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const role = String(req.body?.role || '').toUpperCase();
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ message: '유효하지 않은 권한입니다.' });

    const target = await adminModel.findUserById(id);
    if (!target) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    await adminModel.updateUserRole(id, role);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (id === Number(req.user.id)) return res.status(400).json({ message: '현재 로그인한 계정은 삭제할 수 없습니다.' });

    const target = await adminModel.findUserById(id);
    if (!target) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    await adminModel.deleteUser(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/ads', async (req, res, next) => {
  try {
    const rows = await adminModel.listAds();
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

router.post('/ads', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    const insertId = await adminModel.createAd({ title, imageUrl, linkUrl, displayOrder, isActive });
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

router.put('/ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findAdById(id);
    if (!target) return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });

    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    await adminModel.updateAd(id, { title, imageUrl, linkUrl, displayOrder, isActive });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findAdById(id);
    if (!target) return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });

    await adminModel.deleteAd(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/support', supportController.listAdminArticles);
router.post('/support', supportController.createArticle);
router.put('/support/:id', supportController.updateArticle);
router.delete('/support/:id', supportController.deleteArticle);

module.exports = router;
