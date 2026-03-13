/**
 * 파일 역할: 페이지 키와 실제 페이지 렌더링 모듈을 매핑하는 레지스트리 파일.
 */
const pageRegistry = {
  'admin': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname">관리자</span>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div class="page-header">
                <h1>관리자 페이지</h1>
                <p>게시글과 댓글을 관리할 수 있습니다</p>
            </div>

            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="posts">게시글 관리</button>
                <button class="admin-tab" data-tab="comments">댓글 관리</button>
            </div>

            <div class="tab-content">
                <div id="posts-section" class="tab-pane active">
                    <div class="section-header">
                        <h2>게시글 관리</h2>
                        <div class="admin-stats">
                            총 <span id="posts-total">0</span>개
                        </div>
                    </div>

                    <div class="loading" id="posts-loading">
                        <div class="spinner"></div>
                        <p>게시글을 불러오는 중...</p>
                    </div>

                    <div class="error-banner hidden" id="posts-error">
                        <p id="posts-error-message"></p>
                        <button class="btn btn-sm btn-primary" id="posts-retry-btn">다시 시도</button>
                    </div>

                    <div class="admin-table-container hidden" id="posts-content">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>제목</th>
                                    <th>작성자</th>
                                    <th>작성일</th>
                                    <th>좋아요</th>
                                    <th>댓글</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody id="posts-tbody">
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="comments-section" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>댓글 관리</h2>
                        <div class="admin-stats">
                            총 <span id="comments-total">0</span>개
                        </div>
                    </div>

                    <div class="loading" id="comments-loading">
                        <div class="spinner"></div>
                        <p>댓글을 불러오는 중...</p>
                    </div>

                    <div class="error-banner hidden" id="comments-error">
                        <p id="comments-error-message"></p>
                        <button class="btn btn-sm btn-primary" id="comments-retry-btn">다시 시도</button>
                    </div>

                    <div class="admin-table-container hidden" id="comments-content">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>내용</th>
                                    <th>게시글</th>
                                    <th>작성자</th>
                                    <th>작성일</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody id="comments-tbody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="modal hidden" id="delete-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="delete-modal-title">삭제 확인</h3>
            </div>
            <div class="modal-body">
                <p id="delete-modal-message">정말로 삭제하시겠습니까?</p>
                <p class="text-muted text-sm">삭제된 내용은 복구할 수 없습니다.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="delete-cancel-btn">취소</button>
                <button class="btn btn-danger" id="delete-confirm-btn">삭제</button>
            </div>
        </div>
    </div>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/admin.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/admin.js", "scripts/js/components/footerNav.js"]
  },
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
            <div class="page-header">
                <h1>내 북마크</h1>
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
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div class="page-header">
                <h1>업체정보</h1>
                <p>업체정보 페이지 준비 중입니다.</p>
            </div>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/components/footerNav.js"]
  },
  'community': {
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
        <div class="container community-container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <button type="button" class="board-menu-toggle" id="board-menu-toggle" aria-label="카테고리 열기" aria-expanded="false" aria-controls="board-tabs-panel">
                        <span aria-hidden="true">☰</span>
                    </button>
                    <nav class="board-tabs hidden" id="board-tabs-panel" aria-label="게시판 카테고리">
                        <button type="button" class="board-tab active" data-board-type="ALL">전체</button>
                        <button type="button" class="board-tab" data-board-type="FREE">자유게시판</button>
                        <button type="button" class="board-tab" data-board-type="ANON">익명게시판</button>
                        <button type="button" class="board-tab" data-board-type="REVIEW">후기게시판</button>
                        <button type="button" class="board-tab" data-board-type="STORY">썰게시판</button>
                        <button type="button" class="board-tab" data-board-type="QUESTION">질문게시판</button>
                    </nav>
                    <span class="community-board-name">커뮤니티 게시글</span>
                </div>
                <div class="community-actions hidden" id="community-actions">
                    <a href="create-post.html" class="btn btn-primary btn-sm">글쓰기</a>
                </div>
            </header>

            <div class="loading" id="loading">게시글을 불러오는 중...</div>

            <div class="error-banner hidden" id="error-banner">
                <span id="error-message"></span>
                <button id="retry-btn" class="btn btn-sm btn-outline">재시도</button>
            </div>

<ul class="article-list" id="post-list"></ul>

            <div class="empty-state hidden" id="empty-state">
                등록된 게시글이 없습니다.
            </div>

            <div class="board-pagination hidden" id="pagination"></div>

            <div class="board-search-wrap">
                <form method="get" action="#" name="search_frm" id="search_frm" class="board-search-form">
                    <select name="search" id="search-type">
                        <option value="bbs_title">제목</option>
                        <option value="bbs_review">내용</option>
                        <option value="bbs_title_review">제목+내용</option>
                    </select>
                    <input type="text" name="keyword" id="search-keyword" placeholder="검색어를 입력하세요">
                    <button type="submit" id="search-btn" class="board-search-btn">검색</button>
                    <button type="button" id="search-reset-btn" class="board-search-reset">초기화</button>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/utils/notifications.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/api/postAPI.js"></script>
    <script src="scripts/js/components/postCard.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/pages/index.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/community-board.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/utils/notifications.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/api/postAPI.js", "scripts/js/components/postCard.js", "scripts/js/components/header.js", "scripts/js/pages/index.js", "scripts/js/components/footerNav.js"]
  },
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
            <div class="page-header">
                <h1>새 글 작성</h1>
                <p>미드나잇 맨즈에 새로운 이야기를 공유해보세요</p>
            </div>

            <div class="card">
                <form id="post-form" enctype="multipart/form-data">
                    <div class="error-banner hidden" id="error-banner">
                        <p id="error-message"></p>
                    </div>

                    <div class="form-group">
                        <label for="title" class="form-label">제목</label>
                        <input type="text" id="title" name="title" class="form-control" placeholder="제목을 입력하세요" maxlength="255" required>
                        <div class="error-message hidden" id="title-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="board-type" class="form-label">게시판</label>
                        <select id="board-type" name="boardType" class="form-control">
                            <option value="FREE">자유게시판</option>
                            <option value="ANON">익명게시판</option>
                            <option value="REVIEW">후기게시판</option>
                            <option value="STORY">썰게시판</option>
                            <option value="QUESTION">질문게시판</option>
                        </select>
                    </div>

                    

                    <div class="form-group">
                        <label for="content" class="form-label">내용</label>
                        <textarea id="content" name="content" class="form-control" placeholder="내용을 입력하세요" rows="15" required></textarea>
                        <div class="error-message hidden" id="content-error"></div>
                        <small class="text-muted">최소 10자 이상 입력해주세요</small>
                    </div>


                    <div class="form-group hidden" id="guest-password-group">
                        <label for="guest-password" class="form-label">비회원 비밀번호</label>
                        <input type="password" id="guest-password" name="guestPassword" class="form-control" placeholder="수정/삭제에 사용할 비밀번호" minlength="4" maxlength="50">
                        <small class="text-muted">비회원 작성글의 수정/삭제 시 필요합니다.</small>
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
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/createPost.js", "scripts/js/components/footerNav.js"]
  },
  'edit-post': {
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
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>게시글을 불러오는 중...</p>
            </div>

            <div class="error-banner hidden" id="error-banner">
                <p id="error-message"></p>
                <a href="index.html" class="btn btn-sm btn-primary">목록으로</a>
            </div>

            <div class="page-header hidden" id="page-header">
                <h1>글 수정</h1>
                <p>내용을 수정하고 업데이트하세요</p>
            </div>

            <div class="post-form-container hidden" id="post-form-container">
                <div class="card">
                    <form id="post-form">
                        <div class="error-banner hidden" id="form-error-banner">
                            <p id="form-error-message"></p>
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

                        <div class="form-actions" style="justify-content: space-between;">
                            <button type="button" class="btn btn-secondary" id="cancel-btn">취소</button>
                            <button type="submit" class="btn btn-primary" id="submit-btn">수정하기</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/editPost.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/editPost.js", "scripts/js/components/footerNav.js"]
  },
  'find-account': {
    template: `<header class="header">
    <div class="header-container">
        <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
        <nav class="nav">
            <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
            <a href="register.html" class="btn btn-primary btn-sm">회원가입</a>
        </nav>
    </div>
</header>

<main class="main-content">
    <div class="container auth-container auth-login">
        <div class="page-header">
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
    scripts: ["scripts/js/components/footerNav.js"]
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
    <script src="scripts/js/pages/home.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/community-board.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/pages/home.js", "scripts/js/components/footerNav.js"]
  },
  'live': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div class="page-header">
                <h1>LIVE</h1>
                <p>LIVE 서비스 준비 중입니다.</p>
            </div>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/components/footerNav.js"]
  },
  'login': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav">
                <a href="register.html" class="btn btn-primary btn-sm">회원가입</a>
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
            <div class="page-header">
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
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/pages/login.js", "scripts/js/components/footerNav.js"]
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
            <div class="page-header">
                <h1>마이페이지</h1>
                <p>내 활동과 쪽지를 관리할 수 있습니다</p>
            </div>

            <div class="my-page-tabs">
                <button class="tab-btn active" data-tab="posts">내 게시글</button>
                <button class="tab-btn" data-tab="comments">내 댓글</button>
                <button class="tab-btn" data-tab="messages">쪽지함</button>
                <button class="tab-btn" data-tab="stats">통계</button>
            </div>

            <div class="tab-content">
                <div id="posts-tab" class="tab-pane active">
                    <div class="section-header">
                        <h2>내 게시글</h2>
                    </div>
                    <div id="my-posts-list">
                        <div class="loading">로딩 중...</div>
                    </div>
                </div>

                <div id="comments-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>내 댓글</h2>
                    </div>
                    <div id="my-comments-list">
                        <div class="loading">로딩 중...</div>
                    </div>
                </div>

                <div id="messages-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>쪽지함</h2>
                    </div>

                    <div class="message-tabs">
                        <button class="message-tab-btn active" data-message-tab="received">받은 쪽지</button>
                        <button class="message-tab-btn" data-message-tab="sent">보낸 쪽지</button>
                    </div>

                    <div id="received-messages" class="message-list">
                        <div class="loading">로딩 중...</div>
                    </div>

                    <div id="sent-messages" class="message-list hidden">
                        <div class="loading">로딩 중...</div>
                    </div>
                </div>

                <div id="stats-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>내 활동 통계</h2>
                    </div>
                    <div id="my-stats">
                        <div class="loading">로딩 중...</div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/myPage.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/footerNav.js"]
  },
  'post-detail': {
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

    <main class="main-content">
        <div class="container post-detail-page">
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>게시글을 불러오는 중...</p>
            </div>

            <div class="error-banner hidden" id="error-banner">
                <p id="error-message"></p>
                <button class="btn btn-sm btn-primary" id="retry-btn">다시 시도</button>
            </div>

            <div class="bbs-view max-contents post-detail hidden" id="post-detail">
                <header class="post-detail-header">
                    <div class="post-header-left">
                        <button type="button" class="icon-btn icon-btn-square" id="back-btn" aria-label="뒤로가기">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m15 18-6-6 6-6"></path>
                            </svg>
                        </button>
                        <span class="post-board-name" id="post-board-name">게시판</span>
                    </div>
                    <div class="post-header-right">
                        <button type="button" class="icon-btn icon-btn-square" id="share-btn" aria-label="공유하기">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                <polyline points="16 6 12 2 8 6"></polyline>
                                <line x1="12" x2="12" y1="2" y2="15"></line>
                            </svg>
                        </button>
                        <div class="post-more-wrapper">
                            <button type="button" class="icon-btn" id="post-more-btn" aria-label="더보기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="12" cy="19" r="1.4"></circle></svg></button>
                            <div class="post-more-menu hidden" id="post-more-menu">
                                <button type="button" class="menu-item" id="report-btn">신고하기</button>
                                <button type="button" class="menu-item hidden" id="edit-btn">수정</button>
                                <button type="button" class="menu-item danger hidden" id="delete-btn">삭제</button>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="top">
                    <div class="tit">
                        <h1 id="post-title"></h1>
                    </div>

                    <div class="grid">
                        <div class="picture">
                            <span class="author-avatar" aria-hidden="true"></span>
                        </div>
                        <div class="user">
                            <span class="lv hidden" id="post-author-level" data-text="Lv."></span>
                            <span id="post-author" class="s-fs-body"></span>
                        </div>
                        <div class="caption">
                            <span id="post-date"></span>
                            <span id="view-count">조회수 0</span>
                        </div>
                    </div>
                </div>

                <div class="body">
                    <div class="content" id="post-content"></div>
                    <div id="post-images" class="media hidden">
                        <div id="images-grid"></div>
                    </div>
                </div>

                <div class="post-actions">
                    <button class="like-btn" id="like-btn">
                        <span id="like-icon">🤍</span>
                        <span id="like-count">0</span>
                    </button>
                </div>
            </div>

            <div id="comments-section" class="reply hidden">
                <div class="tit">
                    <span class="mr-2">댓글</span>
                    <strong id="comment-count">0</strong>
                </div>

                <div class="comments-list" id="comments-list"></div>

                <div class="new" id="comment-form">
                    <form id="comment-create-form">
                        <div class="form-group">
                            <textarea id="comment-content" name="content" class="form-control" placeholder="댓글을 입력하세요" rows="3" required></textarea>
                            <label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:14px;color:#555;">
                                <input type="checkbox" id="comment-secret" name="isSecret">
                                비밀댓글
                            </label>
                            <div class="error-message hidden" id="content-error"></div>
                            <input type="password" id="comment-guest-password" class="form-control" placeholder="비회원 댓글 비밀번호 (수정/삭제용)" style="margin-top:8px;display:none;">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-sm" id="comment-submit-btn">등록</button>
                        </div>
                    </form>
                </div>

                <div class="comment-pagination hidden" id="comment-pagination">
                    <button class="btn btn-outline btn-sm" id="load-more-comments">더 보기</button>
                </div>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/api/postAPI.js"></script>
    <script src="scripts/js/api/commentAPI.js"></script>
    <script src="scripts/js/pages/postDetail.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/postDetail.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/api/postAPI.js", "scripts/js/api/commentAPI.js", "scripts/js/pages/postDetail.js", "scripts/js/components/footerNav.js"]
  },
  'register': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav">
                <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container auth-container">
            <div class="page-header">
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
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/pages/register.js", "scripts/js/components/footerNav.js"]
  },
};

export { pageRegistry };
