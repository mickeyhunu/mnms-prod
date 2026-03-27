/**
 * 파일 역할: authController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const crypto = require('crypto');
const { createUser, findByEmail, findByNickname, findByKakaoId, attachKakaoIdToUser, recordUserLoginHistory } = require('../models/userModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');

function normalizeMemberType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'ADVERTISER' ? 'ADVERTISER' : 'GENERAL';
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length) {
    return String(forwardedFor[0] || '').split(',')[0].trim();
  }

  return req.socket?.remoteAddress || req.ip || 'unknown';
}
const { createSession, deleteSession } = require('../models/sessionModel');
const { awardPointByAction } = require('../models/pointModel');
const { pickUserRow } = require('../utils/response');
const { issueJwt } = require('../utils/jwt');
const AUTH_COOKIE_NAME = String(process.env.AUTH_COOKIE_NAME || 'mnms_auth').trim() || 'mnms_auth';

function getAuthCookieOptions() {
  const maxAgeSecondsRaw = Number(process.env.AUTH_COOKIE_MAX_AGE_SECONDS);
  const maxAgeSeconds = Number.isFinite(maxAgeSecondsRaw) && maxAgeSecondsRaw > 0
    ? Math.floor(maxAgeSecondsRaw)
    : 60 * 60 * 24 * 7;
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: maxAgeSeconds * 1000
  };
}

function appendSetCookie(res, value, options = {}) {
  const attributes = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    `SameSite=${options.sameSite || 'Lax'}`,
    options.httpOnly ? 'HttpOnly' : null,
    options.secure ? 'Secure' : null,
    Number.isFinite(options.maxAge) ? `Max-Age=${Math.max(0, Math.floor(options.maxAge / 1000))}` : null
  ].filter(Boolean);
  res.append('Set-Cookie', attributes.join('; '));
}

function setAuthCookie(res, token) {
  appendSetCookie(res, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  appendSetCookie(res, '', {
    ...getAuthCookieOptions(),
    maxAge: 0
  });
}

async function register(req, res, next) {
  try {
    const { loginId, email, password, nickname } = req.body;
    const memberType = normalizeMemberType(req.body.memberType);
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

    const userId = await createUser({ email: resolvedLoginId, password, nickname: nickname.trim(), memberType });
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

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      return res.status(403).json({ message: formatRestrictionMessage(user) });
    }

    const token = issueJwt({ sub: String(user.id), type: 'access' });
    await createSession(token, user.id);
    setAuthCookie(res, token);
    await recordUserLoginHistory(user.id, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null
    });
    await awardPointByAction(user.id, 'LOGIN_DAILY');

    const refreshedUser = await findByEmail(resolvedLoginId);
    res.json({ success: true, token, ...pickUserRow(refreshedUser || user) });
  } catch (error) {
    next(error);
  }
}

async function fetchKakaoUserInfo(accessToken) {
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.msg || payload?.error_description || '카카오 사용자 정보 조회에 실패했습니다.';
    const error = new Error(message);
    error.statusCode = 401;
    throw error;
  }

  return payload;
}

function sanitizeKakaoNickname(profileNickname, kakaoId) {
  const fallbackNickname = `kakao_${String(kakaoId || '').slice(-6) || 'user'}`;
  return String(profileNickname || fallbackNickname).trim().slice(0, 30) || fallbackNickname;
}

async function createUniqueNickname(baseNickname) {
  let nickname = baseNickname;
  let suffix = 0;
  while (await findByNickname(nickname)) {
    suffix += 1;
    nickname = `${baseNickname}_${suffix}`.slice(0, 30);
  }
  return nickname;
}

function buildKakaoPlaceholderEmail(kakaoId) {
  return `kakao_${kakaoId}@kakao.local`;
}

async function kakaoLogin(req, res, next) {
  try {
    const accessToken = String(req.body.accessToken || '').trim();
    if (!accessToken) {
      return res.status(400).json({ message: '카카오 액세스 토큰이 필요합니다.' });
    }

    const kakaoUser = await fetchKakaoUserInfo(accessToken);
    const kakaoId = String(kakaoUser.id || '').trim();
    if (!kakaoId) {
      return res.status(401).json({ message: '카카오 사용자 식별값을 확인할 수 없습니다.' });
    }

    let user = await findByKakaoId(kakaoId);

    if (!user) {
      const kakaoAccount = kakaoUser.kakao_account || {};
      const kakaoEmail = String(kakaoAccount.email || '').trim();
      const email = kakaoEmail || buildKakaoPlaceholderEmail(kakaoId);
      const nicknameCandidate = sanitizeKakaoNickname(kakaoAccount.profile?.nickname, kakaoId);
      const existingEmailUser = kakaoEmail ? await findByEmail(kakaoEmail) : null;

      if (existingEmailUser) {
        user = await attachKakaoIdToUser(existingEmailUser.id, kakaoId);
      } else {
        const nickname = await createUniqueNickname(nicknameCandidate);
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const userId = await createUser({
          email,
          password: randomPassword,
          nickname,
          memberType: 'GENERAL',
          kakaoId
        });
        await awardPointByAction(userId, 'REGISTER');
        user = await findByKakaoId(kakaoId);
      }
    }

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      return res.status(403).json({ message: formatRestrictionMessage(user) });
    }

    const token = issueJwt({ sub: String(user.id), type: 'access' });
    await createSession(token, user.id);
    setAuthCookie(res, token);
    await recordUserLoginHistory(user.id, {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null
    });
    await awardPointByAction(user.id, 'LOGIN_DAILY');

    const refreshedUser = await findByKakaoId(kakaoId);
    return res.json({ success: true, token, ...pickUserRow(refreshedUser || user) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

async function me(req, res) {
  res.json(pickUserRow(req.user));
}

async function logout(req, res, next) {
  try {
    await deleteSession(req.token);
    clearAuthCookie(res);
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

function kakaoCallback(req, res) {
  const { code, state, error, error_description: errorDescription } = req.query;

  res.json({
    success: !error,
    message: error
      ? '카카오 로그인 콜백에서 오류가 전달되었습니다.'
      : '카카오 로그인 콜백 데이터를 수신했습니다.',
    provider: 'kakao',
    receivedAt: new Date().toISOString(),
    data: {
      code: code || null,
      state: state || null,
      error: error || null,
      errorDescription: errorDescription || null,
      rawQuery: req.query
    }
  });
}

module.exports = { register, login, kakaoLogin, me, logout, checkNickname, kakaoCallback };
