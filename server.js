/**
 * 파일 역할: Node/Express 서버를 초기화하고 백엔드 라우트를 연결하는 진입점 파일.
 */
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const ONE_HOUR_IN_SECONDS = 60 * 60;

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
const adminModel = require('./src/backend/models/adminModel');
const postModel = require('./src/backend/models/postModel');
const { startLiveHistoryScheduler } = require('./src/backend/utils/liveHistoryScheduler');
const { startBusinessAdRenewalScheduler } = adminModel;
const { createSeoSlug } = require('./src/backend/utils/seoSlug');
const { ensureS3BucketExists, isS3UploadEnabled, s3BucketName } = require('./src/backend/config/s3');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_DIR = path.join(__dirname, 'src/frontend');
const INDEX_HTML_PATH = path.join(FRONTEND_DIR, 'index.html');
const SITE_ORIGIN = String(process.env.SITE_ORIGIN || process.env.PUBLIC_SITE_URL || 'https://nightmens.com').replace(/\/$/, '');
const KAKAO_MAP_APP_KEY = String(process.env.PUBLIC_KAKAO_MAP_APP_KEY || process.env.KAKAO_MAP_JAVASCRIPT_KEY || process.env.KAKAO_MAP_APP_KEY || '').trim();
let isDatabaseReady = false;
const trustProxyValue = String(process.env.TRUST_PROXY || '1').trim();

app.set('trust proxy', trustProxyValue);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.all('/kcp/callback', authController.handleKcpCallback);


const SEO_PAGE_CONFIG = {
  '/': {
    title: '남성 유흥 커뮤니티 홈 | 미드나잇 맨즈',
    description: '최저가 업소 추천, 실시간 인기 후기, 지역별 업소 정보를 한 번에 확인하세요.',
    keywords: ['남성 유흥 커뮤니티', '최저가 업소 추천', '업소 후기', '업소 정보', '실시간 인기글']
  },
  '/community': {
    title: '업소 추천 커뮤니티 | 미드나잇 맨즈',
    description: '자유·익명·후기 게시판에서 최저가 업소 추천과 리얼 리뷰 후기를 탐색해보세요.',
    keywords: ['업소 추천 커뮤니티', '리뷰 후기', '최저가 업소', '익명 게시판', '남성 커뮤니티']
  },
  '/business-info': {
    title: '업체정보 | 미드나잇 맨즈',
    description: '등록된 업체 정보를 지역과 업종별로 확인하세요.',
    keywords: ['업체정보', '지역별 업체', '업종별 업체', '미드나잇 맨즈']
  },
  '/play': {
    title: 'PLAY | 미드나잇 맨즈',
    description: 'LIVE와 RBTI를 한 번에 이동할 수 있는 PLAY 메뉴입니다.',
    keywords: ['PLAY', 'LIVE', 'RBTI', '미드나잇 맨즈']
  },
  '/play/live': {
    title: '실시간 출근부 웨이팅 초톡 | 미드나잇 맨즈',
    description: '실시간 업소 출근부 웨이팅 초이스, 엔트리 현황, 오늘의 추천 정보를 빠르게 확인하세요.',
    keywords: ['실시간 업소', '라이브 정보', '오늘의 추천 업소', '엔트리 현황', '지역 업소']
  },
  '/play/rbti': {
    title: 'RBTI 테스트 | 미드나잇 맨즈',
    description: '유흥 MBTI 성향 테스트 RBTI 검사.',
    keywords: ['RBTI', '유흥 MBTI', '성향 테스트', '미드나잇 맨즈']
  },
  '/play/alcohol': {
    title: '음주 측정기 | 미드나잇 맨즈',
    description: '간단한 음주 상태 자가 점검을 위한 음주측정 페이지입니다.',
    keywords: ['음주 측정기', '음주 자가 점검', '미드나잇 맨즈']
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
    imageUrl: absoluteUrl('/src/assets/live-avatars/brand-logo.png')
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
      imageUrl: imageUrl || absoluteUrl('/src/assets/live-avatars/brand-logo.png'),
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
      keywords: ['업체정보', titleText, ad.region, ad.district, ad.category, '미드나잇 맨즈'].filter(Boolean),
      canonicalUrl,
      robots: 'index, follow',
      ogType: 'website',
      imageUrl: ad.imageUrl || absoluteUrl('/src/assets/live-avatars/brand-logo.png'),
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
    `<script>window.MNMS_PUBLIC_CONFIG=${escapeJsonForHtml({ kakaoMapAppKey: KAKAO_MAP_APP_KEY })};</script>`
  ].join('\n  ');

  return indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '\n')
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, '\n')
    .replace(/\s*<script\s+type="application\/ld\+json"\s+data-seo-jsonld="server">[\s\S]*?<\/script>\s*/gi, '\n')
    .replace('</head>', `  ${seoTags}\n</head>`);
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
      res.setHeader('Cache-Control', `public, max-age=${ONE_HOUR_IN_SECONDS}, must-revalidate`);
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
