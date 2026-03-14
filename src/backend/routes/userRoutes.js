/**
 * 파일 역할: user 관련 API 라우트를 정의하는 라우터 파일.
 */
const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { myStats, myPointHistories, myActivity, updateMyProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/me/stats', authMiddleware, myStats);
router.get('/me/points', authMiddleware, myPointHistories);
router.get('/me/activity', authMiddleware, myActivity);
router.put('/me', authMiddleware, updateMyProfile);

module.exports = router;
