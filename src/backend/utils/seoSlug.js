/**
 * 파일 역할: SEO 친화적인 URL slug 생성과 비교를 위한 공통 유틸리티 파일.
 */
function createSeoSlug(value = '', fallback = 'detail') {
  const normalized = String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\/\\?#%]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s._~-]+/gu, ' ')
    .replace(/[\s._~]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function normalizeSeoSlug(value = '') {
  try {
    return createSeoSlug(decodeURIComponent(String(value || '')));
  } catch (error) {
    return createSeoSlug(value);
  }
}

module.exports = {
  createSeoSlug,
  normalizeSeoSlug
};
