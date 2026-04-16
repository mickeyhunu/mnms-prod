/**
 * 파일 역할: authController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const { createUser, findByEmail, findByNickname, recordUserLoginHistory } = require('../models/userModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');
const { recordAuthEvent } = require('../models/authEventModel');
const { recordLoginAttemptResult } = require('../middlewares/loginRateLimitMiddleware');
const { signAuthToken, DEFAULT_EXPIRES_IN } = require('../utils/jwt');
const { validateNickname } = require('../utils/nicknamePolicy');

function normalizeAccountType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'BUSINESS' ? 'BUSINESS' : 'MEMBER';
}

function resolveRoleByAccountType(accountType) {
  return accountType === 'BUSINESS' ? 'BUSINESS' : 'MEMBER';
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
const { createSession, deleteSession } = require('../models/sessionModel');
const { awardPointByAction } = require('../models/pointModel');
const { pickUserRow } = require('../utils/response');

async function register(req, res, next) {
  try {
    const { loginId, email, password, nickname } = req.body;
    const accountType = normalizeAccountType(req.body.accountType || req.body.memberType);
    const resolvedLoginId = (loginId || email || '').trim();
    if (!resolvedLoginId || !password || !nickname) {
      return res.status(400).json({ message: '아이디, 비밀번호, 닉네임은 필수입니다.' });
    }

    const normalizedNickname = String(nickname || '').trim();
    const nicknameValidation = validateNickname(normalizedNickname);
    if (!nicknameValidation.valid) {
      return res.status(400).json({ message: nicknameValidation.message });
    }

    if (await findByEmail(resolvedLoginId)) {
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }
    if (await findByNickname(normalizedNickname)) {
      return res.status(400).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const role = resolveRoleByAccountType(accountType);
    const userId = await createUser({ email: resolvedLoginId, password, nickname: normalizedNickname, role, memberType: accountType });
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
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;
    const user = await findByEmail(resolvedLoginId);
    if (!user || user.password !== password) {
      recordLoginAttemptResult(req, { success: false });
      await recordAuthEvent({
        eventType: 'LOGIN_FAIL',
        reason: 'INVALID_CREDENTIAL',
        userId: user?.id || null,
        loginId: resolvedLoginId,
        ipAddress,
        userAgent
      });
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      recordLoginAttemptResult(req, { success: false });
      await recordAuthEvent({
        eventType: 'LOGIN_BLOCKED',
        reason: 'ACCOUNT_RESTRICTED',
        userId: user.id,
        loginId: resolvedLoginId,
        ipAddress,
        userAgent
      });
      return res.status(403).json({ message: formatRestrictionMessage(user) });
    }

    const token = signAuthToken(user);
    await createSession(token, user.id);
    await recordUserLoginHistory(user.id, {
      ipAddress,
      userAgent
    });
    recordLoginAttemptResult(req, { success: true });
    await recordAuthEvent({
      eventType: 'LOGIN_SUCCESS',
      reason: 'OK',
      userId: user.id,
      loginId: resolvedLoginId,
      ipAddress,
      userAgent
    });
    await awardPointByAction(user.id, 'LOGIN_DAILY');

    const refreshedUser = await findByEmail(resolvedLoginId);
    res.json({ success: true, token, tokenExpiresIn: DEFAULT_EXPIRES_IN, ...pickUserRow(refreshedUser || user) });
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
    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
      return res.status(400).json({ message: nicknameValidation.message });
    }

    const exists = await findByNickname(nickname);
    res.json({ available: !exists });
  } catch (error) {
    next(error);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHiddenInput(name, value) {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
}

function generateOrderNumber() {
  return `MNMS_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function resolveReturnUrl(req) {
  const configuredReturnUrl = String(process.env.KCP_RETURN_URL || '').trim();
  if (configuredReturnUrl) {
    return configuredReturnUrl;
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.get('host');
  return `${protocol}://${host}/kcp/callback`;
}

async function requestIdentityVerification(req, res) {
  const kcpRequestUrl = String(process.env.KCP_REQUEST_URL || '').trim();
  const siteCode = String(process.env.KCP_SITE_CODE || '').trim();

  if (!kcpRequestUrl || !siteCode) {
    return res.status(500).json({
      message: 'KCP 연동 환경변수(KCP_REQUEST_URL, KCP_SITE_CODE)가 설정되지 않았습니다.'
    });
  }

  const requestPayload = {
    req_tx: String(req.body.req_tx || 'cert').trim() || 'cert',
    site_cd: siteCode,
    ordr_idxx: String(req.body.ordr_idxx || generateOrderNumber()).trim(),
    Ret_URL: String(req.body.Ret_URL || resolveReturnUrl(req)).trim(),
    cert_method: String(req.body.cert_method || '01').trim(),
    cert_otp_use: String(req.body.cert_otp_use || 'Y').trim(),
    user_name: String(req.body.user_name || '').trim(),
    phone_no: String(req.body.phone_no || '').trim(),
    user_birth: String(req.body.user_birth || '').trim(),
    user_sex: String(req.body.user_sex || '').trim(),
    user_ci: String(req.body.user_ci || '').trim()
  };

  const hiddenInputs = Object.entries(requestPayload)
    .map(([name, value]) => buildHiddenInput(name, value))
    .join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KCP 본인인증 요청</title>
</head>
<body>
  <form id="kcp-request-form" method="post" action="${escapeHtml(kcpRequestUrl)}">
    ${hiddenInputs}
  </form>
  <script>
    document.getElementById('kcp-request-form').submit();
  </script>
</body>
</html>`);
}

module.exports = { register, login, me, logout, checkNickname, requestIdentityVerification };
