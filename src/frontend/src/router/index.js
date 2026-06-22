/**
 * 파일 역할: URL 경로를 페이지 렌더러와 연결하는 클라이언트 라우터 파일.
 */
import { createRouter, createWebHistory } from 'vue-router';
import PageView from '../views/PageView.js';

const BRAND_NAME = '미드나잇 맨즈';
const SITE_NAME = 'Midnight Men\'s';
const DEFAULT_TITLE = BRAND_NAME;
const DEFAULT_DESCRIPTION = '남성 유흥 커뮤니티 미드나잇 맨즈에서 최저가 업소 추천, 리얼 후기, 지역별 업소 정보를 빠르게 확인하세요.';
const DEFAULT_SHARE_IMAGE_PATH = '/src/assets/live-avatars/brand-logo.png';

const DEFAULT_KEYWORDS = [
  '남성 유흥 커뮤니티',
  '최저가 업소 추천',
  '업소 리뷰 후기',
  '지역별 업소 정보',
  '미드나잇 맨즈'
];

const routes = [
  { path: '/', component: PageView, meta: { pageKey: 'index', title: '남성 유흥 커뮤니티 홈', description: '최저가 업소 추천, 실시간 인기 후기, 지역별 업소 정보를 한 번에 확인하세요.', keywords: ['남성 유흥 커뮤니티', '최저가 업소 추천', '업소 후기', '업소 정보', '실시간 인기글'] } },
  { path: '/login', component: PageView, meta: { pageKey: 'login', title: '로그인', description: '미드나잇 맨즈 계정으로 로그인하고 커뮤니티 서비스를 이용하세요.', noindex: true } },
  { path: '/register', component: PageView, meta: { pageKey: 'register', title: '회원가입', description: '미드나잇 맨즈 회원가입으로 커뮤니티 활동을 시작하세요.', noindex: true } },
  { path: '/create', component: PageView, meta: { pageKey: 'create-post', title: '게시글 작성', description: '자유게시판, 후기, 질문 게시판에 새 글을 작성해보세요.', noindex: true } },
  { path: '/post-detail/:slug', component: PageView, meta: { pageKey: 'post-detail', title: '업소 리뷰 상세', description: '회원이 작성한 업소 추천 리뷰, 방문 후기, 가격 정보를 상세하게 확인하세요.', keywords: ['업소 리뷰', '방문 후기', '업소 가격 정보', '추천 업소', '커뮤니티 후기'] } },
  { path: '/community', component: PageView, meta: { pageKey: 'community', title: '업소 추천 커뮤니티', description: '자유·익명·후기 게시판에서 최저가 업소 추천과 리얼 리뷰 후기를 탐색해보세요.', keywords: ['업소 추천 커뮤니티', '리뷰 후기', '최저가 업소', '익명 게시판', '남성 커뮤니티', '유흥 커뮤니티', '밤문화'] } },
  { path: '/my-page', component: PageView, meta: { pageKey: 'my-page', title: '마이페이지', description: '내 계정 정보와 활동 내역, 포인트를 확인하세요.', noindex: true } },
  { path: '/my-page/profile', component: PageView, meta: { pageKey: 'my-page-profile', title: '내 프로필', description: '닉네임, 비밀번호 등 내 프로필 정보를 관리하세요.', noindex: true } },
  { path: '/my-page/activity', component: PageView, meta: { pageKey: 'my-page-activity', title: '내 활동', description: '내가 작성한 게시글, 댓글, 활동 기록을 확인하세요.', noindex: true } },
  { path: '/my-page/points', component: PageView, meta: { pageKey: 'my-page-points', title: '포인트', description: '보유 포인트와 적립/차감 내역을 확인하세요.', noindex: true } },
  { path: '/my-page/stamps', component: PageView, meta: { pageKey: 'my-page-stamps', title: '스탬프', description: '보유 스탬프와 적립/사용 내역을 확인하세요.', noindex: true } },
  { path: '/my-page/support', component: PageView, meta: { pageKey: 'my-page-support', title: '고객센터', description: '문의, FAQ, 공지사항 등 고객지원 메뉴를 확인하세요.' } },
  { path: '/my-page/policy', component: PageView, meta: { pageKey: 'my-page-policy', title: '약관 및 정책', description: '서비스 이용약관과 개인정보 처리방침을 확인하세요.' } },
  { path: '/admin', component: PageView, meta: { pageKey: 'admin', title: '관리자 페이지', description: '관리자 전용 대시보드입니다.', noindex: true } },
  { path: '/admin/support/create', component: PageView, meta: { pageKey: 'support-create', title: '공지/FAQ 작성', description: '관리자 전용 공지사항/FAQ 작성 페이지입니다.', noindex: true } },
  { path: '/admin/inquiries/:id/answer', component: PageView, meta: { pageKey: 'admin-inquiry-answer', title: '문의 답변', description: '관리자 전용 문의 답변 페이지입니다.', noindex: true } },
  { path: '/find-account', component: PageView, meta: { pageKey: 'find-account', title: '아이디/비밀번호 찾기', description: '아이디 또는 비밀번호를 안전하게 찾을 수 있습니다.', noindex: true } },
  { path: '/stamp-purchase', component: PageView, meta: { pageKey: 'stamp-purchase', title: '스탬프 구매', description: '스탬프 상품 구성을 확인하고 구매를 진행하세요.', noindex: true } },
  { path: '/ad-purchase', component: PageView, meta: { pageKey: 'ad-purchase', title: '광고 활성화', description: '광고 요금제와 상품 구성을 확인하고 광고 활성화를 진행하세요.', noindex: true } },
  { path: '/jump-management', component: PageView, meta: { pageKey: 'jump-management', title: '점프 관리', description: '활성화된 업체 광고의 일일 점프 잔여 횟수와 최근 사용 시간을 확인하고 점프를 사용할 수 있습니다.', noindex: true } },
  { path: '/ad-order-history', component: PageView, meta: { pageKey: 'ad-order-history', title: '스탬프 결제 내역', description: '스탬프 결제완료와 결제취소 내역을 확인하세요.', noindex: true } },
  { path: '/stamp-event-management', component: PageView, meta: { pageKey: 'stamp-event-management', title: '스탬프 이벤트 관리', description: '내 광고에 신청된 방문인증/스탬프사용 신청을 관리하세요.', noindex: true } },
  { path: '/business-info', component: PageView, meta: { pageKey: 'business-info', title: '업체정보', description: '등록된 업체 정보를 지역과 업종별로 확인하세요.' } },
  { path: '/bamcheat', component: PageView, meta: { pageKey: 'black-db', title: '밤치트', description: '기업회원 전용 번호 코멘트 검색 페이지입니다.', noindex: true } },
  { path: '/business-info/:slug', component: PageView, meta: { pageKey: 'business-info-detail', title: '업체정보 상세', description: '업체의 상세정보와 전화 연결 버튼을 확인하세요.' } },
  { path: '/business-apply', component: PageView, meta: { pageKey: 'business-apply', title: '기업회원 신청', description: '기업회원 신청 전 안내 사항을 확인하고 필수 동의 후 사업자정보를 제출하세요.', noindex: true } },
  { path: '/ad-profile-management', component: PageView, meta: { pageKey: 'ad-profile-management', title: '광고프로필 관리', description: '광고프로필 기본 정보와 상세 소개를 등록하고 미리보기를 확인하세요.', noindex: true } },
  { path: '/business-management', component: PageView, meta: { pageKey: 'business-management', title: '사업자정보 관리', description: '사업자등록증, 영업허가증, 사업자 상세정보를 관리하세요.', noindex: true } },
  { path: '/play', component: PageView, meta: { pageKey: 'play', title: 'PLAY', description: 'LIVE와 RBTI를 한 번에 이동할 수 있는 PLAY 메뉴입니다.' } },
  { path: '/play/ranking', component: PageView, meta: { pageKey: 'ranking', title: '월간 랭킹', description: '현재 달 일반회원 활동 랭킹을 확인하세요.' } },
  { path: '/play/live', component: PageView, meta: { pageKey: 'live', title: '실시간 출근부 웨이팅 초톡', description: '실시간 업소 출근부 웨이팅 초이스, 엔트리 현황, 오늘의 추천 정보를 빠르게 확인하세요.', keywords: ['실시간 업소', '라이브 정보', '오늘의 추천 업소', '엔트리 현황', '지역 업소'] } },
  { path: '/play/rbti', component: PageView, meta: { pageKey: 'rbti', title: 'RBTI 테스트', description: '유흥 MBTI 성향 테스트 RBTI 검사.' } },
  { path: '/play/alcohol', component: PageView, meta: { pageKey: 'alcohol', title: '음주 측정기', description: '간단한 음주 상태 자가 점검을 위한 음주측정 페이지입니다.' } },
  { path: '/wiki', component: PageView, meta: { pageKey: 'wiki', title: '룸빵위키', description: '입력한 언어들을 모아 확인할 수 있는 룸빵위키입니다.', noindex: true } },
  { path: '/support', component: PageView, meta: { pageKey: 'support-board', title: '공지 및 고객지원', description: '커뮤니티 운영 공지, 이용 가이드, 자주 묻는 질문으로 서비스를 안전하게 이용하세요.', keywords: ['커뮤니티 공지', '고객지원', 'FAQ', '이용 가이드', '운영 정책'] } },
  { path: '/support/faq', component: PageView, meta: { pageKey: 'support-board', title: 'FAQ', description: '자주 묻는 질문과 답변을 모아볼 수 있습니다.' } },
  { path: '/customer-service', component: PageView, meta: { pageKey: 'customer-service', title: '1:1 문의', description: '서비스 이용 중 문제를 1:1 문의로 접수하세요.', noindex: true } },
  { path: '/board/terms', component: PageView, meta: { pageKey: 'terms-policy', title: '약관 및 정책', description: '이용약관과 운영정책, 개인정보 정책을 확인하세요.' } },
  { path: '/my-inquiries', component: PageView, meta: { pageKey: 'my-inquiries', title: '내 문의 내역', description: '내가 접수한 1:1 문의 내역을 확인하세요.', noindex: true } },
  { path: '/my-inquiries/:id', component: PageView, meta: { pageKey: 'my-inquiry-detail', title: '문의 상세', description: '내 문의 내용과 답변 상세를 확인하세요.', noindex: true } },
  { path: '/404', component: PageView, meta: { pageKey: 'not-found', title: '404 Not Found', description: '요청하신 페이지를 찾을 수 없습니다.', noindex: true } },
  { path: '/:pathMatch(.*)*', redirect: '/404' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

function upsertMetaTag(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertCanonicalTag(href) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}



function getMetaKeywords(meta) {
  if (Array.isArray(meta?.keywords) && meta.keywords.length > 0) {
    return meta.keywords
      .map((keyword) => String(keyword).trim())
      .filter((keyword) => keyword.length > 0);
  }
  return DEFAULT_KEYWORDS;
}

function upsertStructuredData(id, payload) {
  let script = document.head.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo-jsonld', id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

function buildAbsoluteUrl(path, query = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

router.afterEach((to) => {
  const title = typeof to.meta?.title === 'string' && to.meta.title.trim().length > 0
    ? to.meta.title.trim()
    : DEFAULT_TITLE;
  const description = typeof to.meta?.description === 'string' && to.meta.description.trim().length > 0
    ? to.meta.description.trim()
    : DEFAULT_DESCRIPTION;
  const canonicalUrl = buildAbsoluteUrl(to.path);
  const shareImageUrl = buildAbsoluteUrl(DEFAULT_SHARE_IMAGE_PATH);
  const robotsValue = to.meta?.noindex ? 'noindex, nofollow' : 'index, follow';
  const keywords = getMetaKeywords(to.meta);

  document.title = title === DEFAULT_TITLE ? title : `${title} | ${BRAND_NAME}`;
  upsertMetaTag('meta[name="description"]', { name: 'description', content: description });
  upsertMetaTag('meta[property="og:title"]', { property: 'og:title', content: document.title });
  upsertMetaTag('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMetaTag('meta[property="og:type"]', { property: 'og:type', content: to.path.startsWith('/post-detail') ? 'article' : 'website' });
  upsertMetaTag('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  upsertMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMetaTag('meta[property="og:image"]', { property: 'og:image', content: shareImageUrl });
  upsertMetaTag('meta[property="og:image:secure_url"]', { property: 'og:image:secure_url', content: shareImageUrl });
  upsertMetaTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: document.title });
  upsertMetaTag('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  upsertMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: shareImageUrl });
  upsertMetaTag('meta[name="keywords"]', { name: 'keywords', content: keywords.join(', ') });
  upsertMetaTag('meta[name="robots"]', { name: 'robots', content: robotsValue });
  upsertMetaTag('meta[property="og:locale"]', { property: 'og:locale', content: 'ko_KR' });
  upsertCanonicalTag(canonicalUrl);

  upsertStructuredData('webpage', {
    '@context': 'https://schema.org',
    '@type': to.path.startsWith('/post-detail') ? 'Article' : 'WebPage',
    name: document.title,
    description,
    keywords,
    url: canonicalUrl,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: window.location.origin
    }
  });
});

export default router;
