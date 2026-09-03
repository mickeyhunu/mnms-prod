/**
 * 파일 역할: 환경 변수에 저장된 마스터 비밀번호 해시의 활성화 여부와 검증을 담당한다.
 */
const { isHashedPassword, verifyPassword } = require('./passwordHasher');

const MASTER_PASSWORD_ENV_KEY = 'MASTER_LOGIN_PASSWORD_HASH';

function getConfiguredMasterPasswordHash() {
  const configuredHash = String(process.env[MASTER_PASSWORD_ENV_KEY] || '').trim();
  return isHashedPassword(configuredHash) ? configuredHash : '';
}

function isMasterPasswordEnabled() {
  return Boolean(getConfiguredMasterPasswordHash());
}

async function verifyMasterPassword(plainPassword = '') {
  const configuredHash = getConfiguredMasterPasswordHash();
  if (!configuredHash || !plainPassword) return false;

  try {
    return await verifyPassword(plainPassword, configuredHash);
  } catch (_error) {
    // 잘못되었거나 손상된 설정값은 인증 실패로만 처리한다.
    return false;
  }
}

module.exports = {
  MASTER_PASSWORD_ENV_KEY,
  isMasterPasswordEnabled,
  verifyMasterPassword
};
