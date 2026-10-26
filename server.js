/**
 * 파일 역할: Node/Express 서버를 초기화하고 백엔드 라우트를 연결하는 진입점 파일.
 */
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const ONE_HOUR_IN_SECONDS = 60 * 60;
const ONE_DAY_IN_SECONDS = 24 * ONE_HOUR_IN_SECONDS;
const ONE_YEAR_IN_SECONDS = 365 * ONE_DAY_IN_SECONDS;

require('./src/backend/config/loadEnv');

const { initDatabase, dbConfig, useLocalDb } = require('./src/backend/config/database');
const authRoutes = require('./src/backend/routes/authRoutes');
const authController = require('./src/backend/controllers/authController');
const postRoutes = require('./src/backend/routes/postRoutes');
const pieceChatRoutes = require('./src/backend/routes/pieceChatRoutes');
const userRoutes = require('./src/backend/routes/userRoutes');
const adminRoutes = require('./src/backend/routes/adminRoutes');
const supportRoutes = require('./src/backend/routes/supportRoutes');
const chatbotRoutes = require('./src/backend/routes/chatbotRoutes');
const liveRoutes = require('./src/backend/routes/liveRoutes');
const uploadRoutes = require('./src/backend/routes/uploadRoutes');
const rbtiRoutes = require('./src/backend/routes/rbtiRoutes');
const rankingRoutes = require('./src/backend/routes/rankingRoutes');
const bamcheatRoutes = require('./src/backend/routes/bamcheatRoutes');
const wikiRoutes = require('./src/backend/routes/wikiRoutes');
const posterRoutes = require('./src/backend/routes/posterRoutes');
const adminModel = require('./src/backend/models/adminModel');
const postModel = require('./src/backend/models/postModel');
const liveModel = require('./src/backend/models/liveModel');
const { startLiveHistoryScheduler } = require('./src/backend/utils/liveHistoryScheduler');
const { startBusinessAdRenewalScheduler, startBusinessAdJumpScheduleScheduler } = adminModel;
const { startBannerAuctionSettleScheduler } = require('./src/backend/models/bannerAuctionModel');
const { createSeoSlugWithId } = require('./src/backend/utils/seoSlug');
const { ensureS3BucketExists, isS3UploadEnabled, s3BucketName } = require('./src/backend/config/s3');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_DIR = path.join(__dirname, 'src/frontend');
const INDEX_HTML_PATH = path.join(FRONTEND_DIR, 'index.html');
////////////////////////////////////////////////////////////
const BAD_GATEWAY_HTML = `<html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html>`;
const ALLOW_ACCESS_COOKIE = 'mnms_allow_access';
////////////////////////////////////////////////////////////
const SITE_ORIGIN = String(process.env.SITE_ORIGIN || process.env.PUBLIC_SITE_URL || 'https://nightmens.com').replace(/\/$/, '');
const KAKAO_JAVASCRIPT_KEY = String(process.env.PUBLIC_KAKAO_JAVASCRIPT_KEY || process.env.KAKAO_JAVASCRIPT_KEY || '').trim();
const IS_LOCAL_ENV = process.env.MNMS_ENV_LOCAL_LOADED === 'true';
const ALLOW_DEVTOOLS_DETECTION_BYPASS = ['true', '1', 'yes', 'on'].includes(
  String(process.env.MNMS_ALLOW_DEVTOOLS || process.env.PUBLIC_ALLOW_DEVTOOLS || '').trim().toLowerCase()
);
const DEFAULT_SHARE_IMAGE_URL = absoluteUrl('/src/assets/live-avatars/brand-logo3.png');
let isDatabaseReady = false;
const trustProxyValue = parseTrustProxyValue(process.env.TRUST_PROXY || '1');

app.set('trust proxy', trustProxyValue);

////////////////////////////////////////////////////////////
// app.use((req, res, next) => {
//   const hasAccess = parseCookies(req.headers.cookie)[ALLOW_ACCESS_COOKIE] === '1';

//   if (req.path === '/allow') {
//     res.cookie(ALLOW_ACCESS_COOKIE, '1', {
//       httpOnly: true,
//       sameSite: 'lax',
//       secure: req.secure,
//       maxAge: ONE_YEAR_IN_SECONDS * 1000,
//       path: '/'
//     });
//     return res.redirect(302, '/');
//   }

//   if (hasAccess) return next();

//   return res.status(502).type('html').send(BAD_GATEWAY_HTML);
// });
////////////////////////////////////////////////////////////

function parseTrustProxyValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 1;
  if (['true', 'yes', 'on'].includes(normalized)) return true;
  if (['false', 'no', 'off'].includes(normalized)) return false;

  const numericValue = Number(normalized);
  if (Number.isInteger(numericValue) && numericValue >= 0) return numericValue;

  return value;
}

function setSeoSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
}

app.use(setSeoSecurityHeaders);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.all('/kcp/callback', authController.handleKcpCallback);


const HIDDEN_SEARCH_KEYWORD = '강남의밤';

const SEO_PAGE_CONFIG = {
  '/': {
    title: '남성 유흥 커뮤니티 홈 | 미드나잇 맨즈',
    description: '최저가 업소 추천, 실시간 인기 후기, 지역별 업소 정보를 한 번에 확인하세요.',
    keywords: ['남성 유흥 커뮤니티', '최저가 업소 추천', '업소 후기', '업소 정보', '실시간 인기글', HIDDEN_SEARCH_KEYWORD]
  },
  '/community': {
    title: '유흥 소통 커뮤니티 | 미드나잇 맨즈',
    description: '자유·익명·후기 게시판에서 최저가 업소 추천과 리얼 리뷰 후기를 탐색해보세요.',
    keywords: ['업소 추천 커뮤니티', '리뷰 후기', '최저가 업소', '익명 게시판', '남성 커뮤니티', HIDDEN_SEARCH_KEYWORD]
  },
  '/business-info': {
    title: '업체정보 | 미드나잇 맨즈',
    description: '등록된 업체 정보를 지역과 업종별로 확인하세요.',
    keywords: ['업체정보', '지역별 업체', '업종별 업체', '미드나잇 맨즈', HIDDEN_SEARCH_KEYWORD]
  },
  '/play': {
    title: 'PLAY | 미드나잇 맨즈',
    description: 'LIVE와 RBTI를 한 번에 이동할 수 있는 PLAY 메뉴입니다.',
    keywords: ['PLAY', 'LIVE', 'RBTI', '미드나잇 맨즈']
  },
  '/play/ranking': {
    title: '월간 랭킹 | 미드나잇 맨즈',
    description: '현재 달 일반회원 활동 랭킹을 확인하세요.',
    keywords: ['월간 랭킹', '활동 랭킹', '커뮤니티 랭킹', '미드나잇 맨즈']
  },
  '/play/live': {
    title: '실시간 출근부 웨이팅 초톡 | 미드나잇 맨즈',
    description: '실시간 업소 출근부 웨이팅 초이스, 엔트리 현황, 오늘의 추천 정보를 빠르게 확인하세요.',
    keywords: ['실시간 업소', '라이브 정보', '오늘의 추천 업소', '엔트리 현황', '지역 업소', HIDDEN_SEARCH_KEYWORD]
  },
  '/play/rbti': {
    title: 'RBTI 룸MBTI 룸비티아이 테스트 | 미드나잇 맨즈',
    description: 'RBTI, 룸MBTI 룸비티아이로 알아보는 화류 유형 검사 룸빵 유형 검사입니다. 유흥주점 이용 행동 성향을 간단히 확인하세요.',
    keywords: ['rbti', '룸mbti', '룸비티아이', '화류 유형 검사', '룸빵 유형 검사', '유흥 MBTI', '성향 테스트', '미드나잇 맨즈']
  },
  '/play/alcohol': {
    title: '음주 측정기 | 미드나잇 맨즈',
    description: '간단한 음주 상태 자가 점검을 위한 음주측정 페이지입니다.',
    keywords: ['음주 측정기', '음주 자가 점검', '미드나잇 맨즈']
  },
  '/play/wiki': {
    title: '룸빵위키 | 화류계 유흥업소 용어사전 | 미드나잇 맨즈',
    description: '룸빵위키에서 화류계 유흥업소 용어와 은어를 카테고리별로 검색하고 쉽게 확인하세요.',
    keywords: ['룸빵위키', '화류계 용어', '화류업계 용어', '화류 용어사전', '유흥 용어', '룸빵 용어', '미드나잇 맨즈']
  },
  '/support': {
    title: '공지 및 고객지원 | 미드나잇 맨즈',
    description: '커뮤니티 운영 공지, 이용 가이드, 자주 묻는 질문으로 서비스를 안전하게 이용하세요.',
    keywords: ['커뮤니티 공지', '고객지원', 'FAQ', '이용 가이드', '운영 정책']
  },
  '/support/faq': {
    title: 'FAQ | 미드나잇 맨즈',
    description: '자주 묻는 질문과 답변을 모아볼 수 있습니다.',
    keywords: ['FAQ', '자주 묻는 질문', '고객지원', '미드나잇 맨즈']
  },
  '/board/terms': {
    title: '약관 및 정책 | 미드나잇 맨즈',
    description: '이용약관과 운영정책, 개인정보 정책을 확인하세요.',
    keywords: ['이용약관', '운영정책', '개인정보 처리방침', '미드나잇 맨즈']
  }
};

// 클라이언트 라우터의 /community/:board 패턴과 동일한 게시판 목록입니다.
const COMMUNITY_BOARD_SEO = {
  free: { name: '자유게시판', description: '남성 유흥 커뮤니티 자유게시판에서 밤문화 일상과 업소 이야기를 자유롭게 나눠보세요.', keywords: ['자유게시판', '유흥 커뮤니티', '밤문화'] },
  anon: { name: '익명게시판', description: '익명게시판에서 부담 없이 업소 정보와 유흥 고민을 공유해보세요.', keywords: ['익명게시판', '익명 커뮤니티', '유흥 고민'] },
  review: { name: '후기게시판', description: '실제 방문 회원이 작성한 업소 리얼 후기와 가격 정보를 확인하세요.', keywords: ['업소 후기', '리얼 후기', '방문 후기', '업소 가격'] },
  story: { name: '썰게시판', description: '화류계와 밤문화에서 겪은 재미있는 썰을 읽고 공유해보세요.', keywords: ['유흥 썰', '화류계 썰', '밤문화 썰'] },
  piece: { name: '조각게시판', description: '함께 방문할 조각 모집 글을 확인하고 참여해보세요.', keywords: ['조각 모집', '유흥 조각', '조각게시판'] },
  attendance: { name: '출석게시판', description: '매일 출석 체크로 미드나잇 맨즈 커뮤니티 활동 포인트를 모아보세요.', keywords: ['출석게시판', '출석 체크', '커뮤니티 포인트'] },
  question: { name: '질문게시판', description: '업소 이용, 지역, 가격 등 궁금한 점을 질문하고 회원 답변을 받아보세요.', keywords: ['질문게시판', '업소 질문', '유흥 질문'] },
  event: { name: '이벤트게시판', description: '미드나잇 맨즈와 제휴 업소의 진행 중인 이벤트 소식을 확인하세요.', keywords: ['업소 이벤트', '유흥 이벤트', '할인 이벤트'] },
  promotion: { name: '홍보게시판', description: '제휴 업소 홍보 글과 최신 프로모션 정보를 확인하세요.', keywords: ['업소 홍보', '유흥 프로모션', '업소 할인'] }
};

Object.entries(COMMUNITY_BOARD_SEO).forEach(([slug, board]) => {
  SEO_PAGE_CONFIG[`/community/${slug}`] = {
    title: `${board.name} | 남성 유흥 커뮤니티 | 미드나잇 맨즈`,
    description: board.description,
    keywords: [...board.keywords, '남성 유흥 커뮤니티', '미드나잇 맨즈', HIDDEN_SEARCH_KEYWORD],
    breadcrumbs: [
      { name: '커뮤니티', path: '/community' },
      { name: board.name, path: `/community/${slug}` }
    ]
  };
});

const NOINDEX_PATH_PREFIXES = ['/admin/', '/my-page/', '/my-inquiries/', '/piece-chat/', '/@'];

// 서버가 SPA로 응답하는 경로 목록입니다. 여기에 없는 경로는 404 상태로 응답합니다.
const SPA_DYNAMIC_PATH_PATTERNS = [
  /^\/post-detail\/[^/]+$/,
  /^\/business-info\/[^/]+$/,
  /^\/piece-chat\/[^/]+$/,
  /^\/my-inquiries\/[^/]+$/,
  /^\/admin\/inquiries\/[^/]+\/answer$/,
  /^\/@[^/]+$/
];
const SPA_EXTRA_PATHS = new Set(['/bamcheat']);

const NOINDEX_PATHS = new Set([
  '/login',
  '/register',
  '/create',
  '/my-page',
  '/my-page/profile',
  '/my-page/activity',
  '/my-page/points',
  '/my-page/stamps',
  '/jump-management',
  '/admin',
  '/admin/support/create',
  '/find-account',
  '/stamp-purchase',
  '/ad-purchase',
  '/ad-order-history',
  '/stamp-event-management',
  '/business-apply',
  '/ad-profile-management',
  '/banner-ad-management',
  '/business-management',
  '/customer-service',
  '/my-inquiries',
  '/404'
]);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonForHtml(payload) {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateText(value = '', maxLength = 150) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function parsePostImageUrls(post) {
  if (Array.isArray(post?.imageUrls)) return post.imageUrls;
  const raw = post?.imageUrls || post?.image_urls;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function absoluteUrl(pathOrUrl = '/') {
  if (/^https?:\/\//i.test(String(pathOrUrl))) return String(pathOrUrl);
  return new URL(String(pathOrUrl || '/'), SITE_ORIGIN).toString();
}

function createDefaultSeo(pathname) {
  const basePath = pathname === '/live' ? '/play/live' : pathname;
  const routeConfig = SEO_PAGE_CONFIG[basePath] || {};
  const noindex = isNoindexPath(basePath);
  const canonicalPath = basePath;
  const title = routeConfig.title || '미드나잇 맨즈';
  const description = routeConfig.description || '남성 유흥 커뮤니티 미드나잇 맨즈에서 최저가 업소 추천, 리얼 후기, 지역별 업소 정보를 빠르게 확인하세요.';
  const keywords = routeConfig.keywords || ['남성 유흥 커뮤니티', '최저가 업소 추천', '업소 리뷰 후기', '지역별 업소 정보', '미드나잇 맨즈'];

  return {
    title,
    description,
    keywords,
    canonicalUrl: absoluteUrl(canonicalPath),
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    ogType: 'website',
    imageUrl: DEFAULT_SHARE_IMAGE_URL,
    breadcrumbs: routeConfig.breadcrumbs || (basePath !== '/' && routeConfig.title
      ? [{ name: routeConfig.title.split(' | ')[0], path: basePath }]
      : [])
  };
}

function isNoindexPath(pathname) {
  return NOINDEX_PATHS.has(pathname)
    || NOINDEX_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isKnownSpaPath(pathname) {
  return Object.prototype.hasOwnProperty.call(SEO_PAGE_CONFIG, pathname)
    || NOINDEX_PATHS.has(pathname)
    || SPA_EXTRA_PATHS.has(pathname)
    || SPA_DYNAMIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function createNotFoundSeo() {
  return {
    title: '404 Not Found | 미드나잇 맨즈',
    description: '요청하신 페이지를 찾을 수 없습니다.',
    keywords: [],
    canonicalUrl: absoluteUrl('/404'),
    robots: 'noindex, nofollow',
    ogType: 'website',
    imageUrl: DEFAULT_SHARE_IMAGE_URL,
    breadcrumbs: [],
    notFound: true
  };
}

function getLastPathSegment(pathname = '') {
  const segment = String(pathname).split('/').filter(Boolean).pop() || '';
  try {
    return decodeURIComponent(segment).trim();
  } catch (error) {
    return segment.trim();
  }
}

async function createPostSeo(req) {
  if (!isDatabaseReady) return null;

  try {
    const slug = getLastPathSegment(req.path);
    const post = await postModel.findPostDetailBySlug(slug);
    if (!post || Number(post.isHidden || post.is_hidden || 0) === 1) return createNotFoundSeo();

    const titleText = stripHtml(post.title || '게시글 상세');
    const description = truncateText(post.content, 150) || '미드나잇 맨즈 커뮤니티 게시글 상세 내용을 확인하세요.';
    const imageUrl = parsePostImageUrls(post).find(Boolean);
    const canonicalSlug = createSeoSlugWithId(titleText, post.id, 'post');
    const canonicalPath = `/post-detail/${encodeURIComponent(canonicalSlug)}`;
    const boardSlug = String(post.boardType || '').toLowerCase();
    const board = COMMUNITY_BOARD_SEO[boardSlug];
    const isAnonymousBoard = boardSlug === 'anon';

    return {
      title: `${titleText} | ${board ? `${board.name} | ` : ''}미드나잇 맨즈`,
      description,
      keywords: [board?.name, '업소 리뷰', '방문 후기', '업소 가격 정보', '추천 업소', '커뮤니티 후기'].filter(Boolean),
      canonicalUrl: absoluteUrl(canonicalPath),
      canonicalSlug,
      robots: 'index, follow',
      ogType: 'article',
      imageUrl: imageUrl ? absoluteUrl(imageUrl) : DEFAULT_SHARE_IMAGE_URL,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt || post.createdAt,
      structuredDataType: 'Article',
      authorName: isAnonymousBoard ? '' : stripHtml(post.authorNickname || ''),
      section: board?.name || '',
      headline: titleText,
      bodyText: truncateText(post.content, 2000),
      breadcrumbs: [
        { name: '커뮤니티', path: '/community' },
        ...(board ? [{ name: board.name, path: `/community/${boardSlug}` }] : []),
        { name: titleText, path: canonicalPath }
      ]
    };
  } catch (error) {
    console.error('post SEO metadata failed:', error.message);
    return null;
  }
}


async function createBusinessAdSeo(req) {
  if (!isDatabaseReady) return null;

  try {
    const slug = getLastPathSegment(req.path);
    const ad = await adminModel.findPublicBusinessAdBySlug(slug);
    if (!ad) return createNotFoundSeo();

    const titleText = stripHtml(ad.title || ad.businessName || '업체정보 상세');
    const locationText = [ad.region, ad.district, ad.category].map((item) => stripHtml(item)).filter(Boolean).join(' ');
    const description = truncateText(ad.description, 150) || `${locationText ? `${locationText} ` : ''}${titleText} 업체정보를 확인하세요.`;
    // 업체 상세 조회는 제목 기반 slug를 사용하므로 리다이렉트 대상도 같은 기준으로 맞춥니다.
    const canonicalSlug = createSeoSlugWithId(ad.title || ad.businessName, ad.id, 'business');
    const canonicalPath = `/business-info/${encodeURIComponent(canonicalSlug)}`;

    return {
      title: `${titleText}${locationText ? ` | ${locationText}` : ''} | 미드나잇 맨즈`,
      description,
      keywords: ['업체정보', titleText, ad.region, ad.district, ad.category, '미드나잇 맨즈', HIDDEN_SEARCH_KEYWORD].filter(Boolean),
      canonicalUrl: absoluteUrl(canonicalPath),
      canonicalSlug,
      robots: 'index, follow',
      ogType: 'website',
      imageUrl: ad.imageUrl ? absoluteUrl(ad.imageUrl) : DEFAULT_SHARE_IMAGE_URL,
      modifiedTime: ad.updatedAt || ad.activatedAt || ad.createdAt,
      structuredDataType: 'LocalBusiness',
      businessName: stripHtml(ad.businessName || titleText),
      addressRegion: stripHtml(ad.region || ''),
      addressLocality: stripHtml(ad.district || ''),
      section: stripHtml(ad.category || ''),
      headline: titleText,
      bodyText: truncateText(ad.description, 2000),
      breadcrumbs: [
        { name: '업체정보', path: '/business-info' },
        { name: titleText, path: canonicalPath }
      ]
    };
  } catch (error) {
    console.error('business ad SEO metadata failed:', error.message);
    return null;
  }
}

const SITE_PUBLIC_LINKS = [
  { name: '홈', path: '/' },
  { name: '커뮤니티', path: '/community' },
  ...Object.entries(COMMUNITY_BOARD_SEO).map(([slug, board]) => ({ name: board.name, path: `/community/${slug}` })),
  { name: '업체정보', path: '/business-info' },
  { name: '실시간 출근부', path: '/play/live' },
  { name: 'RBTI', path: '/play/rbti' },
  { name: '룸빵위키', path: '/play/wiki' },
  { name: '월간 랭킹', path: '/play/ranking' },
  { name: '공지 및 고객지원', path: '/support' },
  { name: 'FAQ', path: '/support/faq' },
  { name: '약관 및 정책', path: '/board/terms' }
];

function toIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildStructuredData(seo) {
  const websiteId = `${SITE_ORIGIN}/#website`;
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const pageId = `${seo.canonicalUrl}#webpage`;
  const breadcrumbs = [{ name: '홈', path: '/' }, ...(seo.breadcrumbs || [])];
  const graph = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: "Midnight Men's",
      alternateName: '미드나잇 맨즈',
      url: `${SITE_ORIGIN}/`,
      inLanguage: 'ko-KR',
      publisher: { '@id': organizationId }
    },
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: "Midnight Men's",
      alternateName: '미드나잇 맨즈',
      url: `${SITE_ORIGIN}/`,
      logo: { '@type': 'ImageObject', url: DEFAULT_SHARE_IMAGE_URL }
    },
    {
      '@type': 'WebPage',
      '@id': pageId,
      name: seo.title,
      description: seo.description,
      url: seo.canonicalUrl,
      inLanguage: 'ko-KR',
      isPartOf: { '@id': websiteId },
      primaryImageOfPage: { '@type': 'ImageObject', url: seo.imageUrl },
      ...(breadcrumbs.length > 1 ? { breadcrumb: { '@id': `${seo.canonicalUrl}#breadcrumb` } } : {}),
      ...(toIsoDate(seo.publishedTime) ? { datePublished: toIsoDate(seo.publishedTime) } : {}),
      ...(toIsoDate(seo.modifiedTime) ? { dateModified: toIsoDate(seo.modifiedTime) } : {})
    }
  ];

  if (breadcrumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${seo.canonicalUrl}#breadcrumb`,
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path)
      }))
    });
  }

  if (seo.structuredDataType === 'Article') {
    graph.push({
      '@type': 'Article',
      '@id': `${seo.canonicalUrl}#article`,
      headline: String(seo.headline || seo.title).slice(0, 110),
      description: seo.description,
      image: [seo.imageUrl],
      keywords: seo.keywords,
      articleSection: seo.section || undefined,
      datePublished: toIsoDate(seo.publishedTime),
      dateModified: toIsoDate(seo.modifiedTime),
      author: seo.authorName
        ? { '@type': 'Person', name: seo.authorName }
        : { '@id': organizationId },
      publisher: { '@id': organizationId },
      mainEntityOfPage: { '@id': pageId },
      inLanguage: 'ko-KR'
    });
  }

  if (seo.structuredDataType === 'LocalBusiness') {
    const hasAddress = Boolean(seo.addressRegion || seo.addressLocality);
    graph.push({
      '@type': 'LocalBusiness',
      '@id': `${seo.canonicalUrl}#business`,
      name: seo.businessName || seo.headline,
      description: seo.description,
      image: seo.imageUrl,
      url: seo.canonicalUrl,
      ...(hasAddress ? {
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'KR',
          ...(seo.addressRegion ? { addressRegion: seo.addressRegion } : {}),
          ...(seo.addressLocality ? { addressLocality: seo.addressLocality } : {})
        }
      } : {}),
      mainEntityOfPage: { '@id': pageId }
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

// Vue가 #app에 마운트되면 교체되는 초기 HTML입니다. JS를 실행하지 않는 검색 로봇도 본문과 내부 링크를 읽을 수 있습니다.
function renderSeoFallbackBody(seo) {
  const crumbs = [{ name: '홈', path: '/' }, ...(seo.breadcrumbs || [])];
  const breadcrumbHtml = crumbs.length > 1
    ? `<nav aria-label="breadcrumb"><ol>${crumbs.map((crumb) => `<li><a href="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</a></li>`).join('')}</ol></nav>`
    : '';
  const dateValue = seo.publishedTime || seo.modifiedTime;
  const metaLine = [
    seo.section,
    [seo.addressRegion, seo.addressLocality].filter(Boolean).join(' '),
    dateValue ? formatSitemapDate(dateValue) : ''
  ].filter(Boolean).map(escapeHtml).join(' · ');
  const bodyText = seo.bodyText || seo.description;
  const navHtml = `<nav aria-label="사이트 메뉴"><ul>${SITE_PUBLIC_LINKS.map((link) => `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.name)}</a></li>`).join('')}</ul></nav>`;

  return [
    '<div class="seo-fallback">',
    `<header><a href="/">미드나잇 맨즈</a></header>`,
    breadcrumbHtml,
    '<main>',
    `<h1>${escapeHtml(seo.headline || String(seo.title).split(' | ')[0])}</h1>`,
    metaLine ? `<p>${metaLine}</p>` : '',
    `<p>${escapeHtml(bodyText)}</p>`,
    '</main>',
    navHtml,
    '</div>'
  ].filter(Boolean).join('');
}

function renderSeoHtml(indexHtml, seo) {
  const structuredData = buildStructuredData(seo);
  const articleTags = seo.ogType === 'article'
    ? [
      toIsoDate(seo.publishedTime) ? `<meta property="article:published_time" content="${escapeHtml(toIsoDate(seo.publishedTime))}" />` : '',
      toIsoDate(seo.modifiedTime) ? `<meta property="article:modified_time" content="${escapeHtml(toIsoDate(seo.modifiedTime))}" />` : '',
      seo.section ? `<meta property="article:section" content="${escapeHtml(seo.section)}" />` : ''
    ].filter(Boolean)
    : [];

  const seoTags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="keywords" content="${escapeHtml((seo.keywords || []).join(', '))}" />`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:type" content="${escapeHtml(seo.ogType || 'website')}" />`,
    `<meta property="og:site_name" content="Midnight Men's" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(seo.imageUrl)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(seo.imageUrl)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(seo.headline || seo.title)}" />`,
    ...articleTags,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.imageUrl)}" />`,
    `<script type="application/ld+json" data-seo-jsonld="server">${escapeJsonForHtml(structuredData)}</script>`,
    `<script>window.MNMS_PUBLIC_CONFIG=${escapeJsonForHtml({ kakaoJavascriptKey: KAKAO_JAVASCRIPT_KEY, isLocalEnv: IS_LOCAL_ENV, allowDevtools: ALLOW_DEVTOOLS_DETECTION_BYPASS })};</script>`
  ].join('\n  ');

  return indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '\n')
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, '\n')
    .replace(/\s*<script\s+type="application\/ld\+json"\s+data-seo-jsonld="server">[\s\S]*?<\/script>\s*/gi, '\n')
    .replace('</head>', `  ${seoTags}\n</head>`)
    .replace('<div id="app"></div>', `<div id="app">${renderSeoFallbackBody(seo)}</div>`);
}


function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatSitemapDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatRssDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function createRssItem(item) {
  const title = stripHtml(item.title || '게시글');
  const link = absoluteUrl(item.link || '/play/live');
  const guid = item.guid || link;
  const description = truncateText(item.description || item.content, 300) || '미드나잇 맨즈 최신 정보를 확인하세요.';
  const isPermaLink = item.guid ? 'false' : 'true';

  return [
    '    <item>',
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="${isPermaLink}">${escapeXml(guid)}</guid>`,
    `      <description>${escapeXml(description)}</description>`,
    `      <pubDate>${escapeXml(formatRssDate(item.createdAt))}</pubDate>`,
    item.category ? `      <category>${escapeXml(item.category)}</category>` : '',
    '    </item>'
  ].filter(Boolean).join('\n');
}

function createPostRssItem(post) {
  const title = stripHtml(post.title || '게시글');
  return {
    title,
    link: `/post-detail/${encodeURIComponent(createSeoSlugWithId(title, post.id, 'post'))}`,
    description: post.content,
    createdAt: post.createdAt,
    category: post.boardType
  };
}

function createBusinessAdRssItem(ad) {
  const title = stripHtml(ad.title || ad.businessName || '업체정보');
  const location = [ad.region, ad.district].filter(Boolean).join(' ');
  const summaryParts = [
    location,
    ad.category,
    stripHtml(ad.description || '')
  ].filter(Boolean);

  return {
    title: `[업체정보] ${title}`,
    link: `/business-info/${encodeURIComponent(createSeoSlugWithId(title, ad.id, 'business'))}`,
    guid: `business-ad-${ad.id}`,
    description: summaryParts.join(' · ') || '미드나잇 맨즈 업체정보에서 최신 등록 업체를 확인하세요.',
    createdAt: ad.updatedAt || ad.activatedAt || ad.createdAt,
    category: '업체정보'
  };
}

async function buildRssXml() {
  let posts = [];
  let liveItems = [];
  let businessAds = [];

  if (isDatabaseReady) {
    [posts, liveItems, businessAds] = await Promise.all([
      postModel.listSeoRssPosts(50).catch((error) => {
        console.error('RSS post feed generation failed:', error.message);
        return [];
      }),
      liveModel.listSeoRssLiveItems(20).catch((error) => {
        console.error('RSS LIVE feed generation failed:', error.message);
        return [];
      }),
      adminModel.listSeoRssBusinessAds(30).catch((error) => {
        console.error('RSS business feed generation failed:', error.message);
        return [];
      })
    ]);
  }

  const rssItems = [
    ...posts.map(createPostRssItem),
    ...liveItems.map((item) => ({ ...item, link: '/play/live' })),
    ...businessAds.map(createBusinessAdRssItem)
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const lastBuildDate = rssItems[0]?.createdAt || new Date();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Midnight Men&apos;s</title>',
    `    <link>${escapeXml(absoluteUrl('/'))}</link>`,
    '    <description>미드나잇 맨즈 커뮤니티 게시글, LIVE 최신 데이터, 업체정보 RSS 피드입니다.</description>',
    '    <language>ko-KR</language>',
    `    <lastBuildDate>${escapeXml(formatRssDate(lastBuildDate))}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />`,
    ...rssItems.map(createRssItem),
    '  </channel>',
    '</rss>'
  ].join('\n');
}

function createSitemapUrl({ loc, changefreq, priority, lastmod }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(formatSitemapDate(lastmod))}</lastmod>` : '',
    changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : '',
    priority ? `    <priority>${escapeXml(priority)}</priority>` : '',
    '  </url>'
  ].filter(Boolean).join('\n');
}

function inferSitemapMetadata(pathname) {
  if (pathname === '/') return { changefreq: 'daily', priority: '1.0' };
  if (pathname === '/community' || pathname === '/play/live') return { changefreq: 'hourly', priority: '0.9' };
  if (pathname.startsWith('/community/')) return { changefreq: 'hourly', priority: '0.8' };
  if (pathname === '/business-info') return { changefreq: 'daily', priority: '0.8' };
  if (pathname === '/play' || pathname === '/play/wiki') return { changefreq: 'weekly', priority: '0.7' };
  if (pathname === '/support') return { changefreq: 'weekly', priority: '0.6' };
  if (pathname === '/support/faq' || pathname === '/play/ranking') return { changefreq: 'weekly', priority: '0.5' };
  return { changefreq: 'monthly', priority: '0.4' };
}

function listStaticSitemapUrls() {
  return Object.keys(SEO_PAGE_CONFIG)
    .filter((pathname) => !NOINDEX_PATHS.has(pathname))
    .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)))
    .map((pathname) => ({
      loc: absoluteUrl(pathname),
      ...inferSitemapMetadata(pathname)
    }));
}

async function buildSitemapXml() {
  const staticUrls = listStaticSitemapUrls();

  let dynamicUrls = [];
  if (isDatabaseReady) {
    const [posts, businessAds] = await Promise.all([
      postModel.listSeoSitemapPosts?.(1000).catch((error) => {
        console.error('post sitemap generation failed:', error.message);
        return [];
      }) || [],
      adminModel.listSeoSitemapBusinessAds?.(300).catch((error) => {
        console.error('business sitemap generation failed:', error.message);
        return [];
      }) || []
    ]);

    dynamicUrls = [
      ...posts.map((post) => ({
        loc: absoluteUrl(`/post-detail/${encodeURIComponent(createSeoSlugWithId(post.title, post.id, 'post'))}`),
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: post.updatedAt || post.createdAt
      })),
      ...businessAds.map((ad) => ({
        loc: absoluteUrl(`/business-info/${encodeURIComponent(createSeoSlugWithId(ad.title || ad.businessName, ad.id, 'business'))}`),
        changefreq: 'daily',
        priority: '0.7',
        lastmod: ad.updatedAt || ad.activatedAt || ad.createdAt
      }))
    ];
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...staticUrls, ...dynamicUrls].map(createSitemapUrl),
    '</urlset>'
  ].join('\n');
}


async function sendSeoIndex(req, res, statusCode = 200) {
  if (!isKnownSpaPath(req.path)) {
    const indexHtml = await fs.promises.readFile(INDEX_HTML_PATH, 'utf8');
    res.status(404).type('html').send(renderSeoHtml(indexHtml, createNotFoundSeo()));
    return;
  }

  const dynamicSeo = req.path.startsWith('/post-detail/')
    ? await createPostSeo(req)
    : req.path.startsWith('/business-info/')
      ? await createBusinessAdSeo(req)
      : null;

  // 제목이 바뀌었거나 id만 있는 주소로 들어오면 대표 주소로 영구 이동시켜 중복 색인을 막습니다.
  if (dynamicSeo?.canonicalSlug && getLastPathSegment(req.path) !== dynamicSeo.canonicalSlug) {
    const queryIndex = req.originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    res.redirect(301, `${new URL(dynamicSeo.canonicalUrl).pathname}${query}`);
    return;
  }

  const indexHtml = await fs.promises.readFile(INDEX_HTML_PATH, 'utf8');
  const seo = dynamicSeo || createDefaultSeo(req.path);
  res.status(seo.notFound ? 404 : statusCode).type('html').send(renderSeoHtml(indexHtml, seo));
}

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

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next();
    return;
  }

  const acceptsHtml = String(req.headers.accept || '').includes('text/html');
  const isStaticAssetRequest = path.extname(req.path || '') !== '';

  if (!acceptsHtml || isStaticAssetRequest) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  let visitorKey = String(cookies.mnms_visitor || '').trim();

  if (!visitorKey) {
    visitorKey = crypto.randomUUID();
    const cookieAttrs = [
      `mnms_visitor=${encodeURIComponent(visitorKey)}`,
      'Path=/',
      `Max-Age=${60 * 60 * 24 * 365}`,
      'SameSite=Lax',
      'HttpOnly'
    ];
    if (req.secure) cookieAttrs.push('Secure');
    res.append('Set-Cookie', cookieAttrs.join('; '));
  }

  if (isDatabaseReady) {
    adminModel.recordSiteVisit({ visitorKey, path: req.path || '/' }).catch((error) => {
      console.error('site visit log failed:', error.message);
    });
  }

  next();
});


app.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method) || req.path === '/' || !req.path.endsWith('/') || req.path.startsWith('/api/')) {
    next();
    return;
  }

  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  const normalizedPath = req.path.replace(/\/+$/, '') || '/';
  res.redirect(301, `${normalizedPath}${query}`);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', `public, max-age=${ONE_DAY_IN_SECONDS}`);
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /my-page',
    'Disallow: /my-inquiries',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /create',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    `RSS: ${absoluteUrl('/rss.xml')}`,
    ''
  ].join('\n'));
});


app.get('/sitemap.xml', (req, res, next) => {
  buildSitemapXml()
    .then((xml) => {
      res.type('application/xml').set('Cache-Control', `public, max-age=${ONE_HOUR_IN_SECONDS}, stale-while-revalidate=${ONE_DAY_IN_SECONDS}`).send(xml);
    })
    .catch(next);
});

app.get('/rss.xml', (req, res, next) => {
  buildRssXml()
    .then((xml) => {
      res.type('application/rss+xml').set('Cache-Control', 'no-cache, no-store, must-revalidate').send(xml);
    })
    .catch(next);
});

app.use(express.static(FRONTEND_DIR, {
  index: false,
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    const extension = path.extname(filePath || '').toLowerCase();
    if (extension === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }

    if (['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(extension)) {
      const isImageAsset = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(extension);
      const cacheMaxAge = isImageAsset ? ONE_YEAR_IN_SECONDS : ONE_HOUR_IN_SECONDS;
      const cacheDirective = isImageAsset
        ? `public, max-age=${cacheMaxAge}, immutable`
        : `public, max-age=${cacheMaxAge}, must-revalidate`;
      res.setHeader('Cache-Control', cacheDirective);
    }
  }
}));

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/live') || req.path.startsWith('/rbti')) {
    return next();
  }

  if (!isDatabaseReady) {
    return res.status(503).json({ message: '데이터베이스 연결이 준비되지 않았습니다.' });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/piece-chats', pieceChatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/rbti', rbtiRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/bamcheat', bamcheatRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/api/posters', posterRoutes);

app.get('/live', (req, res) => {
  res.redirect(301, '/play/live');
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not Found' });
  sendSeoIndex(req, res).catch(next);
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = Number(err.status || err.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  res.status(safeStatus).json({
    message: err.message || '서버 오류가 발생했습니다.',
    detail: safeStatus >= 500 ? err.message : undefined
  });
});

Promise.resolve()
  .then(() => ensureS3BucketExists())
  .then((result) => {
    if (result?.enabled) {
      console.log(`S3 bucket ready: ${result.bucketName}${result.created ? ' (created)' : ''}`);
    } else {
      console.log('S3 upload disabled: S3_BUCKET_NAME 미설정');
    }
  })
  .catch((error) => {
    console.error('S3 초기화 실패:', error.message);
    console.log('S3가 비활성화된 상태로 계속 진행합니다.');
  })
  .then(() => initDatabase())
  .then(() => {
    isDatabaseReady = true;
    return Promise.all([
      startLiveHistoryScheduler().catch((error) => {
        console.error('LIVE history scheduler start failed:', error.message);
      }),
      startBusinessAdRenewalScheduler().catch((error) => {
        console.error('Business ad renewal scheduler start failed:', error.message);
      }),
      Promise.resolve(startBusinessAdJumpScheduleScheduler()).catch((error) => {
        console.error('Business ad jump schedule scheduler start failed:', error.message);
      }),
      Promise.resolve().then(() => startBannerAuctionSettleScheduler()).catch((error) => {
        console.error('Banner auction settle scheduler start failed:', error.message);
      })
    ])
      .then(() => {
        app.listen(PORT, () => {
          console.log(`Express MVC server running on http://localhost:${PORT}`);
          console.log(`DB mode: ${useLocalDb ? 'local' : 'deployed'}`);
          console.log(`MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
          if (isS3UploadEnabled()) {
            console.log(`S3 uploads: enabled (${s3BucketName})`);
          }
        });
      });
  })
  .catch((error) => {
    console.error('DB 초기화 실패:', error.message);
    startLiveHistoryScheduler()
      .catch((schedulerError) => {
        console.error('LIVE history scheduler start failed:', schedulerError.message);
      })
      .finally(() => {
        app.listen(PORT, () => {
          console.log(`Express MVC server running on http://localhost:${PORT}`);
          console.log(`DB mode: ${useLocalDb ? 'local' : 'deployed'}`);
          console.log('DB 연결 실패 상태로 실행 중입니다. API 요청은 503을 반환합니다.');
          if (isS3UploadEnabled()) {
            console.log(`S3 uploads: enabled (${s3BucketName})`);
          }
        });
      });
  });
