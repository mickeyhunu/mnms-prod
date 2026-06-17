/**
 * 파일 역할: 월간 일반회원 랭킹 API 엔드포인트를 제공하는 라우트 파일.
 */
const express = require('express');
const rankingModel = require('../models/rankingModel');

const router = express.Router();

router.get('/monthly', async (req, res, next) => {
  try {
    const data = await rankingModel.getMonthlyRankings({ limit: req.query.limit });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
