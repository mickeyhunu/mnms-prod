/**
 * 파일 역할: 룸빵위키 용어 질문 댓글 API 엔드포인트를 제공하는 라우트 파일.
 */
const express = require('express');
const wikiQuestionModel = require('../models/wikiQuestionModel');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isAdmin(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

router.get('/questions', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const questions = await wikiQuestionModel.listQuestions({ includeReviewed: isAdmin(req.user) });
    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

router.post('/questions', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const term = sanitizeText(req.body?.term, 80);
    const content = sanitizeText(req.body?.content, 500);

    if (!term) return res.status(400).json({ message: '궁금한 용어를 입력해주세요.' });
    if (!content) return res.status(400).json({ message: '질문 내용을 입력해주세요.' });

    const question = await wikiQuestionModel.createQuestion({
      userId: req.user?.id || null,
      authorNickname: req.user?.nickname || '익명',
      term,
      content
    });
    res.status(201).json({ question });
  } catch (error) {
    next(error);
  }
});

router.put('/questions/:id/added', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 질문 ID입니다.' });
    const updated = await wikiQuestionModel.markQuestionAdded(id, req.user.id);
    if (!updated) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/questions/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 질문 ID입니다.' });
    const deleted = await wikiQuestionModel.deleteQuestion(id);
    if (!deleted) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
