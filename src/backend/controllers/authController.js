/**
 * 파일 역할: authController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const {
  createUser,
  findById,
  findByEmail,
  findByNickname,
  recordUserLoginHistory,
  updateUserProfile
} = require('../models/userModel');
const {
  hashIdentityValue,
  findUserByIdentityHashes,
  isIdentityVerificationIdUsed,
  markIdentityVerificationUsed,
  findActiveSignupRestriction
} = require('../models/identityPolicyModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');
const { recordAuthEvent } = require('../models/authEventModel');
const { recordLoginAttemptResult } = require('../middlewares/loginRateLimitMiddleware');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  parseExpiresInToSeconds
} = require('../utils/jwt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateNickname } = require('../utils/nicknamePolicy');
const { validateLoginId, validatePassword } = require('../utils/authPolicy');
const { hashPassword, verifyPassword, isHashedPassword } = require('../utils/passwordHasher');

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

const IDENTITY_REUSE_WINDOW_MS = 3 * 60 * 1000;
const REGISTER_IP_WINDOW_MS = 5 * 60 * 1000;
const REGISTER_IP_MAX_ATTEMPTS = 5;
const identityReuseStore = new Map();
const registerIpStore = new Map();

function cleanupMapByWindow(store, windowMs, now = Date.now()) {
  for (const [key, value] of store.entries()) {
    if (!value) {
      store.delete(key);
      continue;
    }
    const lastAt = Number(value.lastAt || value.firstAt || 0);
    if (!lastAt || now - lastAt > windowMs) {
      store.delete(key);
    }
  }
}

function normalizeBirthDateToIso(value) {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  if (digitsOnly.length !== 8) return '';
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
}

function calculateInternationalAge(birthDateIso, referenceDate = new Date()) {
  if (!birthDateIso) return -1;
  const birthDate = new Date(`${birthDateIso}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return -1;

  const current = new Date(referenceDate);
  let age = current.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasBirthdayPassed = (
    current.getUTCMonth() > birthDate.getUTCMonth()
    || (current.getUTCMonth() === birthDate.getUTCMonth() && current.getUTCDate() >= birthDate.getUTCDate())
  );
  if (!hasBirthdayPassed) age -= 1;
  return age;
}

function registerIdentityUsageAttempt({ identityVerificationId, ipAddress }) {
  const now = Date.now();
  cleanupMapByWindow(identityReuseStore, IDENTITY_REUSE_WINDOW_MS, now);
  cleanupMapByWindow(registerIpStore, REGISTER_IP_WINDOW_MS, now);

  const normalizedIdentityId = String(identityVerificationId || '').trim();
  if (normalizedIdentityId) {
    const prev = identityReuseStore.get(normalizedIdentityId);
    if (prev && now - prev.lastAt < IDENTITY_REUSE_WINDOW_MS) {
      return { blocked: true, message: '같은 인증 요청은 잠시 후 다시 시도해주세요. (3분 제한)' };
    }
    identityReuseStore.set(normalizedIdentityId, { lastAt: now });
  }

  const ipKey = String(ipAddress || 'unknown').trim() || 'unknown';
  const ipEntry = registerIpStore.get(ipKey);
  if (!ipEntry || now - ipEntry.firstAt > REGISTER_IP_WINDOW_MS) {
    registerIpStore.set(ipKey, { count: 1, firstAt: now, lastAt: now });
    return { blocked: false };
  }

  ipEntry.count += 1;
  ipEntry.lastAt = now;
  registerIpStore.set(ipKey, ipEntry);
  if (ipEntry.count > REGISTER_IP_MAX_ATTEMPTS) {
    return { blocked: true, message: '동일 IP에서 인증/가입 요청이 많아 5분 뒤 다시 시도해주세요.' };
  }

  return { blocked: false };
}
const { awardPointByAction } = require('../models/pointModel');
const { pickUserRow } = require('../utils/response');

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

function buildRefreshCookie(req, token, maxAgeSeconds) {
  const attrs = [
    `refreshToken=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (req.secure) attrs.push('Secure');
  return attrs.join('; ');
}

function buildRefreshCookieClear(req) {
  const attrs = [
    'refreshToken=',
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (req.secure) attrs.push('Secure');
  return attrs.join('; ');
}

function resolveRegisterConflictError(error) {
  if (!error || error.code !== 'ER_DUP_ENTRY') return null;

  const messageSource = `${error?.sqlMessage || ''} ${error?.message || ''}`.toLowerCase();
  if (messageSource.includes('identity_verification_usages')) {
    return {
      status: 409,
      message: '이미 사용된 본인인증 건입니다. 다시 본인인증을 진행해주세요.'
    };
  }

  if (messageSource.includes('users.email')) {
    return {
      status: 409,
      message: '이미 사용 중인 아이디입니다.'
    };
  }

  if (messageSource.includes('users.nickname')) {
    return {
      status: 409,
      message: '이미 사용 중인 닉네임입니다.'
    };
  }

  return {
    status: 409,
    message: '이미 사용 중인 정보가 있어 회원가입을 완료할 수 없습니다.'
  };
}

async function register(req, res, next) {
  try {
    const { loginId, email, password, nickname, genderDigit } = req.body;
    const ipAddress = getClientIp(req);
    const accountType = normalizeAccountType(req.body.accountType || req.body.memberType);
    const resolvedLoginId = (loginId || email || '').trim();
    const name = String(req.body.name || '').trim() || null;
    const identityVerificationId = String(req.body.identityVerificationId || '').trim();
    const identityCi = String(req.body.identityCi || req.body.ci || '').trim();
    const identityDi = String(req.body.identityDi || req.body.di || '').trim();
    const phone = String(req.body.phone || '').trim();
    const birthDateIso = normalizeBirthDateToIso(req.body.birthDate || '');
    const termsConsent = Boolean(req.body.termsConsent);
    const privacyConsent = Boolean(req.body.privacyConsent);
    const marketingConsent = Boolean(req.body.marketingConsent);
    const smsConsent = Boolean(req.body.smsConsent);

    const registerAttemptState = registerIdentityUsageAttempt({ identityVerificationId, ipAddress });
    if (registerAttemptState.blocked) {
      console.warn('[AuthController.register] 요청 제한 차단', {
        ipAddress,
        identityVerificationId,
        message: registerAttemptState.message
      });
      return res.status(429).json({ message: registerAttemptState.message });
    }

    if (!resolvedLoginId || !password || !nickname) {
      console.warn('[AuthController.register] 필수값 누락', {
        hasLoginId: Boolean(resolvedLoginId),
        hasPassword: Boolean(password),
        hasNickname: Boolean(nickname)
      });
      return res.status(400).json({ message: '아이디, 비밀번호, 닉네임은 필수입니다.' });
    }

    const loginIdValidation = validateLoginId(resolvedLoginId);
    if (!loginIdValidation.valid) {
      console.warn('[AuthController.register] 아이디 정책 검증 실패', loginIdValidation);
      return res.status(400).json({ message: loginIdValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.warn('[AuthController.register] 비밀번호 정책 검증 실패', passwordValidation);
      return res.status(400).json({ message: passwordValidation.message });
    }
    if (!identityVerificationId) {
      console.warn('[AuthController.register] 본인인증 ID 누락');
      return res.status(400).json({ message: '본인인증 확인 정보가 누락되었습니다. 인증 후 다시 시도해주세요.' });
    }
    if (!identityDi && !identityCi) {
      console.warn('[AuthController.register] 본인인증 고유값(DI/CI) 누락');
      return res.status(400).json({ message: '본인인증 고유값(DI/CI)이 없어 가입을 진행할 수 없습니다.' });
    }
    if (!termsConsent || !privacyConsent) {
      console.warn('[AuthController.register] 필수 약관 동의 누락', { termsConsent, privacyConsent });
      return res.status(400).json({ message: '약관 및 개인정보처리방침 동의가 필요합니다.' });
    }

    const age = calculateInternationalAge(birthDateIso);
    if (age < 19) {
      console.warn('[AuthController.register] 나이 제한으로 가입 거절', { birthDateIso, age });
      return res.status(403).json({ message: '19세 이상만 가입 가능합니다.' });
    }

    const normalizedNickname = String(nickname || '').trim();
    const nicknameValidation = validateNickname(normalizedNickname);
    if (!nicknameValidation.valid) {
      console.warn('[AuthController.register] 닉네임 정책 검증 실패', nicknameValidation);
      return res.status(400).json({ message: nicknameValidation.message });
    }

    const normalizedGenderDigit = normalizeGenderDigitValue(genderDigit);
    if (!/^\d$/.test(normalizedGenderDigit)) {
      console.warn('[AuthController.register] 성별 식별 번호 형식 오류', { genderDigit: normalizedGenderDigit });
      return res.status(400).json({ message: '성별 식별 번호를 확인할 수 없습니다. 본인인증을 다시 진행해주세요.' });
    }
    const signupEligibility = await evaluateIdentitySignupEligibility({
      identityVerificationId,
      ci: identityCi,
      di: identityDi,
      phone,
      genderDigit: normalizedGenderDigit
    });
    if (!signupEligibility.allowed) {
      console.warn('[AuthController.register] 본인인증 기반 가입 불가', {
        reasonCode: signupEligibility.reasonCode,
        message: signupEligibility.message
      });
      const blockedStatusByReason = {
        MISSING_IDENTITY_VERIFICATION_ID: 400,
        MISSING_IDENTITY_HASH: 400,
        IDENTITY_VERIFICATION_ALREADY_USED: 409,
        FEMALE_NOT_ALLOWED: 403,
        REJOIN_WAIT: 403,
        RESTRICTED_IDENTITY: 403,
        DUPLICATE_IDENTITY: 409
      };
      return res
        .status(blockedStatusByReason[signupEligibility.reasonCode] || 400)
        .json({
          reasonCode: signupEligibility.reasonCode,
          message: signupEligibility.message
        });
    }
    const { ciHash, diHash, phoneHash } = signupEligibility.identityHashes;

    if (await findByEmail(resolvedLoginId)) {
      console.warn('[AuthController.register] 중복 아이디', { loginId: resolvedLoginId });
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }
    if (await findByNickname(normalizedNickname)) {
      console.warn('[AuthController.register] 중복 닉네임', { nickname: normalizedNickname });
      return res.status(400).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const hashedPassword = await hashPassword(password);
    const role = resolveRoleByAccountType(accountType);
    const userId = await createUser({
      email: resolvedLoginId,
      password: hashedPassword,
      nickname: normalizedNickname,
      name,
      birthDate: birthDateIso || null,
      genderDigit: normalizedGenderDigit,
      role,
      memberType: accountType,
      phone,
      termsConsent,
      privacyConsent,
      marketingConsent,
      smsConsent,
      identityCiHash: ciHash,
      identityDiHash: diHash,
      phoneHash,
      isAdultVerified: true,
      adultVerifiedAt: new Date(),
      lastIdentityVerifiedAt: new Date()
    });
    await markIdentityVerificationUsed({
      identityVerificationId,
      ciHash,
      diHash,
      phoneHash,
      usedByUserId: userId,
      usedIpAddress: ipAddress
    });
    await awardPointByAction(userId, 'REGISTER');

    const user = await findByEmail(resolvedLoginId);
    res.json({ success: true, message: '회원가입이 완료되었습니다.', user: pickUserRow({ ...user, id: userId }) });
  } catch (error) {
    const conflictError = resolveRegisterConflictError(error);
    if (conflictError) {
      console.warn('[AuthController.register] DB 중복 예외 처리', {
        status: conflictError.status,
        message: conflictError.message,
        dbErrorCode: error?.code,
        dbMessage: error?.sqlMessage || error?.message
      });
      return res.status(conflictError.status).json({ message: conflictError.message });
    }
    console.error('[AuthController.register] 예외 발생', {
      message: error?.message,
      stack: error?.stack
    });
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
    const isPasswordValid = user ? await verifyPassword(password, user.password) : false;
    if (!user || !isPasswordValid) {
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

    const accessToken = signAccessToken(user);
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
    if (!isHashedPassword(user.password)) {
      const rehashedPassword = await hashPassword(password);
      await updateUserProfile(user.id, { password: rehashedPassword });
    }

    const refreshedUser = await findByEmail(resolvedLoginId);
    const refreshToken = signRefreshToken(user);
    res.append('Set-Cookie', buildRefreshCookie(req, refreshToken, parseExpiresInToSeconds(REFRESH_EXPIRES_IN)));
    res.json({
      success: true,
      accessToken,
      accessTokenExpiresIn: ACCESS_EXPIRES_IN,
      refreshTokenExpiresIn: REFRESH_EXPIRES_IN,
      ...pickUserRow(refreshedUser || user)
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json(pickUserRow(req.user));
}

async function refresh(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = String(cookies.refreshToken || '').trim();
    if (!refreshToken) {
      return res.status(401).json({ message: '리프레시 토큰이 없습니다.' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (_error) {
      res.append('Set-Cookie', buildRefreshCookieClear(req));
      return res.status(401).json({ message: '리프레시 토큰이 유효하지 않거나 만료되었습니다.' });
    }

    const userId = Number(payload.sub || 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      res.append('Set-Cookie', buildRefreshCookieClear(req));
      return res.status(401).json({ message: '세션이 유효하지 않습니다.' });
    }

    const user = await findById(userId);
    if (!user) {
      res.append('Set-Cookie', buildRefreshCookieClear(req));
      return res.status(401).json({ message: '세션이 유효하지 않습니다.' });
    }

    const newRefreshToken = signRefreshToken(user);
    const newAccessToken = signAccessToken(user);
    res.append('Set-Cookie', buildRefreshCookie(req, newRefreshToken, parseExpiresInToSeconds(REFRESH_EXPIRES_IN)));

    return res.json({
      success: true,
      accessToken: newAccessToken,
      accessTokenExpiresIn: ACCESS_EXPIRES_IN,
      refreshTokenExpiresIn: REFRESH_EXPIRES_IN
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  res.append('Set-Cookie', buildRefreshCookieClear(req));
  res.json({ success: true, message: '로그아웃되었습니다.' });
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

const KCP_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const kcpIdentityTransactions = new Map();

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

function getKcpCertHost() {
  const configuredBaseUrl = String(process.env.KCP_CERT_BASE_URL || '').trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, '');

  const isProduction = String(process.env.KCP_CERT_ENV || process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  return isProduction ? 'https://cert.kcp.co.kr' : 'https://testcert.kcp.co.kr';
}

function resolveKcpApiUrl(kind) {
  const directUrl = String(process.env[kind === 'register' ? 'KCP_CERT_REGISTER_URL' : 'KCP_CERT_RESULT_URL'] || '').trim();
  if (directUrl) return directUrl;

  const pathEnvName = kind === 'register' ? 'KCP_CERT_REGISTER_PATH' : 'KCP_CERT_RESULT_PATH';
  const defaultPath = kind === 'register' ? '/api/reg/certDataReg.do' : '/api/query/getCertData.do';
  const apiPath = String(process.env[pathEnvName] || defaultPath).trim();
  return `${getKcpCertHost()}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
}

function getKcpConfig() {
  return {
    siteCode: String(process.env.KCP_SITE_CODE || '').trim(),
    encKey: String(process.env.KCP_ENC_KEY || '').trim(),
    cryptoModulePath: String(process.env.KCP_CRYPTO_MODULE_PATH || path.join(__dirname, '../utils/kcpCrypto.js')).trim()
  };
}

function cleanupKcpIdentityTransactions(now = Date.now()) {
  for (const [key, value] of kcpIdentityTransactions.entries()) {
    if (!value?.createdAt || now - value.createdAt > KCP_TRANSACTION_TTL_MS) {
      kcpIdentityTransactions.delete(key);
    }
  }
}

function saveKcpIdentityTransaction(regCertKey, value = {}) {
  const normalizedKey = String(regCertKey || '').trim();
  if (!normalizedKey) return;
  cleanupKcpIdentityTransactions();
  kcpIdentityTransactions.set(normalizedKey, {
    ...value,
    createdAt: value.createdAt || Date.now()
  });
}

function getKcpIdentityTransaction(regCertKey) {
  cleanupKcpIdentityTransactions();
  return kcpIdentityTransactions.get(String(regCertKey || '').trim()) || null;
}

function resolveKcpCryptoProvider(modulePath) {
  const normalizedPath = String(modulePath || '').trim();
  if (!normalizedPath) return null;

  const resolvedPath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(process.cwd(), normalizedPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`KCP 암복호화 모듈을 찾을 수 없습니다: ${resolvedPath}`);
  }

  return require(resolvedPath);
}

function deriveKcpFallbackKey(encKey, siteCode) {
  return crypto.createHash('sha256').update(`${encKey}:${siteCode}`).digest();
}

function deriveKcpFallbackIv(rv, siteCode) {
  return crypto.createHash('sha256').update(`${siteCode}:${rv}`).digest().subarray(0, 16);
}

function fallbackEncryptJson(jsonText, encKey, siteCode) {
  const rv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(Buffer.from(encKey, 'utf8'), rv, 10000, 32, 'sha256');
  const iv = crypto.pbkdf2Sync(Buffer.from(siteCode, 'utf8'), rv, 10000, 32, 'sha256').subarray(0, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(false);
  const source = Buffer.from(jsonText, 'utf8');
  const blockSize = 16;
  const padding = blockSize - (source.length % blockSize);
  const paddedSource = Buffer.concat([source, Buffer.alloc(padding, padding)]);
  const encData = Buffer.concat([cipher.update(paddedSource), cipher.final()]).toString('base64');
  return { enc_data: encData, rv: rv.toString('base64') };
}

function fallbackDecryptJson(encCertData, rv, encKey, siteCode) {
  const rvBuffer = Buffer.from(String(rv || ''), 'base64');
  const key = crypto.pbkdf2Sync(Buffer.from(encKey, 'utf8'), rvBuffer, 10000, 32, 'sha256');
  const iv = crypto.pbkdf2Sync(Buffer.from(siteCode, 'utf8'), rvBuffer, 10000, 32, 'sha256').subarray(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(String(encCertData || ''), 'base64'), decipher.final()]);
  const padding = decrypted[decrypted.length - 1];
  return decrypted.subarray(0, decrypted.length - padding).toString('utf8');
}

function encryptKcpJson(payload, { encKey, siteCode, cryptoModulePath }) {
  const provider = resolveKcpCryptoProvider(cryptoModulePath);
  const jsonText = JSON.stringify(payload);

  if (provider?.encryptJson || provider?.encrypJson) {
    const encryptFn = provider.encryptJson || provider.encrypJson;
    const encrypted = encryptFn(jsonText, encKey, siteCode);
    if (Array.isArray(encrypted)) {
      return { enc_data: encrypted[0], rv: encrypted[1] };
    }
    return {
      enc_data: encrypted?.enc_data || encrypted?.encData || encrypted?.enc_cert_data || encrypted?.data,
      rv: encrypted?.rv
    };
  }

  return fallbackEncryptJson(jsonText, encKey, siteCode);
}

function decryptKcpJson(encCertData, rv, { encKey, siteCode, cryptoModulePath }) {
  const provider = resolveKcpCryptoProvider(cryptoModulePath);
  if (provider?.decryptJson) {
    const decrypted = provider.decryptJson(encCertData, rv, encKey, siteCode);
    return typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted || {});
  }

  return fallbackDecryptJson(encCertData, rv, encKey, siteCode);
}

function parseJsonText(jsonText, fallbackMessage) {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const parseError = new Error(fallbackMessage);
    parseError.detail = error.message;
    throw parseError;
  }
}

function truncateKcpResponseBody(text, maxLength = 500) {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }
  return `${normalizedText.slice(0, maxLength)}...`;
}

function parseKcpResponseBody(rawBody, contentType = '') {
  const responseText = String(rawBody || '').trim();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (_jsonError) {
    const normalizedContentType = String(contentType || '').toLowerCase();
    const looksLikeFormBody = normalizedContentType.includes('application/x-www-form-urlencoded')
      || /^[^=]+=[\s\S]*(&[^=]+=[\s\S]*)*$/.test(responseText);

    if (!looksLikeFormBody) {
      return null;
    }

    const params = new URLSearchParams(responseText);
    const payload = {};
    for (const [key, value] of params.entries()) {
      payload[key] = value;
    }
    return Object.keys(payload).length > 0 ? payload : null;
  }
}

function createKcpParseError({ url, response, rawBody, contentType }) {
  const parseError = new Error('KCP 본인확인 응답을 해석할 수 없습니다.');
  parseError.status = 502;
  parseError.detail = [
    `status=${response.status}`,
    contentType ? `content-type=${contentType}` : '',
    `url=${url}`,
    truncateKcpResponseBody(rawBody) ? `body=${truncateKcpResponseBody(rawBody)}` : ''
  ].filter(Boolean).join(', ');
  return parseError;
}

function throwIfKcpBusinessError(payload, fallbackMessage) {
  const resultCode = String(payload?.res_cd || payload?.result_cd || '').trim();
  if (!resultCode || resultCode === '0000') {
    return;
  }

  const businessError = new Error(payload?.res_msg || payload?.result_msg || fallbackMessage);
  businessError.status = 502;
  businessError.payload = payload;
  throw businessError;
}

async function postKcpJson(url, body, headers = {}, options = {}) {
  let upstreamResponse;
  const requestBody = options.rawBody !== undefined ? options.rawBody : JSON.stringify(body || {});

  try {
    upstreamResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        ...headers
      },
      body: requestBody
    });
  } catch (error) {
    const networkError = new Error('KCP 본인확인 서버와 통신하지 못했습니다.');
    networkError.status = 502;
    networkError.detail = error.message;
    throw networkError;
  }

  const contentType = upstreamResponse.headers?.get?.('content-type') || '';
  const rawBody = await upstreamResponse.text();
  const payload = parseKcpResponseBody(rawBody, contentType);

  if (!payload) {
    throw createKcpParseError({
      url,
      response: upstreamResponse,
      rawBody,
      contentType
    });
  }

  if (!upstreamResponse.ok) {
    const upstreamError = new Error(payload?.res_msg || payload?.message || 'KCP 본인확인 요청이 실패했습니다.');
    upstreamError.status = upstreamResponse.status;
    upstreamError.payload = payload;
    upstreamError.detail = [
      `status=${upstreamResponse.status}`,
      contentType ? `content-type=${contentType}` : '',
      `url=${url}`
    ].filter(Boolean).join(', ');
    throw upstreamError;
  }

  return payload;
}

function safeDecodeURIComponent(value) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  try {
    return decodeURIComponent(normalizedValue);
  } catch (_error) {
    return normalizedValue;
  }
}

function normalizeKcpIdentityResult(decryptedPayload = {}, identityVerificationId = '') {
  const ciUrl = pickIdentityValue(decryptedPayload, ['CI_URL', 'ci_url']);
  const diUrl = pickIdentityValue(decryptedPayload, ['DI_URL', 'di_url']);
  const ci = ciUrl ? safeDecodeURIComponent(ciUrl) : pickIdentityValue(decryptedPayload, ['CI', 'ci']);
  const di = diUrl ? safeDecodeURIComponent(diUrl) : pickIdentityValue(decryptedPayload, ['DI', 'di']);
  const sexCode = pickIdentityValue(decryptedPayload, ['sex_code', 'sex', 'genderDigit', 'gender']);

  return {
    identityVerificationId,
    id: identityVerificationId,
    res_cd: pickIdentityValue(decryptedPayload, ['res_cd', 'result_cd']),
    res_msg: pickIdentityValue(decryptedPayload, ['res_msg', 'result_msg']),
    phone: pickIdentityValue(decryptedPayload, ['phone_no', 'phone', 'phoneNumber', 'cellno']),
    phoneNumber: pickIdentityValue(decryptedPayload, ['phone_no', 'phone', 'phoneNumber', 'cellno']),
    name: pickIdentityValue(decryptedPayload, ['user_name', 'name', 'fullName']),
    birthDate: pickIdentityValue(decryptedPayload, ['birth_day', 'birthDate', 'birthday', 'birth']),
    genderDigit: normalizeGenderDigitValue(sexCode === '01' ? '1' : (sexCode === '02' ? '2' : sexCode)),
    ci,
    di,
    verifiedCustomer: {
      name: pickIdentityValue(decryptedPayload, ['user_name', 'name', 'fullName']),
      birthDate: pickIdentityValue(decryptedPayload, ['birth_day', 'birthDate', 'birthday', 'birth']),
      phoneNumber: pickIdentityValue(decryptedPayload, ['phone_no', 'phone', 'phoneNumber', 'cellno']),
      genderDigit: normalizeGenderDigitValue(sexCode === '01' ? '1' : (sexCode === '02' ? '2' : sexCode)),
      ci,
      di
    },
    kcp: {
      commId: pickIdentityValue(decryptedPayload, ['comm_id']),
      sexCode,
      localCode: pickIdentityValue(decryptedPayload, ['local_code'])
    }
  };
}

async function requestIdentityVerification(req, res) {
  const kcpConfig = getKcpConfig();
  const missingEnvs = [];
  if (!kcpConfig.siteCode) missingEnvs.push('KCP_SITE_CODE');
  if (!kcpConfig.encKey) missingEnvs.push('KCP_ENC_KEY');

  if (missingEnvs.length > 0) {
    return res.status(500).json({
      message: `KCP V2 연동 환경변수(${missingEnvs.join(', ')})가 설정되지 않았습니다.`
    });
  }

  const requestPayload = {
    site_cd: kcpConfig.siteCode,
    ordr_idxx: String(req.body?.ordr_idxx || generateOrderNumber()).trim(),
    Ret_URL: String(req.body?.Ret_URL || resolveReturnUrl(req)).trim(),
    cert_method: String(req.body?.cert_method || '01').trim(),
    web_siteid: String(req.body?.web_siteid || process.env.KCP_WEB_SITE_ID || '').trim(),
    param_opt_1: String(req.body?.param_opt_1 || '').trim(),
    param_opt_2: String(req.body?.param_opt_2 || '').trim(),
    param_opt_3: String(req.body?.param_opt_3 || '').trim()
  };

  let encryptedPayload;
  try {
    encryptedPayload = encryptKcpJson(requestPayload, kcpConfig);
  } catch (error) {
    return res.status(500).json({ message: 'KCP 본인확인 거래등록 데이터 암호화에 실패했습니다.', detail: error.message });
  }

  if (!encryptedPayload?.enc_data || !encryptedPayload?.rv) {
    return res.status(500).json({ message: 'KCP 본인확인 거래등록 암호화 결과가 올바르지 않습니다.' });
  }

  let registrationResult;
  try {
    registrationResult = await postKcpJson(
      resolveKcpApiUrl('register'),
      null,
      {
        site_cd: kcpConfig.siteCode,
        rv: encryptedPayload.rv
      },
      { rawBody: encryptedPayload.enc_data }
    );
  } catch (error) {
    return res.status(error.status || 502).json({ message: error.message, detail: error.detail, kcp: error.payload });
  }

  try {
    throwIfKcpBusinessError(registrationResult, 'KCP 본인확인 거래등록 요청이 실패했습니다.');
  } catch (error) {
    return res.status(error.status || 502).json({ message: error.message, kcp: error.payload });
  }

  const regCertKey = String(registrationResult.reg_cert_key || '').trim();
  const callUrl = String(registrationResult.call_url || registrationResult.cert_url || registrationResult.auth_url || '').trim();
  if (!regCertKey || !callUrl) {
    return res.status(502).json({ message: 'KCP 본인확인 거래등록 응답에 인증창 호출 정보가 없습니다.', kcp: registrationResult });
  }

  saveKcpIdentityTransaction(regCertKey, {
    orderNo: requestPayload.ordr_idxx,
    callUrl,
    registrationResult
  });

  return res.json({
    identityVerificationId: regCertKey,
    regCertKey,
    callUrl,
    kcpPageSubmitYn: String(req.body?.kcp_page_submit_yn || req.body?.kcpPageSubmitYn || 'N').trim().toUpperCase() === 'Y' ? 'Y' : 'N',
    resCd: registrationResult.res_cd,
    resMsg: registrationResult.res_msg
  });
}

async function fetchKcpIdentityVerificationPayload(regCertKey) {
  const normalizedRegCertKey = String(regCertKey || '').trim();
  const kcpConfig = getKcpConfig();

  if (!normalizedRegCertKey) {
    return { error: { status: 400, body: { message: 'KCP 본인확인 거래등록키가 필요합니다.' } } };
  }
  if (!kcpConfig.siteCode || !kcpConfig.encKey) {
    return { error: { status: 500, body: { message: 'KCP V2 연동 환경변수(KCP_SITE_CODE, KCP_ENC_KEY)가 설정되지 않았습니다.' } } };
  }

  const cachedTransaction = getKcpIdentityTransaction(normalizedRegCertKey);
  if (cachedTransaction?.payload) {
    return { payload: cachedTransaction.payload };
  }

  let inquiryResult;
  try {
    inquiryResult = await postKcpJson(
      resolveKcpApiUrl('result'),
      {
        reg_cert_key: normalizedRegCertKey,
        ordr_idxx: String(cachedTransaction?.orderNo || cachedTransaction?.ordr_idxx || '').trim()
      },
      { site_cd: kcpConfig.siteCode }
    );
  } catch (error) {
    return { error: { status: error.status || 502, body: { message: error.message, detail: error.detail, kcp: error.payload } } };
  }

  try {
    throwIfKcpBusinessError(inquiryResult, 'KCP 본인확인 결과 조회 요청이 실패했습니다.');
  } catch (error) {
    return { error: { status: error.status || 502, body: { message: error.message, kcp: error.payload } } };
  }

  const encCertData = String(inquiryResult.enc_cert_data || inquiryResult.enc_data || '').trim();
  const rv = String(inquiryResult.rv || '').trim();
  if (!encCertData || !rv) {
    return { error: { status: 502, body: { message: 'KCP 본인확인 결과 조회 응답에 복호화 데이터가 없습니다.', kcp: inquiryResult } } };
  }

  let decryptedPayload;
  try {
    decryptedPayload = parseJsonText(
      decryptKcpJson(encCertData, rv, kcpConfig),
      'KCP 본인확인 결과 복호화 응답을 해석할 수 없습니다.'
    );
  } catch (error) {
    return { error: { status: 500, body: { message: 'KCP 본인확인 결과 복호화에 실패했습니다.', detail: error.detail || error.message } } };
  }

  const payload = normalizeKcpIdentityResult(decryptedPayload, normalizedRegCertKey);
  saveKcpIdentityTransaction(normalizedRegCertKey, {
    ...(cachedTransaction || {}),
    inquiryResult,
    decryptedPayload,
    payload
  });

  return { payload };
}

async function handleKcpCallback(req, res) {
  const body = { ...(req.query || {}), ...(req.body || {}) };
  const resCd = String(body.res_cd || body.result_cd || '').trim();
  const regCertKey = String(body.reg_cert_key || '').trim();
  const success = resCd === '0000';

  let payload = {
    success,
    identityVerificationId: regCertKey,
    message: String(body.res_msg || body.result_msg || '').trim() || (success ? '본인인증이 완료되었습니다.' : '본인인증에 실패했습니다.')
  };

  if (success) {
    const fetchedResult = await fetchKcpIdentityVerificationPayload(regCertKey);
    if (fetchedResult.error) {
      payload = {
        success: false,
        identityVerificationId: regCertKey,
        message: fetchedResult.error.body.message || 'KCP 본인확인 결과 조회에 실패했습니다.',
        detail: fetchedResult.error.body.detail || ''
      };
    } else {
      payload = {
        ...fetchedResult.payload,
        success: true,
        message: fetchedResult.payload.res_msg || '본인인증이 완료되었습니다.'
      };
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>KCP 본인인증 결과</title>
</head>
<body>
  <script>
    (function () {
      var payload = ${JSON.stringify(payload)};
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'KCP_IDENTITY_VERIFICATION_RESULT',
          payload: payload
        }, window.location.origin);
      }
      if (!window.opener || window.opener.closed) {
        document.body.textContent = payload.message || '본인인증 처리가 완료되었습니다.';
        return;
      }
      window.close();
    })();
  </script>
</body>
</html>`);
}

async function getIdentityVerificationConfig(req, res) {
  const kcpConfig = getKcpConfig();
  const missingEnvs = [];
  if (!kcpConfig.siteCode) missingEnvs.push('KCP_SITE_CODE');
  if (!kcpConfig.encKey) missingEnvs.push('KCP_ENC_KEY');

  if (missingEnvs.length > 0) {
    return res.status(500).json({
      message: `KCP V2 연동 환경변수(${missingEnvs.join(', ')})가 설정되지 않았습니다.`
    });
  }

  return res.json({
    provider: 'kcp-v2',
    siteCode: kcpConfig.siteCode,
    returnUrl: resolveReturnUrl(req)
  });
}

function pickIdentityValue(source, candidateKeys = []) {
  if (!source || typeof source !== 'object') {
    return '';
  }

  for (const key of candidateKeys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
}

function normalizeIdentityVerificationPayload(payload = {}) {
  const verifiedCustomer = payload.verifiedCustomer || payload.customer || {};

  return {
    name: pickIdentityValue(verifiedCustomer, ['name', 'fullName']) || pickIdentityValue(payload, ['name', 'fullName']),
    birthDate: pickIdentityValue(verifiedCustomer, ['birthDate', 'birthday', 'birth']) || pickIdentityValue(payload, ['birthDate', 'birthday', 'birth']),
    phone: pickIdentityValue(verifiedCustomer, ['phoneNumber', 'phone', 'mobilePhone']) || pickIdentityValue(payload, ['phoneNumber', 'phone', 'mobilePhone']),
    genderDigit: normalizeGenderDigitValue(
      pickIdentityValue(verifiedCustomer, ['genderDigit', 'genderCode', 'gender']) || pickIdentityValue(payload, ['genderDigit', 'genderCode', 'gender'])
    ),
    ci: pickIdentityValue(verifiedCustomer, ['ci']) || pickIdentityValue(payload, ['ci']),
    di: pickIdentityValue(verifiedCustomer, ['di']) || pickIdentityValue(payload, ['di'])
  };
}

function normalizeGenderDigitValue(genderDigit = '') {
  const normalizedValue = String(genderDigit || '').trim();
  if (!normalizedValue) {
    return '';
  }

  if (/^\d$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const lowerValue = normalizedValue.toLowerCase();
  if (['m', 'male', 'man', '남', '남성'].includes(lowerValue)) {
    return '1';
  }
  if (['f', 'female', 'woman', '여', '여성'].includes(lowerValue)) {
    return '2';
  }

  return normalizedValue;
}

function isFemaleGenderDigit(genderDigit = '') {
  const normalizedGenderDigit = normalizeGenderDigitValue(genderDigit);
  return ['2', '4', '6', '8'].includes(normalizedGenderDigit);
}

async function evaluateIdentitySignupEligibility({ identityVerificationId, ci = '', di = '', phone = '', genderDigit = '' }) {
  const ciHash = hashIdentityValue(ci);
  const diHash = hashIdentityValue(di);
  const phoneHash = hashIdentityValue(phone);

  if (!identityVerificationId) {
    return {
      allowed: false,
      reasonCode: 'MISSING_IDENTITY_VERIFICATION_ID',
      message: '본인인증 확인 정보가 누락되었습니다. 인증 후 다시 시도해주세요.'
    };
  }

  if (!diHash && !ciHash) {
    return {
      allowed: false,
      reasonCode: 'MISSING_IDENTITY_HASH',
      message: '본인인증 고유값(DI/CI)이 없어 가입을 진행할 수 없습니다.'
    };
  }

  if (await isIdentityVerificationIdUsed(identityVerificationId)) {
    return {
      allowed: false,
      reasonCode: 'IDENTITY_VERIFICATION_ALREADY_USED',
      message: '이미 사용된 본인인증 건입니다. 다시 본인인증을 진행해주세요.'
    };
  }

  if (isFemaleGenderDigit(genderDigit)) {
    return {
      allowed: false,
      reasonCode: 'FEMALE_NOT_ALLOWED',
      message: '본인인증 결과에 따라 현재 회원가입이 제한됩니다.'
    };
  }

  const activeRestriction = await findActiveSignupRestriction({ ciHash, diHash, phoneHash });
  if (activeRestriction) {
    if (activeRestriction.restrictionType === 'REJOIN_WAIT') {
      return {
        allowed: false,
        reasonCode: 'REJOIN_WAIT',
        message: '탈퇴 후 7일 이내에는 재가입할 수 없습니다.'
      };
    }

    return {
      allowed: false,
      reasonCode: 'RESTRICTED_IDENTITY',
      message: '가입이 제한된 본인인증 정보입니다. 고객센터로 문의해주세요.'
    };
  }

  const existingIdentityUser = await findUserByIdentityHashes({ ciHash, diHash, phoneHash });
  if (existingIdentityUser) {
    return {
      allowed: false,
      reasonCode: 'DUPLICATE_IDENTITY',
      message: '동일 명의(또는 휴대폰 번호)로 가입된 아이디가 이미 존재합니다.'
    };
  }

  return {
    allowed: true,
    reasonCode: 'OK',
    message: '가입 가능한 본인인증 정보입니다.',
    identityHashes: {
      ciHash,
      diHash,
      phoneHash
    }
  };
}

async function getIdentityVerificationResult(req, res) {
  const identityVerificationId = String(req.params.identityVerificationId || '').trim();
  const fetchedResult = await fetchIdentityVerificationPayload(identityVerificationId);
  if (fetchedResult.error) {
    return res.status(fetchedResult.error.status).json(fetchedResult.error.body);
  }
  const payload = fetchedResult.payload;

  const normalizedPayload = normalizeIdentityVerificationPayload(payload);
  const signupEligibility = await evaluateIdentitySignupEligibility({
    identityVerificationId,
    ci: normalizedPayload.ci,
    di: normalizedPayload.di,
    phone: normalizedPayload.phone,
    genderDigit: normalizedPayload.genderDigit
  });

  return res.json({
    ...payload,
    normalized: normalizedPayload,
    signupEligibility
  });
}

async function fetchIdentityVerificationPayload(identityVerificationId) {
  return fetchKcpIdentityVerificationPayload(identityVerificationId);
}

async function findAccountByIdentity(req, res) {
  const identityVerificationId = String(req.body?.identityVerificationId || '').trim();
  const fetchedResult = await fetchIdentityVerificationPayload(identityVerificationId);
  if (fetchedResult.error) {
    return res.status(fetchedResult.error.status).json(fetchedResult.error.body);
  }

  const normalizedPayload = normalizeIdentityVerificationPayload(fetchedResult.payload);
  const ciHash = hashIdentityValue(normalizedPayload.ci);
  const diHash = hashIdentityValue(normalizedPayload.di);
  const phoneHash = hashIdentityValue(normalizedPayload.phone);

  if (!ciHash && !diHash && !phoneHash) {
    return res.status(400).json({ message: '본인인증 정보가 올바르지 않습니다. 다시 시도해주세요.' });
  }

  const user = await findUserByIdentityHashes({ ciHash, diHash, phoneHash });
  if (!user) {
    return res.json({
      found: false,
      message: '본인인증 정보로 가입된 아이디가 없습니다.'
    });
  }

  return res.json({
    found: true,
    loginId: user.email,
    message: '가입된 아이디를 확인했습니다.'
  });
}

async function resetPasswordByIdentity(req, res) {
  const identityVerificationId = String(req.body?.identityVerificationId || '').trim();
  const nextPassword = String(req.body?.newPassword || '').trim();
  const passwordValidation = validatePassword(nextPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  const fetchedResult = await fetchIdentityVerificationPayload(identityVerificationId);
  if (fetchedResult.error) {
    return res.status(fetchedResult.error.status).json(fetchedResult.error.body);
  }

  const normalizedPayload = normalizeIdentityVerificationPayload(fetchedResult.payload);
  const ciHash = hashIdentityValue(normalizedPayload.ci);
  const diHash = hashIdentityValue(normalizedPayload.di);
  const phoneHash = hashIdentityValue(normalizedPayload.phone);
  const user = await findUserByIdentityHashes({ ciHash, diHash, phoneHash });
  if (!user) {
    return res.status(404).json({ message: '본인인증 정보로 가입된 아이디가 없습니다.' });
  }

  const hashedPassword = await hashPassword(nextPassword);
  await updateUserProfile(user.id, { password: hashedPassword });
  return res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
}

module.exports = {
  register,
  login,
  me,
  refresh,
  logout,
  checkNickname,
  requestIdentityVerification,
  getIdentityVerificationConfig,
  getIdentityVerificationResult,
  findAccountByIdentity,
  resetPasswordByIdentity,
  handleKcpCallback
};
