/**
 * 파일 역할: user 관련 API 라우트를 정의하는 라우터 파일.
 */
const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  myStats,
  myPointHistories,
  myActivity,
  myNotifications,
  markMyNotificationsRead,
  markMyNotificationsReadAll,
  myReadPosts,
  markMyPostsRead,
  updateMyProfile
} = require('../controllers/userController');

const router = express.Router();

router.get('/me/stats', authMiddleware, myStats);
router.get('/me/points', authMiddleware, myPointHistories);
router.get('/me/activity', authMiddleware, myActivity);
router.get('/me/notifications', authMiddleware, myNotifications);
router.post('/me/notifications/read', authMiddleware, markMyNotificationsRead);
router.post('/me/notifications/read-all', authMiddleware, markMyNotificationsReadAll);
router.get('/me/posts/read', authMiddleware, myReadPosts);
router.post('/me/posts/read', authMiddleware, markMyPostsRead);
router.put('/me', authMiddleware, updateMyProfile);

module.exports = router;
