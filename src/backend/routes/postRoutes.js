/**
 * 파일 역할: postRoutes API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const controller = require('../controllers/postController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuthMiddleware, controller.listPosts);
router.get('/best', optionalAuthMiddleware, controller.listBestPosts);
router.get('/search-signal', optionalAuthMiddleware, controller.searchPostsBySignal);
router.get('/slug/:slug', optionalAuthMiddleware, controller.getPost);
router.get('/:id', optionalAuthMiddleware, controller.getPost);
router.post('/', authMiddleware, controller.createPost);
router.put('/:id', authMiddleware, controller.updatePost);
router.delete('/:id', authMiddleware, controller.deletePost);
router.post('/:id/like', authMiddleware, controller.toggleLike);
router.post('/:id/piece-participants', authMiddleware, controller.joinPiece);
router.delete('/:id/piece-participants/me', authMiddleware, controller.cancelPieceJoin);
router.post('/:id/piece-participants/:userId/attendance', authMiddleware, controller.checkPieceAttendance);
router.get('/:postId/comments', optionalAuthMiddleware, controller.listComments);
router.post('/:postId/comments', authMiddleware, controller.createComment);
router.put('/comments/:commentId', authMiddleware, controller.updateComment);
router.delete('/comments/:commentId', authMiddleware, controller.deleteComment);

module.exports = router;
