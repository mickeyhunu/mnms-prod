/**
 * 파일 역할: authMiddleware 요청 전처리/인증 검증을 수행하는 미들웨어 파일.
 */
const { findById } = require('../models/userModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');
const { verifyAccessToken } = require('../utils/jwt');

async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (_error) {
      return res.status(401).json({ message: '토큰이 유효하지 않거나 만료되었습니다.' });
    }

    const userId = Number(payload.sub || 0);
    const user = Number.isFinite(userId) && userId > 0 ? await findById(userId) : null;
    if (!user) return res.status(401).json({ message: '세션이 유효하지 않습니다.' });

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      return res.status(403).json({ message: formatRestrictionMessage(user) });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
}

function optionalAuthMiddleware(req, _res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    req.user = null;
    return next();
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (_error) {
    req.user = null;
    return next();
  }

  const userId = Number(payload.sub || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    req.user = null;
    return next();
  }

  findById(userId)
    .then((user) => {
      req.user = user || null;
      next();
    })
    .catch(next);
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware };
