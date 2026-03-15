/**
 * 파일 역할: 관리자 전용 API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const postModel = require('../models/postModel');
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

router.get('/support', supportController.listAdminArticles);
router.post('/support', supportController.createArticle);
router.put('/support/:id', supportController.updateArticle);
router.delete('/support/:id', supportController.deleteArticle);

module.exports = router;
