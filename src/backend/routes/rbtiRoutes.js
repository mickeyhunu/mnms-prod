/**
 * 파일 역할: RBTI 질문 API 엔드포인트를 매핑하는 라우트 파일.
 */
const express = require('express');
const rbtiController = require('../controllers/rbtiController');

const router = express.Router();

router.get('/questions', rbtiController.getQuestions);

module.exports = router;
