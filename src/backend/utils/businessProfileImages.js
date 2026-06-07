/**
 * 파일 역할: 사업자정보 첨부 이미지의 S3 업로드/삭제 기준을 관리하는 유틸 파일.
 */
const { deleteS3ObjectsByUrls, uploadDataUrlToS3 } = require('./fileUpload');

const BUSINESS_DOCUMENT_IMAGE_FIELDS = [
  { nameKey: 'licenseImageName', urlKey: 'licenseImageDataUrl', folder: 'business/license-images' },
  { nameKey: 'permitImageName', urlKey: 'permitImageDataUrl', folder: 'business/permit-images' }
];

const BUSINESS_DOCUMENT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const BUSINESS_DOCUMENT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

function parseBusinessInfoValue(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

function isDataUrl(value) {
  return /^data:[^;]+;base64,/i.test(String(value || '').trim());
}

function collectBusinessInfoImageUrls(...businessInfos) {
  const urls = new Set();

  for (const businessInfo of businessInfos) {
    const parsed = parseBusinessInfoValue(businessInfo);
    for (const field of BUSINESS_DOCUMENT_IMAGE_FIELDS) {
      const imageUrl = String(parsed?.[field.urlKey] || '').trim();
      if (imageUrl) urls.add(imageUrl);
    }
  }

  return [...urls];
}

async function uploadBusinessInfoDataUrlImages(businessInfo = {}, uploadedUrls = []) {
  const normalizedBusinessInfo = { ...parseBusinessInfoValue(businessInfo) };

  for (const field of BUSINESS_DOCUMENT_IMAGE_FIELDS) {
    const imageDataUrl = String(normalizedBusinessInfo[field.urlKey] || '').trim();
    if (!isDataUrl(imageDataUrl)) continue;

    const uploaded = await uploadDataUrlToS3({
      dataUrl: imageDataUrl,
      fileName: normalizedBusinessInfo[field.nameKey] || 'business-document',
      folder: field.folder,
      allowedMimeTypes: BUSINESS_DOCUMENT_IMAGE_MIME_TYPES,
      maxBytes: BUSINESS_DOCUMENT_IMAGE_MAX_BYTES
    });

    normalizedBusinessInfo[field.urlKey] = uploaded.url;
    normalizedBusinessInfo[field.nameKey] = uploaded.fileName || normalizedBusinessInfo[field.nameKey];
    uploadedUrls.push(uploaded.url);
  }

  return normalizedBusinessInfo;
}

async function deleteUploadedBusinessInfoImagesOnFailure(uploadedUrls = []) {
  if (!uploadedUrls.length) return [];
  return deleteS3ObjectsByUrls(uploadedUrls);
}

async function deleteUnreferencedBusinessInfoImages(previousInfo, retainedInfos = []) {
  const previousUrls = collectBusinessInfoImageUrls(previousInfo);
  if (!previousUrls.length) return [];

  const retainedUrls = new Set(collectBusinessInfoImageUrls(...retainedInfos));
  const removableUrls = previousUrls.filter((url) => !retainedUrls.has(url));
  if (!removableUrls.length) return [];

  return deleteS3ObjectsByUrls(removableUrls);
}

module.exports = {
  collectBusinessInfoImageUrls,
  deleteUnreferencedBusinessInfoImages,
  deleteUploadedBusinessInfoImagesOnFailure,
  parseBusinessInfoValue,
  uploadBusinessInfoDataUrlImages
};
