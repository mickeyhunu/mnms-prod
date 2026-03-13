/**
 * 파일 역할: authController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const crypto = require('crypto');
const { createUser, findByEmail, findByNickname } = require('../models/userModel');
const { createSession, deleteSession } = require('../models/sessionModel');
const { awardPointByAction } = require('../models/pointModel');
const { pickUserRow } = require('../utils/response');

async function register(req, res, next) {
  try {
    const { loginId, email, password, nickname } = req.body;
    const resolvedLoginId = (loginId || email || '').trim();
    if (!resolvedLoginId || !password || !nickname) {
      return res.status(400).json({ message: '아이디, 비밀번호, 닉네임은 필수입니다.' });
    }

    if (await findByEmail(resolvedLoginId)) {
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }
    if (await findByNickname(nickname.trim())) {
      return res.status(400).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const userId = await createUser({ email: resolvedLoginId, password, nickname: nickname.trim() });
    await awardPointByAction(userId, 'REGISTER');

    const user = await findByEmail(resolvedLoginId);
    res.json({ success: true, message: '회원가입이 완료되었습니다.', user: pickUserRow({ ...user, id: userId }) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { loginId, email, password } = req.body;
    const resolvedLoginId = (loginId || email || '').trim();
    const user = await findByEmail(resolvedLoginId);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await createSession(token, user.id);
    await awardPointByAction(user.id, 'LOGIN_DAILY');

    const refreshedUser = await findByEmail(resolvedLoginId);
    res.json({ success: true, token, ...pickUserRow(refreshedUser || user) });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json(pickUserRow(req.user));
}

async function logout(req, res, next) {
  try {
    await deleteSession(req.token);
    res.json({ success: true, message: '로그아웃되었습니다.' });
  } catch (error) {
    next(error);
  }
}

async function checkNickname(req, res, next) {
  try {
    const nickname = (req.query.nickname || '').trim();
    if (nickname.length < 2) {
      return res.status(400).json({ message: '닉네임은 2글자 이상이어야 합니다.' });
    }

    const exists = await findByNickname(nickname);
    res.json({ available: !exists });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, me, logout, checkNickname };
