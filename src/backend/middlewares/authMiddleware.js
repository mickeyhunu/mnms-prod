/**
 * 파일 역할: authMiddleware 요청 전처리/인증 검증을 수행하는 미들웨어 파일.
 */
const { findUserByToken, deleteSessionsByUserId } = require('../models/sessionModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');
const AUTH_COOKIE_NAME = String(process.env.AUTH_COOKIE_NAME || 'mnms_auth').trim() || 'mnms_auth';

function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) return acc;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function resolveToken(req) {
  const auth = req.headers.authorization || '';
  const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (bearerToken) return bearerToken;

  const cookies = parseCookies(req.headers.cookie);
  return String(cookies[AUTH_COOKIE_NAME] || '').trim();
}

async function authMiddleware(req, res, next) {
  try {
    const token = resolveToken(req);
    if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });

    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ message: '세션이 유효하지 않습니다.' });

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      await deleteSessionsByUserId(user.id);
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
  const token = resolveToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  findUserByToken(token)
    .then((user) => {
      req.user = user;
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
