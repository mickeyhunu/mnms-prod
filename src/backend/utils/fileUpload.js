/**
 * 파일 역할: data URL 업로드 데이터를 S3에 저장하고 URL/메타데이터를 반환하는 유틸 파일.
 */
const crypto = require('crypto');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { buildS3ObjectUrl, getS3Client, isS3UploadEnabled, s3BucketName } = require('../config/s3');

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

function getExtensionFromMime(mimeType) {
  return EXTENSION_BY_MIME[mimeType] || 'bin';
}

function parseDataUrl(dataUrl) {
  const matched = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!matched) return null;
  return {
    mimeType: String(matched[1] || '').toLowerCase(),
    base64Body: matched[2] || ''
  };
}

function sanitizeFileName(fileName, defaultBaseName = 'upload') {
  const parsed = path.parse(String(fileName || '').trim());
  const baseName = parsed.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '').slice(0, 100) || defaultBaseName;
  const ext = parsed.ext.replace('.', '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return ext ? `${baseName}.${ext}` : baseName;
}

function normalizeExistingFileUrls(values = [], { maxCount, allowedPrefixes = ['http://', 'https://'] } = {}) {
  return values
    .map((url) => String(url || '').trim())
    .filter((url) => allowedPrefixes.some((prefix) => url.startsWith(prefix)))
    .slice(0, maxCount);
}

async function uploadDataUrlToS3({ dataUrl, folder = 'uploads', fileName = '', allowedMimeTypes = [], maxBytes = 10 * 1024 * 1024 }) {
  if (!isS3UploadEnabled()) {
    throw new Error('S3 업로드가 활성화되지 않았습니다. S3_BUCKET_NAME 환경변수를 설정해주세요.');
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('지원하지 않는 파일 형식입니다. base64 data URL 형식만 업로드할 수 있습니다.');
  }

  if (allowedMimeTypes.length && !allowedMimeTypes.includes(parsed.mimeType)) {
    throw new Error(`허용되지 않은 MIME 타입입니다: ${parsed.mimeType}`);
  }

  const bodyBuffer = Buffer.from(parsed.base64Body, 'base64');
  if (!bodyBuffer.length) throw new Error('빈 파일은 업로드할 수 없습니다.');
  if (bodyBuffer.length > maxBytes) throw new Error(`파일 크기 제한(${maxBytes} bytes)을 초과했습니다.`);

  const extension = getExtensionFromMime(parsed.mimeType);
  const safeName = sanitizeFileName(fileName || `file.${extension}`, 'file');
  const key = `${folder.replace(/^\/+|\/+$/g, '')}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: s3BucketName,
    Key: key,
    Body: bodyBuffer,
    ContentType: parsed.mimeType
  }));

  return {
    key,
    url: buildS3ObjectUrl(key),
    fileName: safeName,
    mimeType: parsed.mimeType,
    size: bodyBuffer.length
  };
}

module.exports = {
  normalizeExistingFileUrls,
  parseDataUrl,
  uploadDataUrlToS3
};
