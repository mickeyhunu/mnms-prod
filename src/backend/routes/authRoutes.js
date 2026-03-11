/**
 * 파일 역할: authRoutes API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const controller = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/check-nickname', controller.checkNickname);
router.post('/logout', authMiddleware, controller.logout);
router.get('/me', authMiddleware, controller.me);

module.exports = router;
