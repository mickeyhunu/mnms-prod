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

const HIDDEN_SEARCH_KEYWORD = '강남의밤';

const DEFAULT_KEYWORDS = [
  '남성 유흥 커뮤니티',
  '최저가 업소 추천',
  '업소 리뷰 후기',
  '지역별 업소 정보',
  '미드나잇 맨즈',
  HIDDEN_SEARCH_KEYWORD
];

// server.js의 COMMUNITY_BOARD_SEO와 같은 내용을 유지하세요.
const COMMUNITY_BOARD_META = {
  free: { name: '자유게시판', description: '남성 유흥 커뮤니티 자유게시판에서 밤문화 일상과 업소 이야기를 자유롭게 나눠보세요.' },
  anon: { name: '익명게시판', description: '익명게시판에서 부담 없이 업소 정보와 유흥 고민을 공유해보세요.' },
  review: { name: '후기게시판', description: '실제 방문 회원이 작성한 업소 리얼 후기와 가격 정보를 확인하세요.' },
  story: { name: '썰게시판', description: '화류계와 밤문화에서 겪은 재미있는 썰을 읽고 공유해보세요.' },
  piece: { name: '조각게시판', description: '함께 방문할 조각 모집 글을 확인하고 참여해보세요.' },
  attendance: { name: '출석게시판', description: '매일 출석 체크로 미드나잇 맨즈 커뮤니티 활동 포인트를 모아보세요.' },
  question: { name: '질문게시판', description: '업소 이용, 지역, 가격 등 궁금한 점을 질문하고 회원 답변을 받아보세요.' },
  event: { name: '이벤트게시판', description: '미드나잇 맨즈와 제휴 업소의 진행 중인 이벤트 소식을 확인하세요.' },
  promotion: { name: '홍보게시판', description: '제휴 업소 홍보 글과 최신 프로모션 정보를 확인하세요.' }
};

const routes = [
  { path: '/', component: PageView, meta: { pageKey: 'index', title: '남성 유흥 커뮤니티 홈', description: '최저가 업소 추천, 실시간 인기 후기, 지역별 업소 정보를 한 번에 확인하세요.', keywords: ['남성 유흥 커뮤니티', '최저가 업소 추천', '업소 후기', '업소 정보', '실시간 인기글', HIDDEN_SEARCH_KEYWORD] } },
  { path: '/login', component: PageView, meta: { pageKey: 'login', title: '로그인', description: '미드나잇 맨즈 계정으로 로그인하고 커뮤니티 서비스를 이용하세요.', noindex: true } },
  { path: '/register', component: PageView, meta: { pageKey: 'register', title: '회원가입', description: '미드나잇 맨즈 회원가입으로 커뮤니티 활동을 시작하세요.', noindex: true } },
  { path: '/create', component: PageView, meta: { pageKey: 'create-post', title: '게시글 작성', description: '자유게시판, 후기, 질문 게시판에 새 글을 작성해보세요.', noindex: true } },
  { path: '/@:nickname', component: PageView, meta: { pageKey: 'member-profile', title: '회원 프로필', description: '회원의 공개 프로필 정보를 확인하세요.', noindex: true } },
  { path: '/post-detail/:slug', component: PageView, meta: { pageKey: 'post-detail', title: '커뮤니티 게시글 상세', description: '회원이 작성한 업소 추천 리뷰, 방문 후기, 가격 정보를 상세하게 확인하세요.', keywords: ['업소 리뷰', '방문 후기', '업소 가격 정보', '추천 업소', '커뮤니티 후기', HIDDEN_SEARCH_KEYWORD] } },
  { path: '/piece-chat/:id', component: PageView, meta: { pageKey: 'piece-chat', title: '조각 채팅방', description: '조각 구성원 전용 채팅방입니다.', noindex: true } },
  { path: '/community', component: PageView, meta: { pageKey: 'community', title: '남성 유흥 커뮤니티', description: '자유·익명·후기 게시판에서 최저가 업소 추천과 리얼 리뷰 후기를 탐색해보세요.', keywords: ['업소 추천 커뮤니티', '리뷰 후기', '최저가 업소', '익명 게시판', '남성 커뮤니티', '유흥 커뮤니티', '밤문화', HIDDEN_SEARCH_KEYWORD] } },
  { path: '/community/:board(free|anon|review|story|piece|attendance|question|event|promotion)', component: PageView, meta: { pageKey: 'community', title: '남성 유흥 커뮤니티', description: '자유·익명·후기 게시판에서 최저가 업소 추천과 리얼 리뷰 후기를 탐색해보세요.', keywords: ['업소 추천 커뮤니티', '리뷰 후기', '최저가 업소', '익명 게시판', '남성 커뮤니티', '유흥 커뮤니티', '밤문화', HIDDEN_SEARCH_KEYWORD] } },
  { path: '/my-page', component: PageView, meta: { pageKey: 'my-page', title: '마이페이지', description: '내 계정 정보와 활동 내역, 포인트를 확인하세요.', noindex: true, hideTelegramChatButton: true } },
  { path: '/my-page/profile', component: PageView, meta: { pageKey: 'my-page-profile', title: '내 프로필', description: '닉네임, 비밀번호 등 내 프로필 정보를 관리하세요.', noindex: true } },
  { path: '/my-page/activity', component: PageView, meta: { pageKey: 'my-page-activity', title: '내 활동', description: '내가 작성한 게시글, 댓글, 활동 기록을 확인하세요.', noindex: true } },
  { path: '/my-page/points', component: PageView, meta: { pageKey: 'my-page-points', title: '포인트', description: '보유 포인트와 적립/차감 내역을 확인하세요.', noindex: true } },
  { path: '/my-page/stamps', component: PageView, meta: { pageKey: 'my-page-stamps', title: '스탬프', description: '보유 스탬프와 적립/사용 내역을 확인하세요.', noindex: true } },
  { path: '/admin', component: PageView, meta: { pageKey: 'admin', title: '관리자 페이지', description: '관리자 전용 대시보드입니다.', noindex: true } },
  { path: '/admin/support/create', component: PageView, meta: { pageKey: 'support-create', title: '공지/FAQ 작성', description: '관리자 전용 공지사항/FAQ 작성 페이지입니다.', noindex: true } },
  { path: '/admin/inquiries/:id/answer', component: PageView, meta: { pageKey: 'admin-inquiry-answer', title: '문의 답변', description: '관리자 전용 문의 답변 페이지입니다.', noindex: true } },
  { path: '/find-account', component: PageView, meta: { pageKey: 'find-account', title: '아이디/비밀번호 찾기', description: '아이디 또는 비밀번호를 안전하게 찾을 수 있습니다.', noindex: true } },
  { path: '/stamp-purchase', component: PageView, meta: { pageKey: 'stamp-purchase', title: '스탬프 구매', description: '스탬프 상품 구성을 확인하고 구매를 진행하세요.', noindex: true } },
  { path: '/ad-purchase', component: PageView, meta: { pageKey: 'ad-purchase', title: '광고 활성화', description: '광고 요금제와 상품 구성을 확인하고 광고 활성화를 진행하세요.', noindex: true } },
  { path: '/jump-management', component: PageView, meta: { pageKey: 'jump-management', title: '점프 관리', description: '활성화된 업체 광고의 일일 점프 잔여 횟수와 최근 사용 시간을 확인하고 점프를 사용할 수 있습니다.', noindex: true } },
  { path: '/ad-order-history', component: PageView, meta: { pageKey: 'ad-order-history', title: '스탬프 결제 내역', description: '스탬프 결제완료와 결제취소 내역을 확인하세요.', noindex: true } },
  { path: '/stamp-event-management', component: PageView, meta: { pageKey: 'stamp-event-management', title: '스탬프 이벤트 관리', description: '내 광고에 신청된 방문인증/스탬프사용 신청을 관리하세요.', noindex: true } },
  { path: '/business-info', component: PageView, meta: { pageKey: 'business-info', title: '업체정보', description: '등록된 업체 정보를 지역과 업종별로 확인하세요.', keywords: ['업체정보', '지역별 업체', '업종별 업체', '미드나잇 맨즈', HIDDEN_SEARCH_KEYWORD] } },
  { path: '/bamcheat', component: PageView, meta: { pageKey: 'bamcheat', title: '밤치트', description: '기업회원 전용 번호 코멘트 검색 페이지입니다.' } },
  { path: '/business-info/:slug', component: PageView, meta: { pageKey: 'business-info-detail', title: '업체정보 상세', description: '업체의 상세정보와 전화 연결 버튼을 확인하세요.', keywords: ['업체정보', '업체 상세정보', '전화 연결', '미드나잇 맨즈', HIDDEN_SEARCH_KEYWORD] } },
  { path: '/business-apply', component: PageView, meta: { pageKey: 'business-apply', title: '기업회원 신청', description: '기업회원 신청 전 안내 사항을 확인하고 필수 동의 후 사업자정보를 제출하세요.', noindex: true } },
  { path: '/ad-profile-management', component: PageView, meta: { pageKey: 'ad-profile-management', title: '업체광고프로필 관리', description: '업체광고프로필 기본 정보와 상세 소개를 등록하고 미리보기를 확인하세요.', noindex: true } },
  { path: '/banner-ad-management', component: PageView, meta: { pageKey: 'banner-ad-management', title: '배너광고 관리', description: '홈 상단, 커뮤니티 상단, LIVE 하단 배너광고 월 경매에 입찰하고 배너 소재를 설정하세요.', noindex: true } },
  { path: '/business-management', component: PageView, meta: { pageKey: 'business-management', title: '사업자정보 관리', description: '사업자등록증, 영업허가증, 사업자 상세정보를 관리하세요.', noindex: true } },
  { path: '/play', component: PageView, meta: { pageKey: 'play', title: 'PLAY', description: 'LIVE와 RBTI를 한 번에 이동할 수 있는 PLAY 메뉴입니다.' } },
  { path: '/play/ranking', component: PageView, meta: { pageKey: 'ranking', title: '월간 랭킹', description: '현재 달 일반회원 활동 랭킹을 확인하세요.' } },
  { path: '/play/live', component: PageView, 
    // // TODO: LIVE 카테고리 재오픈 시 beforeEnter 속성을 삭제하세요.
    // beforeEnter: () => {
    //   window.alert('live 카테고리는 이용이 불가능합니다.');
    //   return '/play';
    // },
    meta: { pageKey: 'live', title: '실시간 출근부 웨이팅 초톡', description: '실시간 업소 출근부 웨이팅 초이스, 엔트리 현황, 오늘의 추천 정보를 빠르게 확인하세요.', keywords: ['실시간 업소', '라이브 정보', '오늘의 추천 업소', '엔트리 현황', '지역 업소', HIDDEN_SEARCH_KEYWORD], hideTelegramChatButton: true } 
  },
  { path: '/play/rbti', component: PageView, meta: { pageKey: 'rbti', title: 'RBTI 룸MBTI 룸비티아이 테스트', description: '룸MBTI, RBTI, 룸비티아이로 알아보는 화류 유형 검사와 룸빵 유형 검사입니다.', keywords: ['룸mbti', 'rbti', '룸비티아이', '화류 유형 검사', '룸빵 유형 검사', '유흥 MBTI', '성향 테스트'] } },
  { path: '/play/alcohol', component: PageView, meta: { pageKey: 'alcohol', title: '음주 측정기', description: '간단한 음주 상태 자가 점검을 위한 음주측정 페이지입니다.' } },
  { path: '/play/wiki', component: PageView, meta: { pageKey: 'wiki', title: '룸빵위키 | 화류계 유흥업소 용어사전', description: '룸빵위키에서 화류계 유흥업소 용어와 은어를 카테고리별로 검색하고 쉽게 확인하세요.', keywords: ['룸빵위키', '화류계 용어', '화류업계 용어', '화류 용어사전', '유흥 용어', '룸빵 용어', '미드나잇 맨즈'] } },
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

let isInitialNavigation = true;

router.afterEach((to) => {
  // 첫 진입 시에는 서버가 렌더링한 상세 메타/구조화 데이터를 그대로 유지합니다.
  const serverStructuredData = document.head.querySelector('script[data-seo-jsonld="server"]');
  if (isInitialNavigation) {
    isInitialNavigation = false;
    if (serverStructuredData) return;
  }
  serverStructuredData?.remove();

  const boardMeta = to.path.startsWith('/community/') ? COMMUNITY_BOARD_META[String(to.params?.board || '')] : null;
  const routeTitle = boardMeta ? `${boardMeta.name} | 남성 유흥 커뮤니티` : to.meta?.title;
  const routeDescription = boardMeta ? boardMeta.description : to.meta?.description;
  const title = typeof routeTitle === 'string' && routeTitle.trim().length > 0
    ? routeTitle.trim()
    : DEFAULT_TITLE;
  const description = typeof routeDescription === 'string' && routeDescription.trim().length > 0
    ? routeDescription.trim()
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
