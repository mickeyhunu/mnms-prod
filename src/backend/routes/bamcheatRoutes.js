/**
 * 파일 역할: 기업회원 전용 밤치트 API 라우트를 정의하는 라우터 파일.
 */
const express = require('express');
const { optionalAuthMiddleware } = require('../middlewares/authMiddleware');
const {
  requireBamcheatAccess,
  requireBamcheatAuthenticatedUser,
  searchBamcheatComments,
  createBamcheatComment,
  recommendBamcheatComment,
  deleteBamcheatComment
} = require('../controllers/bamcheatController');

const router = express.Router();

router.use(optionalAuthMiddleware, requireBamcheatAccess);
router.get('/comments', searchBamcheatComments);
router.post('/comments', requireBamcheatAuthenticatedUser, createBamcheatComment);
router.post('/comments/:commentId/recommend', requireBamcheatAuthenticatedUser, recommendBamcheatComment);
router.delete('/comments/:commentId', requireBamcheatAuthenticatedUser, deleteBamcheatComment);

module.exports = router;
