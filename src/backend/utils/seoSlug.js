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

function createSeoSlugWithId(title = '', id = null, fallbackPrefix = 'detail') {
  const normalizedId = Number.parseInt(id, 10);
  const hasValidId = Number.isInteger(normalizedId) && normalizedId > 0;
  const fallback = hasValidId ? `${fallbackPrefix}-${normalizedId}` : fallbackPrefix;
  const titleSlug = createSeoSlug(title, fallback);

  if (!hasValidId) return titleSlug;
  if (titleSlug === fallback && !String(title || '').trim()) return fallback;
  return `${titleSlug}-${normalizedId}`;
}

function normalizeSeoSlug(value = '') {
  try {
    return createSeoSlug(decodeURIComponent(String(value || '')));
  } catch (error) {
    return createSeoSlug(value);
  }
}

function extractTrailingSlugId(slug = '') {
  const normalizedSlug = normalizeSeoSlug(slug);
  const match = normalizedSlug.match(/(?:^|-)(\d+)$/);
  if (!match) return null;

  const id = Number.parseInt(match[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = {
  createSeoSlug,
  createSeoSlugWithId,
  extractTrailingSlugId,
  normalizeSeoSlug
};
