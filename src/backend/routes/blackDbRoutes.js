/**
 * 파일 역할: 기업회원 전용 밤치트 API 라우트를 정의하는 라우터 파일.
 */
const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  requireBusinessUser,
  searchBlackDbComments,
  createBlackDbComment,
  recommendBlackDbComment,
  deleteBlackDbComment
} = require('../controllers/blackDbController');

const router = express.Router();

router.use(authMiddleware, requireBusinessUser);
router.get('/comments', searchBlackDbComments);
router.post('/comments', createBlackDbComment);
router.post('/comments/:commentId/recommend', recommendBlackDbComment);
router.delete('/comments/:commentId', deleteBlackDbComment);

module.exports = router;
