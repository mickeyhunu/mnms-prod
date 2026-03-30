/**
 * 파일 역할: 페이지 키와 실제 페이지 렌더링 모듈을 매핑하는 레지스트리 파일.
 */
import { adminPageConfig } from './pages/admin/config.js';
import { communityPageConfig } from './pages/community/config.js';
import { livePageConfig } from './pages/live/config.js';
import { postDetailPageConfig } from './pages/post-detail/config.js';

const pageRegistry = {
  'admin': adminPageConfig,
  'bookmarks': {
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
            <div class="community-section-header">
                <div class="community-header-left">
                    <a href="/community" class="community-back-link" aria-label="커뮤니티로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <h1>내 북마크</h1>
                </div>
                <p>북마크한 게시글을 확인하세요</p>
            </div>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>북마크 목록을 불러오는 중...</p>
            </div>

            <div class="error-banner hidden" id="error-banner">
                <p id="error-message"></p>
                <button class="btn btn-sm btn-primary" id="retry-btn">다시 시도</button>
            </div>

            <div class="empty-state hidden" id="empty-state">
                <h3>북마크한 게시글이 없습니다</h3>
                <p>마음에 드는 게시글에 북마크를 추가해보세요!</p>
                <a href="index.html" class="btn btn-primary">게시글 둘러보기</a>
            </div>

            <div id="bookmark-list"></div>

            <div class="pagination hidden" id="pagination">
                <button class="btn btn-outline btn-sm" id="prev-btn" disabled>이전</button>
                <div class="page-numbers" id="page-numbers"></div>
                <button class="btn btn-outline btn-sm" id="next-btn">다음</button>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/bookmarks.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/bookmarks.js", "scripts/js/components/footerNav.js"]
  },
  'business-info': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-primary btn-sm">회원가입</a>
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

            <section class="admin-entry-editor">
                <div>
                    <p class="admin-user-detail-eyebrow">업체 광고 등록/수정</p>
                    <h3 id="business-ads-editor-title">새 업체 광고 등록</h3>
                    <p class="admin-user-detail-description">업체 광고는 배너광고 DB와 분리되어 저장됩니다.</p>
                </div>
                <div class="admin-user-form-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;">
                    <div class="form-group">
                        <label class="form-label" for="business-ads-form-title">광고 제목</label>
                        <input type="text" id="business-ads-form-title" class="form-control" maxlength="255" placeholder="광고 제목을 입력하세요">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="business-ads-form-link-url">광고 링크 URL</label>
                        <input type="url" id="business-ads-form-link-url" class="form-control" placeholder="https://">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="business-ads-form-image-file">광고 이미지 첨부</label>
                        <input type="file" id="business-ads-form-image-file" class="form-control" accept="image/*">
                        <p class="help-text text-muted" id="business-ads-form-image-help">이미지를 선택하고 업로드 버튼을 누르세요.</p>
                        <button class="btn btn-outline btn-sm" id="business-ads-image-upload-btn" type="button">이미지 업로드</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="business-ads-form-image-url">업로드된 이미지 URL</label>
                        <input type="text" id="business-ads-form-image-url" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="business-ads-form-display-order">노출 순서</label>
                        <input type="number" id="business-ads-form-display-order" class="form-control" value="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="business-ads-form-is-active">노출 여부</label>
                        <select id="business-ads-form-is-active" class="form-control">
                            <option value="true">노출</option>
                            <option value="false">숨김</option>
                        </select>
                    </div>
                </div>
                <div class="admin-entry-editor__actions" style="margin-top:12px;">
                    <button class="btn btn-secondary hidden" id="business-ads-cancel-btn" type="button">수정 취소</button>
                    <button class="btn btn-primary" id="business-ads-save-btn" type="button">광고 등록</button>
                </div>
                <p id="business-ads-form-help" class="help-text admin-user-save-result" role="status"></p>
            </section>

            <div class="admin-list-toolbar">
                <p class="admin-list-toolbar__meta">총 <strong id="business-ads-total">0</strong>건</p>
            </div>
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead><tr><th>ID</th><th>제목</th><th>링크</th><th>순서</th><th>노출</th><th>생성일</th><th>수정일</th><th>관리</th></tr></thead>
                    <tbody id="business-ads-tbody"></tbody>
                </table>
            </div>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessInfo.js", "scripts/js/components/footerNav.js"]
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
        <div class="container" style="max-width: 800px;">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/community" class="community-back-link" aria-label="커뮤니티로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">새 글 작성</span>
                </div>
            </header>
            <p class="text-muted" style="margin: 12px 0 24px;">미드나잇 맨즈에 새로운 이야기를 공유해보세요</p>

            <div class="card">
                <form id="post-form" enctype="multipart/form-data">
                    <div class="error-banner hidden" id="error-banner">
                        <p id="error-message"></p>
                    </div>
                    
                    <div class="form-group">
                    <label for="board-type" class="form-label">게시판 선택</label>
                    <select id="board-type" name="boardType" class="form-control">
                    <option value="FREE">자유게시판</option>
                    <option value="ANON">익명게시판</option>
                    <option value="REVIEW">후기게시판</option>
                    <option value="STORY">썰게시판</option>
                    <option value="QUESTION">질문게시판</option>
                    </select>
                    </div>

                    <div class="form-group hidden" id="notice-options-group">
                        <label class="form-label">관리자 공지 옵션</label>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <label><input type="checkbox" id="is-notice"> 공지로 등록</label>
                            <div id="notice-target-group" class="hidden" style="padding:10px;border:1px solid #e8e8e8;border-radius:8px;">
                                <small class="text-muted" style="display:block;margin-bottom:6px;">필독/공지 노출 게시판</small>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                    <label><input type="checkbox" name="notice-target-board" value="FREE"> 자유</label>
                                    <label><input type="checkbox" name="notice-target-board" value="ANON"> 익명</label>
                                    <label><input type="checkbox" name="notice-target-board" value="REVIEW"> 후기</label>
                                    <label><input type="checkbox" name="notice-target-board" value="STORY"> 썰</label>
                                    <label><input type="checkbox" name="notice-target-board" value="QUESTION"> 질문</label>
                                </div>
                            </div>
                        </div>
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
                        <small class="text-muted">최소 10자 이상 입력해주세요</small>
                    </div>



                    <div class="form-group">
                        <label for="image-files" class="form-label">이미지 첨부</label>
                        <input type="file" id="image-files" name="files" class="form-control" multiple accept="image/*">
                        <small class="text-muted">최대 5개의 이미지를 업로드할 수 있습니다 (JPG, PNG, GIF)</small>
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
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/createPost.js", "scripts/js/components/footerNav.js"]
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
        <div class="container" style="max-width: 800px;">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/admin" class="community-back-link" aria-label="관리자 페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">공지사항 새 글 작성</span>
                </div>
            </header>
            <p class="text-muted support-create-description" style="margin: 12px 0 24px;">커뮤니티 글쓰기 화면과 동일한 방식으로 공지사항 글을 등록할 수 있습니다.</p>

            <div class="card">
                <form id="support-post-form">
                    <div class="form-group">
                        <label for="support-form-category" class="form-label">구분</label>
                        <select id="support-form-category" class="form-control">
                            <option value="NOTICE">공지사항</option>
                            <option value="FAQ">FAQ</option>
                        </select>
                    </div>

                    <div class="form-group" id="support-pin-options">
                        <label class="form-label">커뮤니티 노출</label>
                        <div style="margin-bottom:8px;">
                            <label for="support-form-board-type" class="form-label">노출 게시판</label>
                            <select id="support-form-board-type" class="form-control" style="max-width:260px;">
                                <option value="FREE">자유게시판</option>
                                <option value="ANON">익명게시판</option>
                                <option value="REVIEW">후기게시판</option>
                                <option value="STORY">썰게시판</option>
                                <option value="QUESTION">질문게시판</option>
                            </select>
                        </div>
                        <label><input type="checkbox" id="support-form-is-pinned"> 커뮤니티 필독 상단 고정으로 표시</label>
                    </div>

                    <div class="form-group">
                        <label for="title" class="form-label">제목</label>
                        <input type="text" id="title" class="form-control" maxlength="255" placeholder="제목을 입력하세요" required>
                    </div>

                    <div class="form-group">
                        <label for="content" class="form-label">내용</label>
                        <textarea id="content" class="form-control" rows="15" placeholder="내용을 입력하세요" required></textarea>
                        <small class="text-muted">최소 10자 이상 입력해주세요</small>
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
                    <a href="/admin" class="community-back-link" aria-label="관리자 페이지로 이동">
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
                <a href="register.html" class="btn btn-primary btn-sm">회원가입</a>
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
            <p>가입하신 이메일 또는 전화번호로 계정을 찾을 수 있습니다.</p>
        </div>

        <div class="card">
            <div class="form-group">
                <label class="form-label" for="find-keyword">이메일 또는 전화번호</label>
                <input class="form-control" id="find-keyword" type="text" placeholder="example@company.com 또는 01012345678">
            </div>
            <button class="btn btn-primary w-full" type="button" onclick="alert('계정 찾기 기능은 준비 중입니다.')">계정 찾기</button>
            <div class="text-center mt-3">
                <a href="login.html">로그인 화면으로 돌아가기</a>
            </div>
        </div>
    </div>
</main>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js"]
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
                    <a href="register.html" class="btn btn-primary btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <section class="top-ads hidden" id="top-ads-container" data-top-ad-placement="HOME" aria-label="홈 상단 광고"></section>

    <main class="main-content">
        <div class="container home-service-wrap">
            <section class="service-category-grid" aria-label="홈 카테고리">
                <a class="service-item" href="live.html">
                    <span class="service-icon">🔴</span>
                    <span class="service-label">LIVE</span>
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
                    <a href="register.html" class="btn btn-primary btn-sm">회원가입</a>
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
                <p>본 정보내용은 청소년 유해매체물로서</p>
                <p>정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 청소년 보호법의 규정에 의하여</p>
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

                <div class="grid grid-3 mt-3">
                    <a href="index.html" class="btn btn-outline btn-sm">비회원 입장</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                    <a href="find-account.html" class="btn btn-outline btn-sm">계정 찾기</a>
                </div>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/validation.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/pages/login.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
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
                        <a class="mypage-link-item" href="/business-info"><span>광고센터 바로가기</span></a>
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
            <span class="footer-divider" aria-hidden="true"></span>
            <button type="button" class="mypage-footer-logout">로그아웃</button>
        </div>
        <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
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
            <a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a>
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
                <input type="password" id="profile-password" name="password" minlength="4" placeholder="변경 시 입력">
              </label>
              <label>비밀번호 확인
                <input type="password" id="profile-password-confirm" name="passwordConfirm" minlength="4" placeholder="비밀번호 재입력">
                <small id="profile-password-match-result" class="help-text" role="status"></small>
              </label>
              <label>이름
                <input type="text" id="profile-name" name="name" readonly>
              </label>
              <label>
                <span class="profile-field-title">닉네임</span>
                <span class="profile-nickname-inline">
                  <input type="text" id="profile-nickname" name="nickname" minlength="2" required>
                  <button type="button" class="btn btn-outline btn-sm hidden" id="nickname-check-btn">중복 확인</button>
                </span>
                <small id="nickname-check-result" class="help-text"></small>
                
              </label>
              <label>생년월일
                <input type="text" id="profile-birth" name="birthDate" readonly>
              </label>
              <label>이메일
                <input type="email" id="profile-email" name="email">
                <span class="profile-consent-inline"><input type="checkbox" id="email-consent" name="emailConsent"><span class="profile-consent-text">이메일 수신 동의</span></span>
              </label>
              <label>연락처
                <input type="text" id="profile-phone" name="phone" placeholder="010-0000-0000">
                <span class="profile-consent-inline"><input type="checkbox" id="sms-consent" name="smsConsent"><span class="profile-consent-text">SMS 수신 동의</span></span>
              </label>
            </div>
            <div class="profile-form-actions">
              <button type="submit" class="btn btn-primary">저장</button>
            </div>
            <p id="profile-save-result" class="help-text" role="status"></p>
          </form>
        </section>
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
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 활동 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-points': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 포인트 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-support': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header><div class="container">
    <section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list">
    <a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a>
    <a class="support-link-item" href="/my-inquiries"><span>내 문의함</span></a>
    <a class="support-link-item" href="/support/faq"><span>FAQ</span></a>
    <a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a>
    </div></section><div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇테라스</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇테라스 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header><div class="container">
    <div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇테라스</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇테라스 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div><section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list"><a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a><a class="support-link-item" href="/support/faq"><span>FAQ</span></a><a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a></div></section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },


  'customer-service': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">1:1 고객센터</span></div></header>
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
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="고객센터 메뉴로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">내 문의함</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card"><div id="my-inquiries-list" class="my-inquiries-board"></div><p id="my-inquiries-empty" class="my-inquiries-empty">아직 접수된 문의가 없습니다.</p></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myInquiries.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myInquiries.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiry-detail': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-inquiries" class="community-back-link" aria-label="내 문의함으로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">문의 상세</span></div></header><div class="container customer-service-page mypage-linked-container">
    <div class="mypage-linked-content"><section id="my-inquiry-detail" class="customer-service-card my-inquiry-detail-card"></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myInquiryDetail.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myInquiryDetail.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'support-board': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container community-container mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">공지사항</span></div></header>
    <div class="mypage-linked-content"><div class="loading" id="support-public-loading"><div class="spinner"></div><p>불러오는 중...</p></div>
    <div class="error-banner hidden" id="support-public-error"><p id="support-public-error-message"></p></div>
    <div id="support-public-list" class="hidden"></div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/supportBoard.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/supportBoard.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'post-detail': postDetailPageConfig,
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
                        <small class="text-muted">8자 이상 입력해주세요</small>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword" class="form-label">비밀번호 확인</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" placeholder="비밀번호를 다시 입력하세요" required>
                        <div class="error-message hidden" id="confirmPassword-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="phone" class="form-label">휴대폰 번호</label>
                        <div class="grid grid-2">
                            <input type="tel" id="phone" name="phone" class="form-control" placeholder="숫자만 입력 (예: 01012345678)" required>
                            <button type="button" class="btn btn-outline" id="send-code-btn">인증번호 발송</button>
                        </div>
                        <div class="error-message hidden" id="phone-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="verificationCode" class="form-label">인증번호</label>
                        <div class="grid grid-2">
                            <input type="text" id="verificationCode" name="verificationCode" class="form-control" placeholder="6자리 인증번호" maxlength="6" required>
                            <button type="button" class="btn btn-outline" id="verify-code-btn">인증 확인</button>
                        </div>
                        <small class="text-muted" id="verification-status">휴대폰 인증이 필요합니다.</small>
                        <div class="error-message hidden" id="verificationCode-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="genderDigit" class="form-label">성별 식별 번호</label>
                        <input type="number" id="genderDigit" name="genderDigit" class="form-control" placeholder="주민번호 뒷자리 첫 숫자" min="0" max="9" required>
                        <small class="text-muted">남성만 가입 가능 (홀수 번호만 통과)</small>
                        <div class="error-message hidden" id="genderDigit-error"></div>
                    </div>

                    <input type="hidden" id="phoneVerified" name="phoneVerified" value="false">

                    <div class="form-group">
                        <label for="nickname" class="form-label">닉네임</label>
                        <div class="grid grid-2">
                            <input type="text" id="nickname" name="nickname" class="form-control" placeholder="사용할 닉네임을 입력하세요" required>
                            <button type="button" class="btn btn-outline" id="check-nickname-btn">중복 확인</button>
                        </div>
                        <small class="text-muted" id="nickname-status">닉네임 중복 확인이 필요합니다.</small>
                        <div class="error-message hidden" id="nickname-error"></div>
                    </div>

                    <input type="hidden" id="nicknameChecked" name="nicknameChecked" value="false">

                    <div class="form-group register-consent-group">
                        <label class="register-consent-item" for="termsConsent">
                            <input type="checkbox" id="termsConsent" name="termsConsent" required>
                            <span>[필수] <a href="/board/terms" target="_blank" rel="noopener noreferrer">약관 및 정책</a>에 동의합니다.</span>
                        </label>
                        <div class="error-message hidden" id="termsConsent-error"></div>
                    </div>

                    <button type="submit" class="btn btn-primary w-full" id="submit-btn">회원가입</button>
                </form>

                <div class="text-center mt-3">
                    <p>이미 계정이 있으신가요? <a href="login.html">로그인</a></p>
                </div>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/validation.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/pages/register.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/register.js", "scripts/js/components/footerNav.js"]
  },
  'terms-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">약관 및 정책</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card terms-policy-card"><h2>서비스 이용약관</h2><p>본 서비스는 커뮤니티 플랫폼 제공을 목적으로 하며, 회원은 관련 법령 및 본 약관을 준수해야 합니다. 회사는 서비스 운영, 점검, 기능 변경이 필요한 경우 사전 공지 후 서비스를 변경할 수 있습니다.</p><ul><li>회원 계정 정보는 정확하게 입력해야 하며 타인 계정 도용은 금지됩니다.</li><li>불법 게시물, 타인 권리 침해, 서비스 운영 방해 행위는 제재 대상입니다.</li><li>서비스 장애, 외부 링크, 제3자 제공 정보에 대한 책임 범위는 약관에 따릅니다.</li></ul><h2>개인정보처리방침</h2><p>회사는 회원가입, 본인확인, 서비스 제공 및 고객응대를 위해 필요한 최소한의 개인정보를 수집·이용합니다.</p><ul><li>수집 항목: 아이디, 비밀번호, 휴대폰 번호, 닉네임 등</li><li>이용 목적: 회원 식별, 부정 이용 방지, 문의 대응, 서비스 개선</li><li>보유 기간: 관련 법령 또는 이용 목적 달성 시까지</li></ul><p>개인정보 열람·정정·삭제 요청은 고객센터를 통해 접수할 수 있습니다.</p><h2>커뮤니티 운영정책</h2><p>건전한 커뮤니티 운영을 위해 아래 정책을 적용합니다.</p><ul><li>금지 콘텐츠: 불법 정보, 혐오·비방, 음란물, 저작권 침해 게시물</li><li>제재 절차: 경고 → 일시 이용제한 → 영구 이용제한</li><li>신고 처리: 접수 후 내부 기준에 따라 검토 및 조치</li></ul><p class="terms-policy-updated">시행일: 2026-03-17</p></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
};

export { pageRegistry };
