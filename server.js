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
const adminModel = require('./src/backend/models/adminModel');
const postModel = require('./src/backend/models/postModel');
const liveModel = require('./src/backend/models/liveModel');
const { startLiveHistoryScheduler } = require('./src/backend/utils/liveHistoryScheduler');
const { startBusinessAdRenewalScheduler, startBusinessAdJumpScheduleScheduler } = adminModel;
const { createSeoSlug } = require('./src/backend/utils/seoSlug');
const { ensureS3BucketExists, isS3UploadEnabled, s3BucketName } = require('./src/backend/config/s3');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_DIR = path.join(__dirname, 'src/frontend');
const INDEX_HTML_PATH = path.join(FRONTEND_DIR, 'index.html');
const SITE_ORIGIN = String(process.env.SITE_ORIGIN || process.env.PUBLIC_SITE_URL || 'https://nightmens.com').replace(/\/$/, '');
const KAKAO_MAP_APP_KEY = String(process.env.PUBLIC_KAKAO_MAP_APP_KEY || process.env.KAKAO_MAP_JAVASCRIPT_KEY || process.env.KAKAO_MAP_APP_KEY || '').trim();
const IS_LOCAL_ENV = process.env.MNMS_ENV_LOCAL_LOADED === 'true';
const ALLOW_DEVTOOLS_DETECTION_BYPASS = ['true', '1', 'yes', 'on'].includes(
  String(process.env.MNMS_ALLOW_DEVTOOLS || process.env.PUBLIC_ALLOW_DEVTOOLS || '').trim().toLowerCase()
);
const DEFAULT_SHARE_IMAGE_URL = absoluteUrl('/src/assets/live-avatars/brand-logo3.png');
let isDatabaseReady = false;
const trustProxyValue = String(process.env.TRUST_PROXY || '1').trim();

app.set('trust proxy', trustProxyValue);

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
    title: '업소 추천 커뮤니티 | 미드나잇 맨즈',
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
    title: '룸빵위키 | 화류업계 용어사전 | 미드나잇 맨즈',
    description: '룸빵위키에서 화류업계 용어와 은어를 카테고리별로 검색하고 쉽게 확인하세요.',
    keywords: ['룸빵위키', '화류업계 용어', '화류 용어사전', '유흥 용어', '룸빵 용어', '미드나잇 맨즈']
  },
  '/my-page/support': {
    title: '고객센터 | 미드나잇 맨즈',
    description: '문의, FAQ, 공지사항 등 고객지원 메뉴를 확인하세요.',
    keywords: ['고객센터', '공지사항', 'FAQ', '고객지원', '미드나잇 맨즈']
  },
  '/my-page/policy': {
    title: '약관 및 정책 | 미드나잇 맨즈',
    description: '서비스 이용약관과 개인정보 처리방침을 확인하세요.',
    keywords: ['이용약관', '개인정보 처리방침', '운영정책', '미드나잇 맨즈']
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
  const noindex = NOINDEX_PATHS.has(basePath)
    || basePath.startsWith('/admin/')
    || basePath.startsWith('/my-inquiries/');
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
    imageUrl: DEFAULT_SHARE_IMAGE_URL
  };
}

async function createPostSeo(req) {
  if (!isDatabaseReady) return null;

  try {
    const slug = String(req.path.split('/').filter(Boolean).pop() || '').trim();
    const post = await postModel.findPostDetailBySlug(slug);
    if (!post || Number(post.isHidden || post.is_hidden || 0) === 1) return null;

    const titleText = stripHtml(post.title || '게시글 상세');
    const description = truncateText(post.content, 150) || '미드나잇 맨즈 커뮤니티 게시글 상세 내용을 확인하세요.';
    const imageUrl = parsePostImageUrls(post).find(Boolean);
    const canonicalUrl = absoluteUrl(`/post-detail/${encodeURIComponent(createSeoSlug(titleText, `post-${post.id}`))}`);

    return {
      title: `${titleText} | 미드나잇 맨즈`,
      description,
      keywords: ['업소 리뷰', '방문 후기', '업소 가격 정보', '추천 업소', '커뮤니티 후기'],
      canonicalUrl,
      robots: 'index, follow',
      ogType: 'article',
      imageUrl: imageUrl || DEFAULT_SHARE_IMAGE_URL,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      structuredDataType: 'Article'
    };
  } catch (error) {
    console.error('post SEO metadata failed:', error.message);
    return null;
  }
}


async function createBusinessAdSeo(req) {
  if (!isDatabaseReady) return null;

  try {
    const slug = String(req.path.split('/').filter(Boolean).pop() || '').trim();
    const ad = await adminModel.findPublicBusinessAdBySlug(slug);
    if (!ad) return null;

    const titleText = stripHtml(ad.title || ad.businessName || '업체정보 상세');
    const locationText = [ad.region, ad.district, ad.category].map((item) => stripHtml(item)).filter(Boolean).join(' ');
    const description = truncateText(ad.description, 150) || `${locationText ? `${locationText} ` : ''}${titleText} 업체정보를 확인하세요.`;
    const canonicalUrl = absoluteUrl(`/business-info/${encodeURIComponent(createSeoSlug(titleText, `business-${ad.id}`))}`);

    return {
      title: `${titleText} | 미드나잇 맨즈`,
      description,
      keywords: ['업체정보', titleText, ad.region, ad.district, ad.category, '미드나잇 맨즈', HIDDEN_SEARCH_KEYWORD].filter(Boolean),
      canonicalUrl,
      robots: 'index, follow',
      ogType: 'website',
      imageUrl: ad.imageUrl || DEFAULT_SHARE_IMAGE_URL,
      structuredDataType: 'LocalBusiness'
    };
  } catch (error) {
    console.error('business ad SEO metadata failed:', error.message);
    return null;
  }
}

function renderSeoHtml(indexHtml, seo) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': seo.structuredDataType || (seo.ogType === 'article' ? 'Article' : 'WebPage'),
    name: seo.title,
    headline: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    url: seo.canonicalUrl,
    image: seo.imageUrl,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: "Midnight Men's",
      url: SITE_ORIGIN
    }
  };

  if (seo.publishedTime) structuredData.datePublished = seo.publishedTime;
  if (seo.modifiedTime) structuredData.dateModified = seo.modifiedTime;

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
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.imageUrl)}" />`,
    `<script type="application/ld+json" data-seo-jsonld="server">${escapeJsonForHtml(structuredData)}</script>`,
    `<script>window.MNMS_PUBLIC_CONFIG=${escapeJsonForHtml({ kakaoMapAppKey: KAKAO_MAP_APP_KEY, isLocalEnv: IS_LOCAL_ENV, allowDevtools: ALLOW_DEVTOOLS_DETECTION_BYPASS })};</script>`
  ].join('\n  ');

  return indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '\n')
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, '\n')
    .replace(/\s*<script\s+type="application\/ld\+json"\s+data-seo-jsonld="server">[\s\S]*?<\/script>\s*/gi, '\n')
    .replace('</head>', `  ${seoTags}\n</head>`);
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
    link: `/post-detail/${encodeURIComponent(createSeoSlug(title, `post-${post.id}`))}`,
    description: post.content,
    createdAt: post.createdAt,
    category: post.boardType
  };
}

async function buildRssXml() {
  let posts = [];
  let liveItems = [];

  if (isDatabaseReady) {
    [posts, liveItems] = await Promise.all([
      postModel.listSeoRssPosts(50).catch((error) => {
        console.error('RSS post feed generation failed:', error.message);
        return [];
      }),
      liveModel.listSeoRssLiveItems(20).catch((error) => {
        console.error('RSS LIVE feed generation failed:', error.message);
        return [];
      })
    ]);
  }

  const rssItems = [
    ...posts.map(createPostRssItem),
    ...liveItems.map((item) => ({ ...item, link: '/play/live' }))
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const lastBuildDate = rssItems[0]?.createdAt || new Date();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Midnight Men&apos;s</title>',
    `    <link>${escapeXml(absoluteUrl('/'))}</link>`,
    '    <description>미드나잇 맨즈 커뮤니티 게시글과 LIVE 최신 데이터 RSS 피드입니다.</description>',
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
  if (pathname === '/business-info') return { changefreq: 'daily', priority: '0.8' };
  if (pathname === '/play' || pathname === '/play/wiki') return { changefreq: 'weekly', priority: '0.7' };
  if (pathname === '/support' || pathname === '/my-page/support') return { changefreq: 'weekly', priority: '0.6' };
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
      postModel.listSeoSitemapPosts?.(300).catch((error) => {
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
        loc: absoluteUrl(`/post-detail/${encodeURIComponent(createSeoSlug(post.title, `post-${post.id}`))}`),
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: post.updatedAt || post.createdAt
      })),
      ...businessAds.map((ad) => ({
        loc: absoluteUrl(`/business-info/${encodeURIComponent(createSeoSlug(ad.title || ad.businessName, `business-${ad.id}`))}`),
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
  const indexHtml = await fs.promises.readFile(INDEX_HTML_PATH, 'utf8');
  const defaultSeo = createDefaultSeo(req.path);
  const dynamicSeo = req.path.startsWith('/post-detail/')
    ? await createPostSeo(req)
    : req.path.startsWith('/business-info/')
      ? await createBusinessAdSeo(req)
      : null;
  res.status(statusCode).type('html').send(renderSeoHtml(indexHtml, dynamicSeo || defaultSeo));
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
