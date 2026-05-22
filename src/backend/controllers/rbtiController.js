/**
 * 파일 역할: RBTI 질문/설정 데이터를 반환하는 컨트롤러 파일.
 */
const fs = require('fs/promises');
const path = require('path');

const QUESTIONS_CONFIG_PATH = path.join(__dirname, '..', 'config', 'questions.json');

async function getQuestions(req, res, next) {
  try {
    const raw = await fs.readFile(QUESTIONS_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return res.json(parsed);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getQuestions
};
