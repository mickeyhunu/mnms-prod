/** 홈에 노출할 활성 포스터를 제공한다. */
const express = require('express');
const posterModel = require('../models/posterModel');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json({ content: await posterModel.list({ activeOnly: true }) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
