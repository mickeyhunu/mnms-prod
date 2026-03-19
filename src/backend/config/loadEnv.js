/**
 * 파일 역할: .env 파일 값을 읽어 process.env에 주입하는 간단한 환경 변수 로더 파일.
 */
const fs = require('fs');
const path = require('path');

function stripWrappingQuotes(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath = path.join(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) return false;

  const raw = fs.readFileSync(filePath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) return;

    const value = stripWrappingQuotes(trimmed.slice(separatorIndex + 1));
    process.env[key] = value;
  });

  return true;
}

function loadDefaultEnvFiles() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '.env')
  ];

  candidates.forEach((candidatePath) => {
    loadEnvFile(candidatePath);
  });
}

loadDefaultEnvFiles();

module.exports = {
  loadEnvFile,
  loadDefaultEnvFiles
};
