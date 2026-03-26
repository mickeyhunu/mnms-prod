/**
 * 파일 역할: JWT 발급/검증 유틸리티를 제공하는 파일.
 */
const crypto = require('crypto');

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7일

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseExpiresInSeconds() {
  const raw = Number(process.env.JWT_EXPIRES_IN_SECONDS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_EXPIRES_IN_SECONDS;
  }
  return Math.floor(raw);
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
  }
  return secret;
}

function issueJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const expiresInSeconds = parseExpiresInSeconds();
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(unsignedToken)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
}

module.exports = {
  issueJwt
};
