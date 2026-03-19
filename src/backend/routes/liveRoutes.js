/**
 * 파일 역할: LIVE 페이지 전용 공개 API 엔드포인트를 매핑하는 라우트 파일.
 */
const express = require('express');
const liveController = require('../controllers/liveController');

const router = express.Router();

router.get('/filters', liveController.getLiveFilters);
router.get('/entries', liveController.getLiveEntries);

module.exports = router;
