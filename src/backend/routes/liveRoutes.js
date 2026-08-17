/**
 * 파일 역할: LIVE 페이지 전용 공개 API 엔드포인트를 매핑하는 라우트 파일.
 */
const express = require('express');
const liveController = require('../controllers/liveController');
const attendanceCommentModel = require('../models/attendanceCommentModel');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/filters', liveController.getLiveFilters);
router.get('/entries', liveController.getLiveEntries);
router.get('/signal', liveController.getLiveSignal);
router.get('/ads', liveController.getLiveAds);
router.get('/top-ads', liveController.getTopAds);
router.get('/business-ads/areas', liveController.getBusinessAdAreas);
router.get('/business-ads/piece-areas', liveController.getPieceBusinessAdAreas);
router.post('/business-ads/:id/view', liveController.recordBusinessAdView);
router.get('/business-ads/:id', liveController.getBusinessAd);
router.get('/business-ads', liveController.getBusinessAds);

function parseCommentTarget(req, res) {
  const storeNo = Number.parseInt(req.query.storeNo || req.body?.storeNo, 10);
  const workerName = String(req.query.workerName || req.body?.workerName || '').trim();
  if (!Number.isInteger(storeNo) || storeNo <= 0 || !workerName || workerName.length > 100) {
    res.status(400).json({ message: '출근자 정보를 확인해주세요.' });
    return null;
  }
  return { storeNo, workerName };
}

router.get('/attendance-comments', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const target = parseCommentTarget(req, res);
    if (!target) return;
    res.json({ content: await attendanceCommentModel.listPublic(target.storeNo, target.workerName) });
  } catch (error) { next(error); }
});

router.post('/attendance-comments', authMiddleware, async (req, res, next) => {
  try {
    const target = parseCommentTarget(req, res);
    if (!target) return;
    const content = String(req.body?.content || '').trim();
    if (!content || content.length > 500) return res.status(400).json({ message: '코멘트는 1~500자로 입력해주세요.' });
    res.status(201).json(await attendanceCommentModel.create({ ...target, userId: req.user.id, content }));
  } catch (error) { next(error); }
});

router.post('/attendance-comments/:id/report', authMiddleware, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '코멘트 정보를 확인해주세요.' });
    const reported = await attendanceCommentModel.report(id, req.user.id);
    if (!reported) return res.status(404).json({ message: '코멘트를 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (error) { next(error); }
});

module.exports = router;
