/**
 * 파일 역할: 페이지 키와 실제 페이지 렌더링 모듈을 매핑하는 레지스트리 파일.
 */
import { adminPageConfig } from './pages/admin/config.js';
import { communityPageConfig } from './pages/community/config.js';
import { livePageConfig } from './pages/live/config.js';
import { postDetailPageConfig } from './pages/post-detail/config.js';
import { rbtiPageConfig } from './pages/rbti/config.js';

const pageRegistry = {
  'admin': adminPageConfig,
  'rbti': rbtiPageConfig,
  'business-info': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">업체정보</span>
                </div>
            </header>

            <section class="card business-directory-card">
                <div class="business-directory-filter-v2" aria-label="업체 필터">
                    <div class="business-filter-row business-filter-row--top">
                        <div class="business-filter-left">
                            <div href="#" class="business-geo" title="GPS" aria-label="위치">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6Zm0 8.5A2.5 2.5 0 1 1 12 5.5a2.5 2.5 0 0 1 0 5Z"></path></svg>
                            </div>
                            <a href="#" class="business-badge" data-filter-toggle="region"><span id="business-region-badge-label">지역 전체</span><i class="business-chevron" aria-hidden="true"></i></a>
                            <a href="#" class="business-badge hidden" id="business-district-trigger" data-filter-toggle="district"><span id="business-district-badge-label">세부 지역</span><i class="business-chevron" aria-hidden="true"></i></a>
                            <a href="#" class="business-badge" data-filter-toggle="category"><span id="business-category-badge-label">업종 전체</span><i class="business-chevron" aria-hidden="true"></i></a>
                        </div>
                        <div class="business-filter-right">
                            <div type="button" class="business-search-btn" id="business-search-btn" aria-label="업소검색">
                                <svg viewBox="0 0 512 512" aria-hidden="true">
                                    <path d="m495,466.1l-119.2-119.2c29.1-35.5 46.5-80.8 46.5-130.3 0-113.5-92.1-205.6-205.6-205.6-113.6,0-205.7,92.1-205.7,205.7s92.1,205.7 205.7,205.7c49.4,0 94.8-17.4 130.3-46.5l119.1,119.1c8,8 20.9,8 28.9,0 8-8 8-20.9 0-28.9zm-443.2-249.4c-1.42109e-14-91 73.8-164.8 164.8-164.8 91,0 164.8,73.8 164.8,164.8s-73.8,164.8-164.8,164.8c-91,0-164.8-73.8-164.8-164.8z"></path>
                                </svg>
                            </div>
                            <div class="business-filter-search">
                                <input type="search" id="business-keyword-filter" placeholder="제목/작성자 검색">
                            </div>
                        
                        </div>
                    </div>

                    <input type="hidden" id="business-region-filter" value="">
                    <input type="hidden" id="business-district-filter" value="">
                    <input type="hidden" id="business-category-filter" value="">
                    <input type="hidden" id="business-sort-filter" value="popular">

                    <div class="business-filter-menu" id="business-menu-region">
                        <div class="business-filter-menu__content" id="business-menu-region-items"></div>
                    </div>
                    <div class="business-filter-menu" id="business-menu-district">
                        <div class="business-filter-menu__content" id="business-menu-district-items"></div>
                    </div>
                    <div class="business-filter-menu" id="business-menu-category">
                        <div class="business-filter-menu__content" id="business-menu-category-items"></div>
                    </div>
                </div>
                <ul class="business-directory-list" id="business-directory-list"></ul>
                <p class="text-muted hidden" id="business-directory-empty" style="padding: 15px">등록된 업체정보가 없습니다.</p>
            </section>

        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/pages/businessInfo.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessInfo.js", "scripts/js/components/footerNav.js"]
  },
  'business-info-detail': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content business-profile-page">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/business-info" class="community-back-link icon-btn icon-btn-square" aria-label="업체정보 목록으로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">업체정보</span>
                </div>
            </header>

            <section id="business-profile-detail" aria-live="polite">
                <p class="text-muted">업체정보를 불러오는 중입니다.</p>
            </section>
        </div>
        <footer class="bottom-nav-footer hidden" id="business-profile-call-footer">
            <div class="business-profile-call-bar" id="business-profile-call-bar">
                <button type="button" class="btn btn-primary business-profile-visit-button hidden" id="business-profile-visit-button" aria-haspopup="dialog" aria-controls="business-profile-event-modal">이벤트</button>
                <a class="btn btn-primary business-profile-call-button" id="business-profile-call-button" href="#">전화하기</a>
            </div>
        </footer>
        <div class="business-profile-modal business-profile-event-modal hidden" id="business-profile-event-modal" role="dialog" aria-modal="true" aria-labelledby="business-profile-event-modal-title">
            <div class="business-profile-modal-backdrop" data-business-profile-event-close></div>
            <div class="business-profile-modal-panel business-profile-event-modal-panel">
                <button type="button" class="business-profile-modal-close" data-business-profile-event-close aria-label="이벤트 창 닫기">×</button>
                <h3 id="business-profile-event-modal-title">스탬프 이벤트</h3>
                <p class="business-profile-event-modal-description" id="business-profile-event-modal-description">방문 인증 또는 스탬프 사용을 선택해주세요.</p>
                <div class="business-profile-event-modal-actions" id="business-profile-event-modal-actions">
                    <button type="button" class="btn btn-primary business-profile-event-action" id="business-profile-visit-verification-button">방문 인증</button>
                    <button type="button" class="btn btn-primary business-profile-event-action business-profile-event-action--stamp" id="business-profile-stamp-use-button">스탬프 사용</button>
                </div>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/pages/businessInfo.js"></script>
`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessInfo.js"]
  },
  'ad-profile-management': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">광고프로필 관리</span>
                </div>
            </header>

            <section class="ad-profile-page" aria-label="광고프로필 관리 폼">
                <div class="ad-profile-notice">
                    <p>미드나잇맨즈에서 성매매와 관련된 광고를 할 경우,</p>
                    <p>서비스 이용이 제한되며 법적 처벌을 받을 수 있어요.</p>
                    <a href="/support/notice/provision">자세히 보기</a>
                </div>

                <div class="ad-profile-section">
                    <h3>광고프로필</h3>

                    <div class="ad-profile-image-upload">
                        <div class="ad-profile-image-upload-control">
                            <button id="ad-profile-image-upload-btn" class="ad-profile-image-preview-wrap active-bg h-70px w-70px rounded-14px border-1px border-line-gray-50" type="button" aria-label="대표이미지 업로드" aria-describedby="ad-profile-image-help">
                                <img id="ad-profile-image-preview" class="ad-profile-image-preview hidden" src="/assets/image/ad-profile-default.webp" alt="대표이미지 미리보기">
                                <svg class="ad-profile-image-add-icon stroke-font-gray" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-width="1.5" d="M9.754.75v18M18.75 9.753h-18"></path>
                                </svg>
                            </button>
                            <button id="ad-profile-image-clear-btn" type="button" class="business-license-clear-btn ad-profile-image-clear-btn hidden" aria-label="대표이미지 첨부 이미지 삭제"><span aria-hidden="true">×</span></button>
                        </div>
                        <div class="ad-profile-image-upload-main">
                            <label class="ad-profile-image-label" for="ad-profile-image-input">대표이미지</label>
                            <p class="ad-profile-image-help" id="ad-profile-image-help">
                                이미지 권장 사이즈: 가로 600px, 세로 600px (1:1 비율)<br>
                                대표 이미지가 없다면, <br>
                                광고 활성화 후 1~3일 내에 자동으로 제작됩니다.<br>
                                움직이는 이미지는 등록할 수 없습니다.
                            </p>
                            <input id="ad-profile-image-input" class="hidden" type="file" accept="image/*">
                        </div>
                    </div>
                    <input id="ad-profile-name" type="text" maxlength="24" placeholder="업소명을 입력해주세요." required>
                    <input id="ad-profile-manager" type="text" maxlength="24" placeholder="담당자명을 입력해주세요." required>
                    <input id="ad-profile-manager-contact" type="text" maxlength="13" placeholder="담당자 연락처를 입력해주세요." required>

                    <div class="ad-profile-grid ad-profile-grid--region">
                        <label>
                            <span>지역</span>
                            <select id="ad-profile-region" required>
                                <option value="" selected>선택</option>
                            </select>
                        </label>
                        <label>
                            <span>세부 지역</span>
                            <select id="ad-profile-district" required>
                                <option value="" selected>선택</option>
                            </select>
                        </label>
                    </div>

                    <div class="ad-profile-grid">
                        <label>
                            <span>업종</span>
                            <select id="ad-profile-category" required>
                                <option value="" selected>선택</option>
                                <option value="룸">룸</option>
                                <option value="바">바</option>
                                <option value="클럽">클럽</option>
                                <option value="기타">기타</option>
                            </select>
                        </label>
                    </div>

                    <div class="ad-profile-grid">
                        <label>
                            <span>영업시간</span>
                            <div class="ad-profile-time-row">
                                <select id="ad-profile-open-hour" required></select>
                                <span class="ad-profile-time-separator">~</span>
                                <select id="ad-profile-close-hour" required></select>
                            </div>
                        </label>
                    </div>

                    <div class="ad-profile-additional-info" aria-labelledby="ad-profile-additional-info-title">
                        <div class="ad-profile-additional-info-heading">
                            <h3 id="ad-profile-additional-info-title">부가 정보<span>(선택)</span></h3>
                        </div>
                        <input id="ad-profile-kakao-talk-id" type="text" maxlength="50" placeholder="카카오톡 아이디를 입력해주세요." autocomplete="off">
                        <input id="ad-profile-telegram-id" type="text" maxlength="50" placeholder="텔레그램 아이디를 입력해주세요." autocomplete="off">
                        <label class="ad-profile-map-toggle" for="ad-profile-show-business-address-map">
                            <input id="ad-profile-show-business-address-map" type="checkbox">
                            <span>사업자등록기준 주소지 미니맵 노출</span>
                        </label>
                        <label class="ad-profile-map-toggle" for="ad-profile-use-stamp-event">
                            <input id="ad-profile-use-stamp-event" type="checkbox">
                            <span>스탬프 이벤트 사용</span>
                        </label>
                        <div class="ad-profile-stamp-event-fields">
                            <input id="ad-profile-stamp-event-description" type="text" maxlength="200" placeholder="광고페이지에 노출할 이벤트 설명을 입력해주세요." disabled>
                            <label class="ad-profile-stamp-event-count" for="ad-profile-stamp-event-count">
                                <span>스탬프 차감갯수</span>
                                <input id="ad-profile-stamp-event-count" type="number" min="5" max="999" inputmode="numeric" placeholder="5" disabled>
                                <span>개</span>
                            </label>
                        </div>
                        <p class="ad-profile-map-toggle-help">체크하면 이벤트 설명과 스탬프 차감갯수(최소 5개)를 필수로 입력해주세요.</p>
                    </div>
                </div>

                <div class="ad-profile-section">
                    <h3>상세정보</h3>
                    <input id="ad-profile-title" type="text" maxlength="50" placeholder="제목을 입력해주세요." required>
                    <div class="ad-profile-editor ad-profile-editor--quill" aria-label="광고 상세정보 웹 에디터">
                        <div id="ad-profile-description-toolbar" class="ad-profile-quill-toolbar" aria-label="텍스트 편집 도구">
                            <span class="ql-formats">
                                <select class="ql-size" aria-label="글씨 크기">
                                    <option value="small">작게</option>
                                    <option selected>기본</option>
                                    <option value="large">크게</option>
                                    <option value="huge">아주 크게</option>
                                </select>
                            </span>
                            <span class="ql-formats">
                                <button type="button" class="ql-bold" aria-label="굵게"></button>
                                <button type="button" class="ql-italic" aria-label="기울임"></button>
                                <button type="button" class="ql-underline" aria-label="밑줄"></button>
                                <button type="button" class="ql-strike" aria-label="취소선"></button>
                            </span>
                            <span class="ql-formats">
                                <select class="ql-color" aria-label="글자색"></select>
                                <select class="ql-background" aria-label="배경색"></select>
                            </span>
                            <span class="ql-formats">
                                <select class="ql-align" aria-label="문단 정렬"></select>
                            </span>
                            <span class="ql-formats">
                                <button type="button" class="ql-image" aria-label="이미지 첨부"></button>
                            </span>
                        </div>
                        <input id="ad-profile-editor-image-input" class="hidden" accept="image/*" type="file">
                        <div id="ad-profile-description-editor" class="ad-profile-editor-content"></div>
                    </div>
                    <textarea id="ad-profile-description" class="hidden" maxlength="1000" placeholder="내용을 입력해주세요." required></textarea>
                </div>

                <div class="ad-profile-preview">
                    <button type="button" class="ad-profile-preview-toggle" id="ad-profile-preview-toggle" aria-expanded="false" aria-controls="ad-profile-preview-content">
                        <span>미리보기</span>
                    </button>
                    <div id="ad-profile-preview-content" class="ad-profile-preview-content hidden">
                        <ul class="business-directory-list ad-profile-preview-list">
                            <li class="business-directory-item ad-profile-preview-item">
                                <img id="ad-profile-preview-image" class="business-directory-thumbnail" src="/src/assets/image/ad-profile-default.webp" alt="대표이미지 미리보기">
                                <div class="business-directory-main">
                                    <h4 id="ad-profile-preview-title">[선택-업소명] 제목을 입력해주세요.</h4>
                                    <p class="business-directory-region-detail" id="ad-profile-preview-detail">선택 선택 · 선택 · 시간선택 ~ 시간선택</p>
                                    <div class="business-directory-meta">
                                        <span class="business-directory-manager" id="ad-profile-preview-manager">담당자 · 연락처</span>
                                        <span class="business-directory-views">조회수 0</span>
                                    </div>
                                </div>
                            </li>
                        </ul>
                        <div class="ad-profile-user-preview" aria-label="사용자에게 표시되는 광고프로필 화면 미리보기">
                            <article class="business-profile-standalone ad-profile-user-preview-card">
                            <div class="business-profile-hero">
                                <div class="business-profile-image-frame">
                                    <img id="ad-profile-detail-preview-image-blur" class="business-profile-image-blur" src="/src/assets/image/ad-profile-default.webp" alt="" aria-hidden="true">
                                    <img id="ad-profile-detail-preview-image" class="business-profile-image" src="/src/assets/image/ad-profile-default.webp" alt="대표이미지 미리보기">
                                </div>
                                <div class="business-profile-summary">
                                    <p class="business-profile-eyebrow" id="ad-profile-detail-preview-eyebrow">선택 선택 · 선택</p>
                                    <h2 id="ad-profile-detail-preview-title">[선택-업소명] 제목을 입력해주세요.</h2>
                                    <div class="business-profile-stats">
                                        <span id="ad-profile-detail-preview-hours">영업시간 시간선택 ~ 시간선택</span>
                                        <span>조회수 0</span>
                                    </div>
                                </div>
                            </div>
                            <dl class="business-profile-info">
                                <div class="business-profile-info-pair">
                                    <div class="business-profile-info-item"><dt><span aria-hidden="true">🏢</span>업체명</dt><dd id="ad-profile-detail-preview-business-name">업소명</dd></div>
                                    <div class="business-profile-info-item"><dt><span aria-hidden="true">👤</span>담당자</dt><dd id="ad-profile-detail-preview-manager-name">담당자</dd></div>
                                </div>
                                <div class="business-profile-info-pair">
                                    <div class="business-profile-info-item"><dt><span aria-hidden="true">📍</span>지역</dt><dd id="ad-profile-detail-preview-region">선택 선택</dd></div>
                                    <div class="business-profile-info-item"><dt><span aria-hidden="true">🏷️</span>업종</dt><dd id="ad-profile-detail-preview-category">선택</dd></div>
                                </div>
                                <div class="business-profile-info-item business-profile-info-item--contact">
                                    <dd>
                                        <span class="business-profile-contact-item">
                                            <span class="business-profile-contact-label"><span aria-hidden="true">📞</span>연락처</span>
                                            <span class="business-profile-contact-value" id="ad-profile-detail-preview-manager-contact">연락처</span>
                                        </span>
                                        <span class="business-profile-contact-item hidden" id="ad-profile-detail-preview-kakao-row">
                                            <span class="business-profile-contact-label"><span aria-hidden="true">💬</span>카카오톡</span>
                                            <span class="business-profile-contact-value" id="ad-profile-detail-preview-kakao">-</span>
                                        </span>
                                        <span class="business-profile-contact-item hidden" id="ad-profile-detail-preview-telegram-row">
                                            <span class="business-profile-contact-label"><span aria-hidden="true">✈️</span>텔레그램</span>
                                            <span class="business-profile-contact-value" id="ad-profile-detail-preview-telegram">-</span>
                                        </span>
                                    </dd>
                                </div>
                                <div class="business-profile-info-item business-profile-info-item--stamp hidden" id="ad-profile-detail-preview-stamp-row">
                                    <dt><span aria-hidden="true">🎟️</span>스탬프 이벤트</dt>
                                    <dd>
                                        <div class="business-profile-stamp-summary">
                                            <div class="business-profile-stamp-summary-row">
                                                <button type="button" class="business-profile-stamp-summary-label" aria-label="방문 인증 안내 보기">방문 인증시</button>
                                                <span class="business-profile-stamp-summary-value">스탬프 1개 지급</span>
                                            </div>
                                            <div class="business-profile-stamp-summary-row" id="ad-profile-detail-preview-stamp-use-row">
                                                <button type="button" class="business-profile-stamp-summary-label" id="ad-profile-detail-preview-stamp-count-label" aria-label="스탬프 사용 안내 보기">스탬프 5개 사용시</button>
                                                <span class="business-profile-stamp-summary-value" id="ad-profile-detail-preview-stamp-description">이벤트 설명</span>
                                            </div>
                                        </div>
                                    </dd>
                                </div>
                            </dl>
                            <section class="business-profile-location-section hidden" id="ad-profile-detail-preview-map-section" aria-label="위치정보">
                                <h3>위치정보</h3>
                                <div class="business-profile-location">
                                    <div class="business-profile-mini-map ad-profile-detail-preview-map-placeholder">지도 미리보기</div>
                                    <p class="business-profile-map-address">사업자등록기준 주소지가 표시됩니다.</p>
                                </div>
                            </section>
                            <section class="business-profile-description" aria-label="업체 상세정보">
                                <h3>상세정보</h3>
                                <div class="business-profile-description-content" id="ad-profile-detail-preview-description"><p>등록된 상세정보가 없습니다.</p></div>
                            </section>
                            </article>
                        </div>
                    </div>
                </div>
                
                <div class="ad-profile-submit-wrap">
                    <button id="ad-profile-draft-btn" class="btn btn-secondary hidden" type="button">임시저장</button>
                    <button id="ad-profile-save-btn" class="btn btn-primary" type="button">광고프로필 저장</button>
                </div>
                <div class="ad-profile-notice ad-profile-notice--bottom">
                    <p>미드나잇맨즈 광고관리 규정에 위배되는 내용을 입력할 경우,</p>
                    <p>별도 안내 없이 수정되거나 반려될 수 있어요.</p>
                </div>
            </section>
        </div>
    </main>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js", "scripts/js/pages/adProfileManagement.js", "scripts/js/components/footerNav.js"]
  },
  'business-apply': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">기업회원 신청</span>
                </div>
            </header>

            <section class="business-apply-page" aria-label="기업회원 신청 안내 및 동의">
                <div class="business-apply-hero">
                    <p class="business-apply-eyebrow">기업회원 전환 안내</p>
                    <h2>기업회원 전환 안내</h2>
                    <p>기업회원은 광고 및 홍보 활동을 위한 계정으로, 일반회원과 이용 권한이 다르게 적용됩니다.</p>
                </div>

                <div class="business-apply-section">
                    <h3>이용 권한 변경</h3>
                    <ul class="business-apply-policy-list">
                        <li>기업회원으로 전환된 계정은 일반회원으로 복구할 수 없습니다.</li>
                        <li>기업회원은 일반 커뮤니티 게시판 이용이 제한됩니다.</li>
                        <li>기업회원은 홍보게시판만 이용할 수 있으며, 이용 조건은 운영정책에 따라 적용됩니다.</li>
                        <li>기업회원은 일반 게시판의 게시글 작성, 댓글 작성 등 일부 커뮤니티 활동이 제한될 수 있습니다.</li>
                        <li>PLAY - LIVE 서비스 이용 조건은 일반회원과 다르게 적용됩니다.</li>
                        <li>기업회원 관련 정책은 서비스 운영정책에 따라 변경될 수 있습니다.</li>
                    </ul>
                </div>

                <div class="business-apply-section business-apply-consent-box">
                    <h3>필수 동의</h3>
                    <label class="business-apply-consent-item">
                        <input type="checkbox" data-business-apply-consent required>
                        <span>위 기업회원 이용정책 및 권한 변경 사항을 확인하였으며 이에 동의합니다.</span>
                    </label>
                </div>

                <div class="business-apply-bottom-notice" aria-label="기업회원 전환 유의사항">
                    <p>※ 기업회원 전환 전 일반회원 권한 및 이용 범위를 충분히 확인하시기 바랍니다.</p>
                    <p>※ 기업회원 전환 후에는 일반회원으로 복구되지 않습니다.</p>
                </div>

                <div class="ad-profile-actions">
                    <button id="business-apply-submit-btn" class="btn btn-primary" type="button" disabled>동의 후 사업자정보 제출하기</button>
                </div>
            </section>
        </div>
    </main>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessApply.js", "scripts/js/components/footerNav.js"]
  },
  'business-management': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name" id="business-management-page-title">사업자정보 관리</span>
                </div>
            </header>

            <section class="business-info-page" id="business-management-form" aria-label="사업자 정보 관리 폼">
                <div class="business-info-notice">
                    <p>미드나잇맨즈에서 성매매와 관련된 광고를 할 경우,</p>
                    <p>서비스 이용이 제한되며 법적 처벌을 받을 수 있어요.</p>
                    <a href="/support/notice/provision">자세히 보기</a>
                </div>
                <div id="business-management-review-notice" class="business-management-review-notice hidden" role="status" aria-live="polite"></div>

                <div class="business-info-section">
                    <div class="business-license-upload-grid" aria-label="사업자 증빙 이미지 첨부">
                        <div class="business-license-upload-item">
                            <h3>사업자등록증</h3>
                            <input id="business-license-input" class="hidden" type="file" accept="image/*">
                            <button id="business-license-upload-btn" class="business-license-upload-btn" type="button" aria-label="사업자등록증 업로드">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                                    <path d="M9 4.5 7.6 6H5.25A2.25 2.25 0 0 0 3 8.25v8.25a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 16.5V8.25A2.25 2.25 0 0 0 18.75 6H16.4L15 4.5H9Zm3 11.25a3.75 3.75 0 1 1 0-7.5 3.75 3.75 0 0 1 0 7.5Zm0-2.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="business-license-upload-item">
                            <h3>영업허가증</h3>
                            <input id="business-permit-input" class="hidden" type="file" accept="image/*">
                            <button id="business-permit-upload-btn" class="business-license-upload-btn" type="button" aria-label="영업허가증 업로드">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                                    <path d="M9 4.5 7.6 6H5.25A2.25 2.25 0 0 0 3 8.25v8.25a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 16.5V8.25A2.25 2.25 0 0 0 18.75 6H16.4L15 4.5H9Zm3 11.25a3.75 3.75 0 1 1 0-7.5 3.75 3.75 0 0 1 0 7.5Zm0-2.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="business-info-guide">
                        <p>• 사업자등록증과 영업허가증에 가려지는 부분이 없어야해요.</p>
                        <p>• 이미지에 왜곡이나 흐린 부분이 있는지 확인해주세요.</p>
                        <p>• 흐릿하거나 어두운 사진은 승인 지연의 원인이 될 수 있습니다.</p>
                    </div>
                </div>

                <div class="business-info-section">
                    <h3>사업자 상세정보</h3>
                    <div class="business-verify-row">
                        <input id="business-number" type="text" maxlength="12" placeholder="사업자 번호를 입력해주세요.">
                        <button id="business-verify-btn" type="button" disabled>검증</button>
                    </div>
                    <input id="business-name" type="text" maxlength="100" placeholder="사업자 상호를 입력해주세요.">
                    <input id="business-owner" type="text" maxlength="24" placeholder="대표자명을 입력해주세요.">
                    <div class="business-address-wrap">
                        <input id="business-address" type="text" maxlength="100" placeholder="사업자 주소를 입력해주세요." readonly>
                        <button id="business-address-search-btn" type="button" aria-label="주소 검색">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" height="20" width="20">
                                <path d="M19.975 8.187c-.97-4.61-4.697-6.687-7.97-6.687h-.01c-3.264 0-7 2.066-7.97 6.677-1.082 5.15 1.951 9.424 4.596 12.17C9.6 21.363 10.742 22.5 12 22.5s2.408-1.136 3.38-2.154c2.644-2.745 5.677-7.008 4.595-12.159m-7.97 5.001c-1.61 0-2.913-1.407-2.913-3.144S10.396 6.9 12.005 6.9s2.912 1.407 2.912 3.144-1.303 3.144-2.912 3.144"></path>
                            </svg>
                        </button>
                    </div>
                    <input id="business-address-detail" type="text" maxlength="100" placeholder="(선택) 상세 주소를 입력해주세요.">
                </div>

                <div class="ad-profile-actions">
                    <button id="business-info-save-btn" class="btn btn-primary" type="button" disabled>사업자정보 저장</button>
                </div>

                <div class="business-info-notice business-info-notice--bottom">
                    <p>광고프로필과 다른 사업자이거나 상세정보에 오탈자가 있을 경우,</p>
                    <p>별도 안내 없이 수정되거나 반려될 수 있어요.</p>
                </div>
            </section>
        </div>
    </main>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessInfo.js", "scripts/js/components/footerNav.js"]
  },
  'stamp-purchase': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">스탬프 구매</span>
                </div>
            </header>

            <section class="ad-purchase-layout stamp-purchase-layout" aria-label="스탬프 구매 상품 안내">
                <article class="stamp-plan-detail" id="stamp-plan-detail">
                    <h2 class="stamp-plan-title">스탬프 상품</h2>
                    <div class="stamp-plan-table-wrap">
                        <table class="stamp-plan-table">
                            <thead>
                                <tr>
                                    <th scope="col">상품</th>
                                    <th scope="col">구성</th>
                                    <th scope="col">금액</th>
                                </tr>
                            </thead>
                            <tbody id="stamp-plan-list"></tbody>
                        </table>
                    </div>
                </article>

                <hr class="ad-payment-divider">

                <article class="ad-payment-card stamp-payment-card hidden" id="stamp-payment-card" aria-label="결제 정보" aria-live="polite">
                    <h3 class="ad-payment-title">결제정보</h3>
                    <dl class="ad-payment-list">
                        <div class="ad-payment-row">
                            <dt>선택한 상품</dt>
                            <dd id="stamp-selected-product">-</dd>
                        </div>
                        <div class="ad-payment-row">
                            <dt>상품 금액</dt>
                            <dd id="stamp-product-price">-</dd>
                        </div>
                        <div class="ad-payment-row">
                            <dt>부가세 (VAT)</dt>
                            <dd id="stamp-vat-price">-</dd>
                        </div>
                    </dl>
                    <div class="ad-payment-total">
                        <strong>총 결제 금액</strong>
                        <strong id="stamp-total-price">-</strong>
                    </div>
                </article>
            </section>
        </div>
    </main>

    <div class="stamp-purchase-submit-bar hidden" id="stamp-purchase-submit-bar">
        <button type="button" class="btn btn-primary ad-purchase-submit" id="stamp-purchase-submit" disabled>스탬프 구매하기</button>
    </div>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js", "scripts/js/pages/stampPurchase.js"]
  },
  'ad-purchase': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">광고 활성화</span>
                </div>
            </header>

            <div class="container ad-management-container">
                <section class="ad-management-status-card" aria-labelledby="ad-management-status-title">
                    <div class="ad-management-status-copy">
                        <img src="/src/assets/ad-plan-badges/none-badge.png" alt="미광고" class="ad-management-status-badge" id="ad-management-status-badge">
                        <h2 id="ad-management-status-title">광고 상태를 확인하고 있습니다</h2>
                        <div class="ad-management-status-periods" aria-label="광고 노출 기간">
                            <div class="ad-management-status-period">
                                <p class="ad-management-status-label">광고 시작 시간</p>
                                <strong id="ad-management-start-date">-</strong>
                            </div>
                            <div class="ad-management-status-period">
                                <p class="ad-management-status-label">광고 종료 예정</p>
                                <strong id="ad-management-expire-date">-</strong>
                            </div>
                        </div>
                        <div class="ad-management-status-time">
                            <span id="ad-management-remaining-time">정보 확인 중</span>
                        </div>
                    </div>
                    <div class="ad-management-illustration" aria-hidden="true">
                        <div class="ad-management-browser">
                            <span></span><span></span><span></span>
                            <div class="ad-management-ad-tile">AD</div>
                            <i></i><i></i><i></i><i></i>
                        </div>
                        <div class="ad-management-check">✓</div>
                    </div>
                </section>

                <section class="ad-management-panel ad-activation-panel hidden" aria-labelledby="ad-management-activation-title" id="ad-management-activation-panel">
                    <div class="ad-activation-copy">
                        <h2 id="ad-management-activation-title">자동연장 활성화</h2>
                    </div>
                    <label class="ad-activation-switch" for="ad-purchase-activation-toggle">
                        <span class="ad-activation-switch-text">OFF</span>
                        <input id="ad-purchase-activation-toggle" type="checkbox" disabled>
                        <span class="ad-activation-switch-track" aria-hidden="true"></span>
                        <span class="ad-activation-switch-text">ON</span>
                        <span class="sr-only" id="ad-purchase-activation-toggle-label">자동연장 OFF</span>
                    </label>
                    <p class="ad-management-safe-note"><span aria-hidden="true">🔒</span><b>안심하고 이용하세요</b><br>자동연장 ON 시 선택한 광고가 계속 노출되도록 기간 종료마다 스탬프 1개가 자동 소모됩니다.</p>
                </section>

                <section class="ad-management-panel" aria-labelledby="ad-management-product-title">
                    <div class="ad-management-section-title-row">
                        <div>
                            <h2 id="ad-management-product-title">상품 선택</h2>
                            <p>노출 위치와 혜택에 따라 상품을 선택하세요.</p>
                        </div>
                    </div>
                    <div class="ad-product-grid" role="tablist" aria-label="광고 상품 선택">
                        <button type="button" class="ad-product-card is-active" data-plan="basic" role="tab" aria-selected="true">
                            <img src="/src/assets/ad-plan-badges/basic-badge.png" alt="BASIC" class="ad-product-badge">
                            <strong>지역 목록 일반 노출</strong>
                            <span class="ad-product-divider"></span>
                            <span class="ad-product-radio" aria-hidden="true"></span>
                            <span class="ad-product-cost"><small>필요 스탬프</small><b>1개 / 3분</b></span>
                        </button>
                        <button type="button" class="ad-product-card" data-plan="plus" role="tab" aria-selected="false">
                            <img src="/src/assets/ad-plan-badges/plus-badge.png" alt="PLUS" class="ad-product-badge">
                            <strong>지역 상단 우선 노출</strong>
                            <span class="ad-product-divider"></span>
                            <span class="ad-product-radio" aria-hidden="true"></span>
                            <span class="ad-product-cost"><small>필요 스탬프</small><b>1개 / 2분</b></span>
                        </button>
                        <button type="button" class="ad-product-card" data-plan="premium" role="tab" aria-selected="false">
                            <img src="/src/assets/ad-plan-badges/premium-badge.png" alt="PREMIUM" class="ad-product-badge">
                            <strong>지역 상단 최우선 노출</strong>
                            <span class="ad-product-divider"></span>
                            <span class="ad-product-radio" aria-hidden="true"></span>
                            <span class="ad-product-cost"><small>필요 스탬프</small><b>1개 / 1분</b></span>
                        </button>
                    </div>
                    <div class="ad-activation-benefits">
                        <span aria-hidden="true">📣</span>
                        <div>
                            <b id="ad-activation-benefit-title">프리미엄 광고를 활성화하면</b>
                            <ul id="ad-plan-features"></ul>
                        </div>
                    </div>
                    <div class="ad-activation-action">
                        <button type="button" class="ad-management-start-btn" id="ad-purchase-submit" disabled>⚡ 1 스탬프 사용하고 광고 시작하기</button>
                    </div>
                </section>

                <section class="ad-management-panel" aria-labelledby="ad-management-stamp-title">
                    <h2 id="ad-management-stamp-title">스탬프 정보</h2>
                    <div class="ad-stamp-info-grid">
                        <article class="ad-stamp-info-card ad-stamp-summary-card">
                            <div><dt>보유 스탬프</dt><dd id="ad-summary-stamp-balance">확인 중...</dd></div>
                            <dl>
                                <div><dt>선택한 상품</dt><dd id="ad-selected-product">프리미엄 광고</dd></div>
                                <div><dt>차감 스탬프</dt><dd id="ad-product-price">스탬프 1개</dd></div>
                                <div><dt>노출 기간</dt><dd id="ad-vat-price">1분</dd></div>
                                <div><dt>예상 노출 기간</dt><dd id="ad-estimated-run-days">-</dd></div>
                                <div><dt>최대 자동연장 기간</dt><dd id="ad-estimated-run-until">-</dd></div>
                                <div><dt>사용후 잔여 스탬프</dt><dd id="ad-stamps-after-use">-</dd></div>
                            </dl>
                        </article>
                    </div>
                    <p class="ad-management-notice"><span aria-hidden="true">💡</span><b>안내</b><span>자동연장 ON 상태에서 보유 스탬프가 0개이면 자동연장이 OFF되고 현재 활성화된 광고 기간 종료 후 노출이 중지됩니다.</span></p>
                </section>

            </div>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js", "scripts/js/pages/adPurchase.js"]
  },
  'jump-management': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">점프 관리</span>
                </div>
            </header>

            <div class="container ad-management-container">
                <section class="ad-management-status-card" aria-labelledby="jump-management-status-title">
                    <div class="ad-management-status-copy">
                        <img src="/src/assets/ad-plan-badges/none-badge.png" alt="미광고" class="ad-management-status-badge" id="jump-management-status-badge">
                        <h2 id="jump-management-status-title">점프 정보를 확인하고 있습니다</h2>
                        <div class="ad-management-status-periods" aria-label="광고 노출 기간">
                            <div class="ad-management-status-period">
                                <p class="ad-management-status-label">광고 시작 시간</p>
                                <strong id="jump-management-start-date">-</strong>
                            </div>
                            <div class="ad-management-status-period">
                                <p class="ad-management-status-label">광고 종료 예정</p>
                                <strong id="jump-management-expire-date">-</strong>
                            </div>
                        </div>
                        <div class="ad-management-status-time"><span id="jump-management-remaining-time">정보 확인 중</span></div>
                    </div>
                    <div class="ad-management-illustration" aria-hidden="true">
                        <div class="ad-management-browser"><span></span><span></span><span></span><div class="ad-management-ad-tile">UP</div><i></i><i></i><i></i><i></i></div>
                        <div class="ad-management-check">↟</div>
                    </div>
                </section>

                <section class="ad-management-panel" aria-labelledby="jump-management-title">
                    <div class="ad-management-section-title-row">
                        <div>
                            <h2 id="jump-management-title">점프 관리</h2>
                            <p>활성화된 광고의 점프를 사용하면 업체정보 목록 노출 순서를 최상위로 올릴 수 있습니다.</p>
                        </div>
                    </div>
                    <div class="ad-stamp-info-grid">
                        <article class="ad-stamp-info-card ad-stamp-summary-card">
                            <dl>
                                <div><dt>오늘 남은 점프</dt><dd id="jump-management-daily-remaining">확인 중...</dd></div>
                                <div><dt>최근 점프 사용</dt><dd id="jump-management-last-jumped-at">-</dd></div>
                                <div><dt>광고 등급</dt><dd id="jump-management-plan-type">-</dd></div>
                                <div><dt>등록 상태</dt><dd id="jump-management-registration-status">-</dd></div>
                            </dl>
                        </article>
                    </div>
                    <div class="ad-activation-action">
                        <button type="button" class="ad-management-start-btn" id="jump-management-submit" disabled>광고 활성화 후 점프 사용 가능</button>
                    </div>
                    <p class="ad-management-safe-note"><span aria-hidden="true">⏱</span><b>점프는 매일 00시에 초기화됩니다</b><br>점프는 광고 활성화 기간 동안만 사용할 수 있으며, 남은 개수는 00~24시 기준으로 관리됩니다.</p>
                </section>
            </div>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js", "scripts/js/pages/jumpManagement.js"]
  },
  'ad-order-history': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">스탬프 결제 내역</span>
                </div>
            </header>

            <div class="ad-order-history-caption">
                <p>스탬프 결제완료와 결제취소 내역만 최신순으로 확인할 수 있어요.</p>
                <p>적립/차감 내역은 마이페이지의 스탬프 내역에서 확인해주세요.</p>
            </div>

            <section class="ad-order-history-card" aria-label="스탬프 결제 내역">
                <div class="ad-order-history-empty hidden" id="ad-order-history-empty">아직 스탬프 결제 내역이 없습니다.</div>
                <div class="ad-order-history-list" id="ad-order-history-list"></div>
            </section>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/adOrderHistory.js", "scripts/js/components/footerNav.js"]
  },
  'stamp-event-management': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">스탬프 이벤트 관리</span>
                </div>
            </header>

            <div class="ad-order-history-caption">
                <p>내 광고에 신청된 방문인증 신청과 스탬프사용 신청을 확인하고 승인 또는 반려할 수 있어요.</p>
                <p id="stamp-event-management-summary">신청 내역을 확인 중입니다.</p>
            </div>

            <section class="ad-order-history-card stamp-event-management-card" aria-label="스탬프 이벤트 신청 관리">
                <div class="stamp-event-management-toolbar">
                    <label for="stamp-event-management-status">상태</label>
                    <select id="stamp-event-management-status">
                        <option value="PENDING">대기</option>
                        <option value="APPROVED">승인</option>
                        <option value="REJECTED">반려</option>
                    </select>
                </div>
                <div class="ad-order-history-empty hidden" id="stamp-event-management-empty">아직 신청 내역이 없습니다.</div>
                <div class="ad-order-history-list stamp-event-management-list" id="stamp-event-management-list"></div>
            </section>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/stampEventManagement.js", "scripts/js/components/footerNav.js"]
  },
  'community': communityPageConfig,
  'create-post': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/community" class="community-back-link icon-btn icon-btn-square" aria-label="커뮤니티로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">새 글 작성</span>
                </div>
            </header>
            
            <div class="card">
                <p class="text-muted" style="margin: 12px 0 24px;">미드나잇 맨즈에 새로운 이야기를 공유해보세요</p>
                <form id="post-form" enctype="multipart/form-data">
                    <div class="error-banner hidden" id="error-banner">
                        <p id="error-message"></p>
                    </div>
                    
                    <div class="form-group">
                    <label for="board-type" class="form-label">게시판 선택</label>
                    <select id="board-type" name="boardType" class="form-control" required>
                    <option value="" selected>선택</option>
                    <option value="FREE">자유게시판</option>
                    <option value="ANON">익명게시판</option>
                    <option value="REVIEW">후기게시판</option>
                    <option value="STORY">썰게시판</option>
                    <option value="ATTENDANCE">출석게시판</option>
                    <option value="QUESTION">질문게시판</option>
                    <option value="EVENT">이벤트게시판</option>
                    <option value="PROMOTION">홍보게시판</option>
                    </select>
                    </div>

                    <div class="form-group">
                        <label for="title" class="form-label">제목</label>
                        <input type="text" id="title" name="title" class="form-control" placeholder="제목을 입력하세요" maxlength="255" required>
                        <div class="error-message hidden" id="title-error"></div>
                    </div>
                    

                    <div class="form-group">
                        <label for="content" class="form-label">내용</label>
                        <textarea id="content" name="content" class="form-control" placeholder="내용을 입력하세요" rows="15" required></textarea>
                        <div class="error-message hidden" id="content-error"></div>
                        <small class="text-muted">내용은 6자 이상 1000자 이하로 입력해주세요</small>
                    </div>



                    <div class="form-group">
                        <label for="image-files" class="form-label">이미지 첨부</label>
                        <input type="file" id="image-files" name="files" class="form-control" multiple accept="image/*,.heic,.heif">
                        <small class="text-muted">최대 5개의 이미지를 업로드할 수 있습니다 (JPG, PNG, GIF, WEBP, HEIC, 각 8MB 이하)</small>
                        <div id="image-preview" class="image-preview mt-2"></div>
                    </div>

                    <div class="form-actions form-actions-inline" style="display: flex; style="justify-content: flex-end; gap: 8px;">
                        <button type="submit" class="btn btn-primary" id="submit-btn">등록</button>
                        <a href="index.html" class="btn btn-secondary">취소</a>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/createPost.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/libs/koProfanityFilter.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/createPost.js", "scripts/js/components/footerNav.js"]
  },
  'support-create': {
    template: `<header class="header">
        <div class="header-container">
            <a href="/" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/admin" class="btn btn-secondary btn-sm">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/admin" class="community-back-link icon-btn icon-btn-square" aria-label="관리자 페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">공지사항 새 글 작성</span>
                </div>
            </header>
            
            <div class="card">
                <p class="text-muted support-create-description" style="margin: 12px 0 24px;">커뮤니티 글쓰기 화면과 동일한 방식으로 공지사항 글을 등록할 수 있습니다.</p>
                <form id="support-post-form">
                    <div class="form-group">
                        <label for="support-form-category" class="form-label">구분</label>
                        <select id="support-form-category" class="form-control">
                            <option value="NOTICE">공지사항</option>
                            <option value="FAQ">FAQ</option>
                        </select>
                    </div>

                    <div class="form-group" id="support-pin-options">
                        <div style="margin-bottom:8px;">
                            <label for="support-form-board-type" class="form-label">노출 게시판</label>
                            <select id="support-form-board-type" class="form-control" style="max-width:260px;">
                                <option value="SUPPORT_ONLY">커뮤니티 미노출</option>
                                <option value="FREE">자유게시판</option>
                                <option value="ANON">익명게시판</option>
                                <option value="REVIEW">후기게시판</option>
                                <option value="STORY">썰게시판</option>
                                <option value="ATTENDANCE">출석게시판</option>
                                <option value="QUESTION">질문게시판</option>
                                <option value="EVENT">이벤트게시판</option>
                                <option value="PROMOTION">홍보게시판</option>
                            </select>
                        </div>
                        <label><input type="checkbox" id="support-form-is-pinned"> 필독으로 표시</label>
                    </div>

                    <div class="form-group">
                        <label for="title" class="form-label">제목</label>
                        <input type="text" id="title" class="form-control" maxlength="255" placeholder="제목을 입력하세요" required>
                    </div>

                    <div class="form-group">
                        <label for="content" class="form-label">내용</label>
                        <textarea id="content" class="form-control" rows="15" placeholder="내용을 입력하세요" required></textarea>
                        <small class="text-muted">내용은 6자 이상 1000자 이하로 입력해주세요</small>
                    </div>

                    <div class="form-actions form-actions-inline" style="display:flex;justify-content:flex-end;gap:8px;">
                        <button type="submit" class="btn btn-primary" id="submit-btn">등록</button>
                        <a href="/admin" class="btn btn-secondary">취소</a>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/supportCreate.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/supportCreate.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'admin-inquiry-answer': {
    template: `<header class="header">
        <div class="header-container">
            <a href="/" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/admin" class="btn btn-secondary btn-sm">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container" style="max-width: 900px;">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/admin" class="community-back-link icon-btn icon-btn-square" aria-label="관리자 페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">1:1 문의 답변 작성</span>
                </div>
            </header>
            <p class="text-muted admin-inquiry-answer-description" style="margin: 12px 0 24px;">문의 상세 내용을 확인하고 답변을 저장할 수 있습니다.</p>

            <div class="card admin-inquiry-answer-card">
                <div class="loading" id="admin-inquiry-loading"><div class="spinner"></div><p>문의를 불러오는 중...</p></div>
                <form id="admin-inquiry-answer-form" class="hidden">
                    <div class="form-group">
                        <label class="form-label">문의 제목</label>
                        <div id="admin-inquiry-title" class="form-control admin-inquiry-readonly admin-inquiry-title-box"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">문의 정보</label>
                        <div id="admin-inquiry-meta" class="form-control admin-inquiry-readonly admin-inquiry-meta-grid"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">문의 내용</label>
                        <div id="admin-inquiry-content" class="form-control admin-inquiry-readonly admin-inquiry-content-box"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">첨부파일</label>
                        <div id="admin-inquiry-attachments" class="form-control admin-inquiry-readonly admin-inquiry-attachments-box">첨부파일이 없습니다.</div>
                    </div>
                    <div class="form-group">
                        <label for="admin-inquiry-answer-content" class="form-label">답변 내용</label>
                        <textarea id="admin-inquiry-answer-content" class="form-control" rows="8" placeholder="답변 내용을 입력해주세요." required></textarea>
                    </div>
                    <div class="form-actions form-actions-inline" style="display:flex;justify-content:flex-end;gap:8px;">
                        <a href="/admin" class="btn btn-secondary">목록으로</a>
                        <button type="submit" class="btn btn-primary" id="admin-inquiry-answer-save-btn">답변 저장</button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/adminInquiryAnswer.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/adminInquiryAnswer.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'find-account': {
    template: `<header class="header">
    <div class="header-container">
        <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
        <nav class="nav" id="navigation">
            <div class="nav-guest" id="nav-guest">
                <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
            </div>
            <div class="nav-user hidden" id="nav-user">
                <span class="user-nickname" id="user-nickname"></span>
                <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
            </div>
        </nav>
    </div>
</header>

<main class="main-content">
    <div class="container auth-container auth-login">
        <div class="community-section-header">
            <h1>계정 찾기</h1>
            <p>본인인증 후 가입된 아이디를 확인하고 비밀번호를 재설정할 수 있습니다.</p>
        </div>

        <div class="card">
            <div class="form-actions">
                <button class="btn btn-primary w-full" id="find-account-btn" type="button">계정찾기 (본인인증)</button>
            </div>
            <p class="text-center mt-3" id="find-account-status" aria-live="polite"></p>
            <div class="form-group mt-3 hidden" id="found-account-section">
                <label class="form-label">가입된 아이디</label>
                <p class="form-control-static" id="found-login-id">본인인증 후 자동 입력됩니다.</p>
            </div>
            <form id="reset-password-form" class="hidden mt-3">
                <div class="form-group">
                    <label class="form-label" for="new-password">새 비밀번호</label>
                    <input class="form-control" id="new-password" type="password" minlength="8" required placeholder="새 비밀번호를 입력하세요">
                </div>
                <div class="form-group">
                    <label class="form-label" for="confirm-new-password">새 비밀번호 확인</label>
                    <input class="form-control" id="confirm-new-password" type="password" minlength="8" required placeholder="새 비밀번호를 다시 입력하세요">
                </div>
                <button class="btn btn-secondary w-full" type="submit">비밀번호 재설정</button>
            </form>
            <div class="text-center mt-3">
                <a href="login.html">로그인 화면으로 돌아가기</a>
            </div>
        </div>
    </div>
</main>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/pages/findAccount.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js"]
  },
  'index': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    
    <main class="main-content">
        <div class="container"><section class="top-ads hidden" id="top-ads-container" data-top-ad-placement="HOME" aria-label="홈 상단 광고"></section></div>
        <div class="container home-service-wrap">
            <section class="service-category-grid" aria-label="홈 카테고리">
                <a class="service-item" href="play.html">
                    <span class="service-icon">🎲</span>
                    <span class="service-label">PLAY</span>
                </a>
                <a class="service-item" href="community.html">
                    <span class="service-icon">📝</span>
                    <span class="service-label">커뮤니티</span>
                </a>
                <a class="service-item" href="business-info.html">
                    <span class="service-icon">🏢</span>
                    <span class="service-label">업체정보</span>
                </a>
            </section>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/libs/koProfanityFilter.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/topAds.js"></script>
    <script src="scripts/js/pages/home.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/community-board.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/topAds.js", "scripts/js/pages/home.js", "scripts/js/components/footerNav.js"]
  },
  'live': livePageConfig,
  'login': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container age-notice-banner" aria-label="청소년 이용 제한 안내">
            <div class="age-notice-icon" aria-hidden="true"><span class="age-notice-number">19</span></div>
            <div class="age-notice-text">
                <p>본 정보내용은 청소년 유해매체물로서 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 청소년 보호법의 규정에 의하여</p>
                <p class="age-notice-warning">만 19세 미만의 청소년이 이용할 수 없습니다.</p>
            </div>
        </div>

        <div class="container auth-container auth-login">
            <div class="community-section-header">
                <h1>로그인</h1>
                <p>미드나잇 맨즈에 로그인하여 다양한 사람들과 소통하세요</p>
            </div>

            <div class="card">
                <form id="login-form">
                    <div class="error-banner hidden" id="error-banner">
                        <p id="error-message"></p>
                    </div>

                    <div class="form-group">
                        <label for="loginId" class="form-label">아이디</label>
                        <input type="text" id="loginId" name="loginId" class="form-control" placeholder="아이디를 입력하세요" required>
                        <div class="error-message hidden" id="loginId-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="password" class="form-label">비밀번호</label>
                        <input type="password" id="password" name="password" class="form-control" placeholder="비밀번호를 입력하세요" required>
                        <div class="error-message hidden" id="password-error"></div>
                    </div>

                    <button type="submit" class="btn btn-primary w-full" id="submit-btn">로그인</button>
                </form>

                <div class="text-center mt-3">
                    <p>아직 계정이 없으신가요? <a href="register.html">회원가입</a></p>
                </div>

                <div class="grid grid-2 mt-3">
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                    <a href="find-account.html" class="btn btn-outline btn-sm">계정 찾기</a>
                </div>
            </div>
        </div>

        <footer class="company-footer-slot" aria-label="마이페이지 하단 정보">
            <div class="company-footer-top">
                <strong class="company-footer-logo">MIDNIGHT MENS</strong>
            </div>
            <div class="company-footer-links-row">
                <a href="/board/terms">이용약관</a>
                <span class="footer-divider" aria-hidden="true"></span>
                <a href="/board/terms">개인정보처리방침</a>
            </div>
            <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
            <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 010-6567-4519</p>
            <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
        </footer>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/validation.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/pages/login.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/login.js", "scripts/js/components/footerNav.js"]
  },
  'my-page': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">마이페이지</span>
                </div>
            </header>

            <div class="container mypage-profile-container">
                <p class="mypage-mobile-title">내 정보</p>

                <section class="mypage-card mypage-info-card" id="my-stats">
                    <div class="loading">로딩 중...</div>
                </section>

                <section class="mypage-link-section hidden" id="ad-center-wrapper">
                    <p class="mypage-link-section-title">광고센터</p>
                    <div class="mypage-link-list" id="ad-center-section">
                        <a class="mypage-link-item" id="stamp-purchase-link" href="/stamp-purchase"><span>스탬프 구매</span></a>
                        <a class="mypage-link-item" href="/ad-purchase">
                            <span>광고 활성화</span>
                            <span class="mypage-ad-activation-status-wrap" id="mypage-ad-activation-status-wrap">
                                <span id="mypage-ad-activation-status" class="mypage-status-badge mypage-status-badge--unregistered">비활성화</span>
                            </span>
                        </a>
                        <a class="mypage-link-item" href="/jump-management"><span>점프 관리</span></a>
                        <a class="mypage-link-item" href="/ad-profile-management">
                            <span>광고프로필 관리</span>
                            <span id="mypage-ad-profile-status" class="mypage-status-badge mypage-status-badge--unregistered">미등록</span>
                        </a>
                        <a class="mypage-link-item" href="/business-management">
                            <span>사업자정보 관리</span>
                            <span class="mypage-business-info-status-wrap">
                                <span id="mypage-business-info-status" class="mypage-status-badge mypage-status-badge--unregistered">미등록</span>
                                <span id="mypage-business-info-rejection-reason" class="mypage-rejection-reason hidden"></span>
                            </span>
                        </a>
                        <a class="mypage-link-item" href="/ad-order-history"><span>스탬프 결제 내역</span></a>
                        <a class="mypage-link-item" href="/stamp-event-management">
                            <span>스탬프 이벤트 관리</span>
                            <span id="mypage-stamp-event-status" class="mypage-status-badge mypage-status-badge--unregistered">OFF</span>
                        </a>
                        <a class="mypage-link-item hidden" id="business-member-apply-link" href="/business-apply">
                            <span class="mypage-link-main-text">기업회원 신청</span>
                            <span class="mypage-business-apply-status-wrap">
                                <span id="mypage-business-apply-status" class="mypage-status-badge mypage-status-badge--pending hidden">검토중</span>
                                <span id="mypage-business-apply-rejection-reason" class="mypage-rejection-reason hidden"></span>
                            </span>
                        </a>
                    </div>
                </section>

                <section class="mypage-link-section">
                    <p class="mypage-link-section-title">고객센터</p>
                    <div class="mypage-link-list">
                        <a class="mypage-link-item" href="/customer-service"><span>1:1 고객센터</span></a><a class="mypage-link-item" href="/my-inquiries"><span>내 문의함</span></a>
                        <a class="mypage-link-item" href="/support/faq"><span>FAQ</span></a>
                    </div>
                </section>

                <div class="mypage-link-section">
                    <p class="mypage-link-section-title">ABOUT 미드나잇 맨즈</p>
                    <div class="mypage-link-list">
                        <a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a>
                        <a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <footer class="company-footer-slot" aria-label="마이페이지 하단 정보">
        <div class="company-footer-top">
            <strong class="company-footer-logo">MIDNIGHT MENS</strong>
        </div>
        <div class="company-footer-links-row">
            <a href="/board/terms">이용약관</a>
            <span class="footer-divider" aria-hidden="true"></span>
            <a href="/board/terms">개인정보처리방침</a>
        </div>
        <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
        <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 010-6567-4519</p>
        <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
    </footer>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/myPage.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-profile': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
      <div class="container">
        <header class="community-section-header">
          <div class="community-header-left">
            <a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a>
            <span class="community-board-name">마이페이지 - 정보 수정</span>
          </div>
        </header>

        <section class="mypage-card">
          <h3>회원정보수정</h3>
          <form id="profile-form">
            <div class="profile-form-grid">
              <label>아이디
                <input type="text" id="profile-login-id" name="loginId" readonly>
              </label>
              <label>비밀번호
                <input type="password" id="profile-password" name="password" minlength="8" placeholder="변경 시 입력">
              </label>
              <label>비밀번호 확인
                <input type="password" id="profile-password-confirm" name="passwordConfirm" minlength="8" placeholder="비밀번호 재입력">
                <small id="profile-password-match-result" class="help-text" role="status"></small>
              </label>
              <label>이름
                <input type="text" id="profile-name" name="name" readonly>
              </label>
              <label>
                <span class="profile-field-title">닉네임</span>
                <span class="profile-nickname-inline">
                  <input type="text" id="profile-nickname" name="nickname" minlength="2" maxlength="8" required>
                  <button type="button" class="btn btn-outline btn-sm hidden" id="nickname-check-btn">중복 확인</button>
                </span>
                <small id="nickname-check-result" class="help-text"></small>
                
              </label>
              <label>생년월일
                <input type="text" id="profile-birth" name="birthDate" readonly>
              </label>
              <label>연락처
                <span class="profile-nickname-inline">
                  <input type="text" id="profile-phone" name="phone" placeholder="본인인증 후 자동 입력" readonly>
                  <button type="button" class="btn btn-outline btn-sm" id="phone-verify-btn">연락처 변경</button>
                </span>
                <small id="phone-verify-result" class="help-text"></small>
                <span class="profile-consent-inline"><input type="checkbox" id="sms-consent" name="smsConsent"><span class="profile-consent-text">SMS 수신 동의</span></span>
              </label>
            </div>
            <div class="profile-form-actions">
              <button type="submit" class="btn btn-primary">저장</button>
            </div>
            <p id="profile-save-result" class="help-text" role="status"></p>
          </form>
          <section class="profile-withdraw-section">
            <button type="button" id="withdraw-open-btn" class="btn btn-outline btn-sm">회원탈퇴</button>
          </section>
          <section id="withdraw-form-section" class="withdraw-form-section hidden" aria-live="polite">
            <div class="withdraw-panel">
              <h4>회원 탈퇴 전 확인하세요.</h4>
              <p>탈퇴 후 계정 및 정보는 복구할 수 없습니다. 아래 내용을 충분히 확인한 후 신중하게 결정해 주세요.</p>
              <ul>
                <li>개인정보 및 광고 관련 정보가 즉시 삭제됩니다.</li>
                <li>탈퇴 시 작성자 표시는 탈퇴회원으로 익명 처리됩니다.</li>
                <li>이용 정지(차단) 이력은 재가입 후에도 유지될 수 있습니다.</li>
                <li>게시글, 댓글은 자동으로 삭제되지 않습니다.</li>
              </ul>
              <label for="withdraw-reason" class="withdraw-reason-label">탈퇴 사유를 남겨주세요.</label>
              <textarea id="withdraw-reason" rows="4" maxlength="500" placeholder="탈퇴 사유"></textarea>
              <p id="withdraw-result" class="help-text" role="status"></p>
              <div class="withdraw-actions">
                <button type="button" id="withdraw-cancel-btn" class="btn btn-outline btn-sm">회원 탈퇴 취소</button>
                <button type="button" id="withdraw-submit-btn" class="btn btn-danger btn-sm">회원 탈퇴하기</button>
              </div>
            </div>
          </section>
        </section></div>
      </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/myPage.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-activity': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 활동 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-points': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 포인트 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-stamps': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 스탬프 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-support': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header><div class="container">
    <section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list">
    <a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a>
    <a class="support-link-item" href="/my-inquiries"><span>내 문의함</span></a>
    <a class="support-link-item" href="/support/faq"><span>FAQ</span></a>
    <a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a>
    </div></section><div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇맨즈</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇맨즈 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header><div class="container">
    <div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇맨즈</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇맨즈 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div><section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list"><a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a><a class="support-link-item" href="/support/faq"><span>FAQ</span></a><a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a></div></section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },


  'customer-service': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">1:1 고객센터</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card"><div class="customer-service-intro"><h2>문의 / 신고 접수</h2><p>불편하신 사항을 접수해주시면 확인 후 신속하게 처리하겠습니다.<br>게시글 신고, 댓글 신고, 일반 문의 모두 동일한 화면에서 등록할 수 있습니다.</p></div>
    <form id="customer-service-form" class="customer-service-form" novalidate>
      <input type="hidden" id="inquiry-target-type" name="targetType" value="general">
      <input type="hidden" id="inquiry-target-id" name="targetId" value="">
      <div class="form-group"><label for="inquiry-type">문의 유형</label><select id="inquiry-type" name="inquiryType" class="form-control" required><option value="">-- 유형 선택 --</option><option value="question">일반 문의</option><option value="post_report">게시글 신고</option><option value="comment_report">댓글 신고</option><option value="account">계정 문의</option><option value="service_error">서비스 오류</option><option value="ad_inquiry">광고 문의</option><option value="etc">기타</option></select></div>
      <div class="form-group"><label for="inquiry-title">제목</label><input id="inquiry-title" name="title" type="text" class="form-control" maxlength="100" placeholder="문의 제목을 입력해주세요." required></div>
      <div class="form-group"><label for="inquiry-reason">신고/문의 사유</label><textarea id="inquiry-reason" name="content" class="form-control" rows="6" placeholder="상세 내용을 입력해주세요." required></textarea></div>
      <section class="customer-file-upload"><div class="file-upload-header">첨부파일</div><p class="file-upload-guide">* 파일 형식: JPG, PNG, GIF, WEBP, PDF (최대 50MB)</p>
        <div class="file-upload-item"><div class="file-input-wrapper"><input type="file" name="attachments[]" id="attachment_1" class="file-input" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"><button type="button" class="cancel-button" data-target="attachment_1" aria-label="첫 번째 파일 제거">×</button></div></div>
        <div class="file-upload-item"><div class="file-input-wrapper"><input type="file" name="attachments[]" id="attachment_2" class="file-input" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"><button type="button" class="cancel-button" data-target="attachment_2" aria-label="두 번째 파일 제거">×</button></div></div>
        <div class="file-upload-item"><div class="file-input-wrapper"><input type="file" name="attachments[]" id="attachment_3" class="file-input" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"><button type="button" class="cancel-button" data-target="attachment_3" aria-label="세 번째 파일 제거">×</button></div></div>
      </section>
      <p class="customer-service-note">문의는 즉시 답변드릴 수 있도록 노력하고 있습니다.<br><br>답변 시간: 24시간 (순차처리)</p>
      <button type="submit" class="btn btn-primary btn-block btn-round">접수하기</button>
    </form>
    <div class="customer-service-actions"><a class="btn btn-outline btn-block" href="/my-inquiries">내 문의함 바로가기</a></div>
    </section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/customerService.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/customerService.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiries': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="고객센터 메뉴로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">내 문의함</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card"><div id="my-inquiries-list" class="my-inquiries-board"></div><p id="my-inquiries-empty" class="my-inquiries-empty">아직 접수된 문의가 없습니다.</p></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myInquiries.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myInquiries.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiry-detail': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-inquiries" class="community-back-link icon-btn icon-btn-square" aria-label="내 문의함으로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">문의 상세</span></div></header><div class="container customer-service-page mypage-linked-container">
    <div class="mypage-linked-content"><section id="my-inquiry-detail" class="customer-service-card my-inquiry-detail-card"></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myInquiryDetail.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myInquiryDetail.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'support-board': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container mypage-linked-container"><div class="loading" id="support-public-loading"><div class="spinner"></div><p>불러오는 중...</p></div>
    <div class="error-banner hidden" id="support-public-error"><p id="support-public-error-message"></p></div>
    <header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">공지사항</span></div></header>
    <div id="support-public-list" class="hidden"></div><div class="mypage-linked-content">
    </div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/supportBoard.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css", "styles/postDetail.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/supportBoard.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'post-detail': postDetailPageConfig,
  'play': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="/login" class="btn btn-outline btn-sm">로그인</a>
                    <a href="/register" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/admin" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
      <div class="container">
        <header class="community-section-header">
          <div class="community-header-left">
            <span class="community-board-name">PLAY</span>
          </div>
        </header>
        <div class="grid-collapse" style="max-height: 1600px; opacity: 1; padding: 5%;">
          <div class="play-tool-grid">
            <div class="card-enter" style="animation-delay: 0ms;">
              <a class="play-tool-card" href="/play/live">
                <div class="play-tool-card__content">
                  <span class="play-tool-card__icon">🔴</span>
                  <div class="play-tool-card__text">
                    <p class="play-tool-card__title">LIVE</p>
                    <p class="play-tool-card__description">실시간 출근부</p>
                  </div>
                </div>
              </a>
            </div>
            <div class="card-enter" style="animation-delay: 40ms;">
              <a class="play-tool-card" href="/play/rbti">
                <div class="play-tool-card__content">
                  <span class="play-tool-card__icon">🧪</span>
                  <div class="play-tool-card__text">
                    <p class="play-tool-card__title">RBTI</p>
                    <p class="play-tool-card__description">유흥 MBTI</p>
                  </div>
                </div>
              </a>
            </div>
            <div class="card-enter" style="animation-delay: 80ms;">
              <a class="play-tool-card" href="/play/alcohol">
                <div class="play-tool-card__content">
                  <span class="play-tool-card__icon">🍺</span>
                  <div class="play-tool-card__text">
                    <p class="play-tool-card__title">음주 측정기</p>
                    <p class="play-tool-card__description">BAC 자가진단</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js"]
  },
  'alcohol': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="/login" class="btn btn-outline btn-sm">로그인</a>
                    <a href="/register" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/admin" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
      <div class="container">
        <header class="community-section-header">
          <div class="community-header-left">
            <a href="/play" class="community-back-link icon-btn icon-btn-square" aria-label="PLAY로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a>
            <span class="community-board-name">음주 측정기</span>
          </div>
        </header>
        <div class="alcohol-content"><section class="alcohol-calculator card-enter">
          <div style="padding: 22px;">
            <h2 class="alcohol-title">🍺 음주 측정기</h2>
            <p class="alcohol-description">음주량과 시간을 입력하면 예상 혈중알코올농도(BAC)를 계산합니다.</p>

            <div class="alcohol-grid alcohol-grid--top">
                <label class="alcohol-field">
                <span>성별</span>
                <input id="alcohol-gender" type="hidden" value="0.68" />
                <div class="alcohol-gender-buttons" id="alcohol-gender-buttons">
                    <button type="button" class="alcohol-gender-btn alcohol-gender-btn--active" data-gender-value="0.68">남성</button>
                    <button type="button" class="alcohol-gender-btn" data-gender-value="0.55">여성</button>
                </div>
                </label>
                <label class="alcohol-field">
                <span>체중</span>
                <div class="alcohol-input-wrap">
                  <input id="alcohol-weight" class="alcohol-input" type="number" min="30" max="200" placeholder="70" />
                  <span class="alcohol-input-unit">kg</span>
                </div>
                </label>
            </div>

            <label class="alcohol-field">
              <span>음주량</span>
              <div class="alcohol-drink-list">
                <div class="alcohol-drink-row"><span>소주 (1잔 50ml)</span><input id="alcohol-soju" type="hidden" value="0" /><div class="alcohol-stepper" data-stepper-target="alcohol-soju"><button type="button" class="alcohol-stepper-btn" data-step="-1">−</button><span data-stepper-display>0</span><button type="button" class="alcohol-stepper-btn" data-step="1">+</button></div></div>
                <div class="alcohol-drink-row"><span>맥주 (1잔 500ml)</span><input id="alcohol-beer" type="hidden" value="0" /><div class="alcohol-stepper" data-stepper-target="alcohol-beer"><button type="button" class="alcohol-stepper-btn" data-step="-1">−</button><span data-stepper-display>0</span><button type="button" class="alcohol-stepper-btn" data-step="1">+</button></div></div>
                <div class="alcohol-drink-row"><span>와인 (1잔 150ml)</span><input id="alcohol-wine" type="hidden" value="0" /><div class="alcohol-stepper" data-stepper-target="alcohol-wine"><button type="button" class="alcohol-stepper-btn" data-step="-1">−</button><span data-stepper-display>0</span><button type="button" class="alcohol-stepper-btn" data-step="1">+</button></div></div>
                <div class="alcohol-drink-row"><span>양주 (1잔 30ml)</span><input id="alcohol-whiskey" type="hidden" value="0" /><div class="alcohol-stepper" data-stepper-target="alcohol-whiskey"><button type="button" class="alcohol-stepper-btn" data-step="-1">−</button><span data-stepper-display>0</span><button type="button" class="alcohol-stepper-btn" data-step="1">+</button></div></div>
                <div class="alcohol-drink-row"><span>막걸리 (1사발 300ml)</span><input id="alcohol-makgeolli" type="hidden" value="0" /><div class="alcohol-stepper" data-stepper-target="alcohol-makgeolli"><button type="button" class="alcohol-stepper-btn" data-step="-1">−</button><span data-stepper-display>0</span><button type="button" class="alcohol-stepper-btn" data-step="1">+</button></div></div>
              </div>
            </label>

            <label class="alcohol-field">
                <span>음주 후 경과 시간</span>
                <div class="alcohol-input-wrap">
                  <input id="alcohol-hours" class="alcohol-input" type="number" min="0" step="1" placeholder="0" value="0" />
                  <span class="alcohol-input-unit">시간</span>
                </div>
            </label></div>

            <div class="alcohol-actions">
                <button id="alcohol-reset" class="alcohol-gender-btn" type="button">초기화</button>
            </div>

            <div id="alcohol-result" class="alcohol-result" aria-live="polite">값을 입력하고 계산해보세요.</div>
        </section>

        <section class="alcohol-info">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">음주 운전 처벌 기준</h2>
              <p class="text-gray-600 leading-relaxed">2019년 6월 25일부터 시행된 <strong>윤창호법</strong>(도로교통법 개정)으로 음주운전 처벌 기준이 대폭 강화되었습니다. 기존 0.05%였던 면허정지 기준이 0.03%로 낮아졌습니다.</p>
              <ul class="text-gray-600 space-y-2 mt-3">
                <div><strong>혈중알코올농도 0.03% 이상 ~ 0.08% 미만:</strong> 1년 이하 징역 또는 500만원 이하 벌금, 면허정지 (100일)</div>
                <div><strong>혈중알코올농도 0.08% 이상 ~ 0.2% 미만:</strong> 1~2년 이하 징역 또는 500~1,000만원 이하 벌금, 면허취소</div>
                <div><strong>혈중알코올농도 0.2% 이상:</strong> 2~5년 이하 징역 또는 1,000~2,000만원 이하 벌금, 면허취소</div>
                <div><strong>음주운전 2회 이상 적발:</strong> 2~5년 이하 징역 또는 1,000~2,000만원 이하 벌금</div>
                <div><strong>음주 사고 사망:</strong> 무기 또는 3년 이상 징역 (위험운전치사)</div>
              </ul>
              <p class="text-gray-600 leading-relaxed mt-3 text-sm">음주 측정 거부 시에도 1~5년 이하 징역 또는 500~2,000만원 이하 벌금이 부과됩니다. 절대로 음주 후에는 운전하지 마세요.</p>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">혈중알코올농도(BAC)란?</h2>
              <p class="text-gray-600 leading-relaxed">혈중알코올농도(Blood Alcohol Concentration, BAC)는 혈액 100ml 중에 포함된 알코올의 양(g)을 백분율로 나타낸 수치입니다. BAC 0.03%는 혈액 100ml에 알코올 0.03g이 포함되어 있다는 뜻입니다.</p>
              <p class="text-gray-600 leading-relaxed mt-3">본 계산기는 <strong>Widmark 공식</strong>을 사용합니다. 이 공식은 스웨덴의 법의학자 Erik Widmark가 개발한 것으로, 섭취한 알코올의 양, 체중, 성별에 따른 체내 수분 비율, 경과 시간을 고려하여 BAC를 추정합니다.</p>
              <div class="bg-gray-50 rounded-lg p-4 mt-3">
                <p class="text-sm text-gray-700 font-mono">BAC(%) = (섭취 알코올량(g) / (체중(kg) x 성별계수)) - (0.015 x 경과시간)</p>
                <p class="text-sm text-gray-500 mt-2">성별계수: 남성 0.68, 여성 0.55 (체내 수분 비율 차이)</p>
              </div>
              <p class="text-gray-600 leading-relaxed mt-3 text-sm">이 공식은 추정치이며, 실제 BAC는 개인의 체질, 유전적 요인, 식사 여부, 간 기능 상태 등에 따라 달라질 수 있습니다.</p>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">알코올 분해에 영향을 주는 요인</h2>
              <ul class="text-gray-600 space-y-2">
                <div><strong>체중:</strong> 체중이 많을수록 체내 수분량이 많아 같은 양의 알코올을 섭취해도 BAC가 낮게 나타납니다.</div>
                <div><strong>성별:</strong> 일반적으로 여성은 남성보다 체내 수분 비율이 낮아 같은 양을 마셔도 BAC가 더 높게 올라갑니다.</div>
                <div><strong>식사 여부:</strong> 빈속에 마시면 알코올 흡수가 빨라 BAC가 급격히 상승합니다. 식사 후 음주하면 흡수 속도가 느려집니다.</div>
                <div><strong>간 기능:</strong> 알코올의 90% 이상은 간에서 분해됩니다. 간 기능이 저하된 경우 분해 속도가 느려집니다.</div>
                <div><strong>음주 속도:</strong> 짧은 시간에 많이 마시면 간의 분해 능력을 초과하여 BAC가 급격히 상승합니다.</div>
                <div><strong>유전적 요인:</strong> 알코올 분해 효소(ADH, ALDH)의 활성도는 개인마다 다릅니다. 동양인의 약 40%는 ALDH2 유전자 변이로 알코올 분해가 느립니다.</div>
                <div><strong>나이:</strong> 나이가 들수록 체내 수분량이 줄고 간의 대사 기능이 저하되어 같은 양을 마셔도 더 취하기 쉽습니다.</div>
              </ul>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">숙취 해소 팁</h2>
              <ul class="text-gray-600 space-y-2">
                <div><strong>수분 섭취:</strong> 알코올은 이뇨 작용을 해 탈수를 유발합니다. 음주 중과 음주 후에 충분한 물을 마셔주세요.</div>
                <div><strong>해장국/꿀물:</strong> 콩나물국, 북어국 등 해장국은 아세트알데히드 분해를 돕는 아스파라긴산이 풍부합니다. 꿀물의 과당은 알코올 대사를 촉진합니다.</div>
                <div><strong>충분한 수면:</strong> 수면 중 간이 알코올을 분해합니다. 가능하면 충분히 쉬어주세요.</div>
                <div><strong>가벼운 식사:</strong> 빈속보다는 소화가 잘 되는 음식을 섭취하면 위장 부담을 줄일 수 있습니다.</div>
                <div><strong>숙취해소제:</strong> 음주 전후에 복용하면 도움이 될 수 있지만, 과학적으로 확실히 검증된 제품은 제한적입니다.</div>
              </ul>
              <p class="text-gray-600 leading-relaxed mt-3 text-sm">가장 효과적인 숙취 예방법은 적당히 마시거나 마시지 않는 것입니다. 시간당 평균 0.015% 정도의 알코올이 분해되며, 이를 빠르게 하는 확실한 방법은 없습니다.</p>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-4">자주 묻는 질문 (FAQ)</h2>
              <div class="space-y-4">
                <div>
                  <h3 class="text-base font-medium text-gray-800">소주 1병을 마시면 몇 시간 후에 운전할 수 있나요?</h3>
                  <p class="text-gray-600 leading-relaxed mt-1 mb-1">소주 1병(360ml, 약 7잔)을 마신 70kg 남성의 경우, 예상 BAC는 약 0.08~0.10%입니다. 시간당 약 0.015%씩 분해되므로 완전히 분해되기까지 약 6~7시간이 걸립니다. 다만 개인차가 크므로, 안전을 위해 최소 8시간 이상 기다리는 것을 권장합니다.</p>
                </div>
                <div>
                  <h3 class="text-base font-medium text-gray-800">대리운전 vs 택시, 어느 쪽이 비용이 적게 드나요?</h3>
                  <p class="text-gray-600 leading-relaxed mt-1 mb-1">대리운전은 보통 기본 1~1.5만원에 거리별 추가 요금이 붙어 서울 시내 기준 1.5~3만원 정도입니다. 택시는 기본 4,800원에 거리/시간 요금이 추가됩니다. 10km 이내라면 택시가 저렴하고, 장거리라면 대리운전이 유리할 수 있습니다. 어느 쪽이든 음주운전 벌금(500만원~)이나 사고 비용에 비하면 훨씬 저렴합니다.</p>
                </div>
                <div>
                  <h3 class="text-base font-medium text-gray-800">맥주와 소주를 섞어 마시면 더 빨리 취하나요?</h3>
                  <p class="text-gray-600 leading-relaxed mt-1 mb-1">과학적으로 섞어 마시는 것 자체가 BAC를 높이지는 않습니다. 다만 폭탄주 등으로 섞어 마시면 음주 속도가 빨라지고, 탄산(맥주)이 알코올 흡수를 촉진하여 실제로 더 빨리 취할 수 있습니다. 총 알코올 섭취량이 같다면 BAC도 비슷합니다.</p>
                </div>
                <div>
                  <h3 class="text-base font-medium text-gray-800">다음 날 아침에도 음주 단속에 걸릴 수 있나요?</h3>
                  <p class="text-gray-600 leading-relaxed mt-1 mb-1">네, 가능합니다. 이른바 "숙취 운전"으로, 전날 과음 후 다음 날 아침에도 혈중알코올농도가 0.03%를 넘을 수 있습니다. 소주 2병 이상 마셨다면 다음 날 오전까지도 기준치를 초과할 수 있으므로, 충분한 시간이 지난 후 운전하세요.</p>
                </div>
              </div>
            </div>
        </section>
      </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/pages/alcohol.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css", "styles/alcohol.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/alcohol.js", "scripts/js/components/footerNav.js"]
  },

  'register': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container auth-container">
            <div class="community-section-header">
                <h1>회원가입</h1>
                <p>미드나잇 맨즈에 가입하여 다양한 사람들과 소통하세요</p>
            </div>

            <div class="card">
                <form id="register-form">
                    <div id="register-step-terms" class="legacy-terms-panel">
                        <div class="legacy-terms-section">
                            <p class="legacy-terms-title">[필수] 이용약관</p>
                            <div class="legacy-terms-scroll">
                                <h3>제1장 총칙</h3>
                                <p>본 약관은 미드나잇 맨즈가 제공하는 서비스 이용과 관련한 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                                <p>회원가입 시 본 약관에 동의한 것으로 간주되며, 관련 법령 및 서비스 운영 정책에 따라 약관이 변경될 수 있습니다.</p>
                                <p>회사는 서비스 운영상 필요한 경우 공지사항을 통해 변경 내용을 안내하며, 회원은 변경된 약관에 동의하지 않을 경우 이용을 중단할 수 있습니다.</p>
                                <p>회원은 정확한 정보를 입력해야 하며, 타인의 정보를 도용하거나 허위 정보를 입력한 경우 서비스 이용이 제한될 수 있습니다.</p>
                                <p>회사는 안정적인 서비스 제공을 위해 최선을 다하며, 시스템 점검이나 불가항력적 사유에 따라 일시적으로 서비스가 중단될 수 있습니다.</p>
                            </div>
                            <label class="legacy-consent-item" for="termsConsent">
                                <input type="checkbox" id="termsConsent" name="termsConsent" required>
                                <span>[필수] 이용약관에 동의합니다.</span>
                            </label>
                        </div>

                        <div class="legacy-terms-section">
                            <p class="legacy-terms-title">[필수] 개인정보처리방침</p>
                            <div class="legacy-terms-scroll">
                                <p>회사는 회원의 개인정보를 중요하게 생각하며 관련 법령을 준수합니다.</p>
                                <p>수집된 개인정보는 회원관리, 서비스 제공, 본인확인, 고객 문의 대응 등의 목적에 한해 이용됩니다.</p>
                                <p>회원의 개인정보는 목적 달성 후 지체 없이 파기하며, 법령에 따라 보관이 필요한 경우 해당 기간 동안 안전하게 보관합니다.</p>
                                <p>개인정보 처리 방침이 변경되는 경우 서비스 내 공지사항을 통해 사전 안내합니다.</p>
                                <p>자세한 내용은 <a href="/board/terms" target="_blank" rel="noopener noreferrer">이용약관/정책 페이지</a>에서 확인할 수 있습니다.</p>
                            </div>
                            <label class="legacy-consent-item" for="privacyConsent">
                                <input type="checkbox" id="privacyConsent" name="privacyConsent">
                                <span>[필수] 개인정보처리방침에 동의합니다.</span>
                            </label>
                        </div>

                        <div class="legacy-terms-section">
                            <p class="legacy-terms-title">[선택] 마케팅 정보 수신 동의</p>
                            <div class="legacy-terms-scroll">
                                <p>이벤트, 혜택, 신규 서비스 안내 등 마케팅 정보를 문자(SMS)로 받아보실 수 있습니다.</p>
                                <p>본 동의는 선택사항이며, 동의하지 않아도 회원가입 및 서비스 이용이 가능합니다.</p>
                                <p>수신 동의 후에도 마이페이지 또는 수신 거부 안내를 통해 언제든지 변경할 수 있습니다.</p>
                            </div>
                            <label class="legacy-consent-item" for="marketingConsent">
                                <input type="checkbox" id="marketingConsent" name="marketingConsent">
                                <span>[선택] 마케팅 정보 수신에 동의합니다.</span>
                            </label>
                        </div>

                        <div class="legacy-terms-section">
                            <div class="error-message hidden" id="termsConsent-error">약관 및 정책 동의가 필요합니다.</div>
                            <button type="button" class="btn btn-secondary w-full" id="select-all-consent-btn">모두 동의</button>
                            <button type="button" class="btn btn-outline w-full" id="agree-terms-btn">본인(성인)인증하고 회원가입</button>
                        </div>
                    </div>

                    <div id="register-step-detail" class="hidden">
                        <div class="form-group">
                            <label for="loginId" class="form-label">아이디</label>
                            <input type="text" id="loginId" name="loginId" class="form-control" placeholder="아이디를 입력하세요" minlength="4" maxlength="20" pattern="[A-Za-z0-9]+" autocomplete="username" required>
                            <div class="error-message hidden" id="loginId-error"></div>
                            <small class="text-muted">4~20자의 영문 대소문자와 숫자만 입력해주세요</small>
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">비밀번호</label>
                            <input type="password" id="password" name="password" class="form-control" placeholder="비밀번호를 입력하세요" required>
                            <div class="error-message hidden" id="password-error"></div>
                            <small class="text-muted">8자 이상, 영문/숫자를 포함하고 특수문자를 사용할 수 있습니다</small>
                        </div>

                        <div class="form-group">
                            <label for="confirmPassword" class="form-label">비밀번호 확인</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" placeholder="비밀번호를 다시 입력하세요" required>
                            <div class="error-message hidden" id="confirmPassword-error"></div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">이름</label>
                            <p class="form-control-static" id="name-display">본인인증 후 자동 입력됩니다.</p>
                            <input type="hidden" id="name" name="name" value="">
                        </div>

                        <div class="form-group">
                            <label for="nickname" class="form-label">닉네임</label>
                            <div class="grid grid-2 register-nickname-inline">
                                <input type="text" id="nickname" name="nickname" class="form-control" placeholder="사용할 닉네임을 입력하세요" minlength="2" maxlength="8" required>
                                <button type="button" class="btn btn-outline btn-sm" id="check-nickname-btn">중복 확인</button>
                            </div>
                            <small class="text-muted" id="nickname-status">닉네임 중복 확인이 필요합니다.</small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">생년월일</label>
                            <p class="form-control-static" id="birthDate-display">본인인증 후 자동 입력됩니다.</p>
                            <input type="hidden" id="birthDate" name="birthDate" value="">
                        </div>

                        <div class="form-group">
                            <label class="form-label">연락처</label>
                            <p class="form-control-static" id="phone-display">본인인증 후 자동 입력됩니다.</p>
                            <input type="hidden" id="phone" name="phone" value="">
                            <div class="error-message hidden" id="phone-error"></div>
                        </div>

                        <div class="form-group">
                            <label class="register-consent-item" for="smsConsent">
                                <input type="checkbox" id="smsConsent" name="smsConsent" checked>
                                <span>SMS 수신 동의</span>
                            </label>
                        </div>

                        <input type="hidden" id="genderDigit" name="genderDigit" value="">
                        <input type="hidden" id="identityCi" name="identityCi" value="">
                        <input type="hidden" id="identityDi" name="identityDi" value="">
                        <input type="hidden" id="identityVerificationId" name="identityVerificationId" value="">
                        <input type="hidden" id="phoneVerified" name="phoneVerified" value="false">
                        <input type="hidden" id="identityVerified" name="identityVerified" value="false">
                        <input type="hidden" id="nicknameChecked" name="nicknameChecked" value="false">
                        <input type="hidden" id="nicknameAvailable" name="nicknameAvailable" value="false">

                        <button type="submit" class="btn btn-outline w-full" id="submit-btn">회원가입 완료</button>
                    </div>
                </form>

                <div class="text-center mt-3">
                    <p>이미 계정이 있으신가요? <a href="login.html">로그인</a></p>
                </div>
            </div>
        </div>

        <footer class="company-footer-slot" aria-label="마이페이지 하단 정보">
            <div class="company-footer-top">
                <strong class="company-footer-logo">MIDNIGHT MENS</strong>
            </div>
            <div class="company-footer-links-row">
                <a href="/board/terms">이용약관</a>
                <span class="footer-divider" aria-hidden="true"></span>
                <a href="/board/terms">개인정보처리방침</a>
            </div>
            <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
            <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 010-6567-4519</p>
            <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
        </footer>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/validation.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/pages/register.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/libs/koProfanityFilter.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/register.js", "scripts/js/components/footerNav.js"]
  },
  'terms-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link icon-btn icon-btn-square" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">약관 및 정책</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card terms-policy-card"><h2>서비스 이용약관</h2><p>본 약관은 MN컴퍼니(이하 “회사”)가 운영하는 미드나잇 맨즈 커뮤니티 서비스(이하 “서비스”)의 이용과 관련하여 회사와 회원의 권리·의무 및 책임사항을 규정합니다.</p><ul><li>회원은 정확한 정보로 가입해야 하며, 계정 공유·도용·명의 도용은 금지됩니다.</li><li>회원은 관련 법령, 본 약관, 커뮤니티 운영정책을 준수해야 합니다.</li><li>회사는 서비스 운영상 필요한 경우 기능 추가·변경·중단을 사전 공지 후 진행할 수 있습니다. 단, 긴급 장애 대응 등 불가피한 경우 사후 공지할 수 있습니다.</li></ul><p>회사는 회원이 등록한 게시물 중 관계 법령 위반, 권리 침해, 서비스 운영 방해, 스팸·광고·사기성 게시물 등에 해당하는 내용을 사전 통지 없이 제한·삭제할 수 있습니다.</p><h2>회원의 권리와 의무</h2><ul><li>회원은 언제든지 회원 탈퇴를 요청할 수 있으며, 회사는 관련 법령에 따라 처리합니다.</li><li>회원은 본인 계정 보안(아이디/비밀번호 관리)에 대한 책임이 있으며, 부정 사용 발견 시 즉시 회사에 알려야 합니다.</li><li>회원은 서비스를 통해 얻은 정보를 회사의 사전 승인 없이 상업적으로 이용하거나 제3자에게 제공할 수 없습니다.</li></ul><h2>개인정보처리방침</h2><p>MN컴퍼니(이하 “회사”)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 권익을 보장하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.</p><p>회사는 서비스 제공에 필요한 범위에서만 개인정보를 수집·이용하며, 목적이 변경되는 경우 관련 법령에 따라 별도 동의를 받는 등 필요한 조치를 이행합니다.</p><ul><li>처리 목적: 회원 가입의사 확인, 본인 식별·인증, 계정 관리, 고객 문의 처리, 부정 이용 방지, 공지 전달</li><li>처리 항목: 아이디, 비밀번호, 휴대폰 번호, 닉네임(서비스 이용 과정에서 IP주소, 쿠키, 접속일시, 이용기록, 기기정보가 자동 수집될 수 있음)</li><li>보유 기간: 회원 탈퇴 시까지. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 별도 보관</li><li>커뮤니티 게시글·댓글 수정 로그 보관: 일반 로그는 수정일로부터 3개월, 신고가 접수된 게시글·댓글의 수정 로그는 수정일로부터 1년 보관</li></ul><p>회사는 정보주체의 동의가 있거나 법령에 근거한 경우를 제외하고 개인정보를 제3자에게 제공하지 않으며, 위탁이 필요한 경우 수탁자·위탁업무를 사전에 고지하고 관리·감독합니다.</p><p>정보주체는 언제든지 개인정보 열람, 정정, 삭제, 처리정지 요구를 할 수 있으며 회사는 관련 법령에 따라 지체 없이 조치합니다. 다만, 법령상 보관의무가 있는 정보는 삭제가 제한될 수 있습니다.</p><ul><li>안전성 확보조치: 접근권한 관리, 비밀번호 등 주요 정보 암호화, 접속기록 보관 및 위변조 방지, 보안 프로그램 운영, 내부관리계획 수립·시행</li><li>쿠키 운영: 맞춤형 서비스 제공을 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</li><li>권익침해 구제: 개인정보침해신고센터(국번없이 118), 개인정보분쟁조정위원회(1833-6972) 등을 통해 상담 및 구제를 받을 수 있습니다.</li></ul><p>개인정보 보호책임자 및 문의 창구는 고객센터를 통해 안내하며, 관련 문의에 대해 지체 없이 답변·처리합니다.</p><h2>커뮤니티 운영정책</h2><p>회사는 안전하고 건전한 커뮤니티 환경을 위해 아래 정책을 적용합니다.</p><ul><li>금지 콘텐츠: 불법 정보, 혐오·차별·비방, 음란물, 사칭, 사기·유도, 저작권·초상권 침해 게시물</li><li>제재 절차: 안내/경고 → 게시물 제한 또는 임시 이용제한 → 영구 이용제한</li><li>신고 처리: 접수된 신고는 내부 기준에 따라 검토 후 조치하며, 필요 시 추가 소명 자료를 요청할 수 있습니다.</li></ul><h2>면책 및 분쟁해결</h2><p>회사는 천재지변, 시스템 장애, 외부 서비스 연동 문제 등 불가항력으로 인한 서비스 중단에 대해 책임이 제한될 수 있습니다. 다만, 회사의 고의 또는 중대한 과실이 있는 경우는 예외로 합니다.</p><p>회사와 회원 간 분쟁은 상호 협의를 우선하며, 협의가 어려운 경우 대한민국 법령을 따르고 관할 법원은 관련 법령에 따릅니다.</p><p class="terms-policy-updated">시행일: 2026-04-28</p></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'not-found': {
    template: `<main class="main-content not-found-page">
        <div class="container">
            <section class="not-found-card">
                <img src="/src/assets/image/404.png" alt="404 페이지" class="not-found-image">
                <h1>페이지를 찾을 수 없어요</h1>
                <p>요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.</p>
                <a href="/" class="btn btn-primary">홈으로 이동</a>
            </section>
        </div>
    </main>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/pages.css"],
    scripts: []
  },
};

export { pageRegistry };
