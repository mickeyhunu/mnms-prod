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
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">업체정보</span>
                </div>
            </header>

            <div class="page-header">
                <p>업체정보 페이지 준비 중입니다.</p>
            </div>
        </div>
    </main>

    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
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

            <section class="best-posts-section" aria-label="베스트 게시글">
                <div class="best-posts-block">
                    <h2 class="best-posts-title">🔥 오늘의 베스트</h2>
                    <ul class="best-posts-list" id="daily-best-list"></ul>
                    <p class="best-posts-empty hidden" id="daily-best-empty">조건을 충족한 게시글이 없습니다.</p>
                </div>
                <div class="best-posts-block">
                    <h2 class="best-posts-title">📅 주간 베스트</h2>
                    <ul class="best-posts-list" id="weekly-best-list"></ul>
                    <p class="best-posts-empty hidden" id="weekly-best-empty">조건을 충족한 게시글이 없습니다.</p>
                </div>
            </section>

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
                    <label for="board-type" class="form-label">게시판 선택</label>
                    <select id="board-type" name="boardType" class="form-control">
                    <option value="FREE">자유게시판</option>
                    <option value="ANON">익명게시판</option>
                    <option value="REVIEW">후기게시판</option>
                    <option value="STORY">썰게시판</option>
                    <option value="QUESTION">질문게시판</option>
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
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">LIVE</span>
                </div>
            </header>

            <div class="page-header">
                <p>LIVE 서비스 준비 중입니다.</p>
            </div>
        </div>
    </main>

    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
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
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">마이페이지</span>
                </div>
            </header>

            <div class="page-header">
                <p>활동 정보, 내 정보 수정, 공지/고객지원, 정책 안내를 확인할 수 있습니다</p>
            </div>

            <div class="my-page-tabs">
                <button class="tab-btn active" data-tab="activity">활동 정보</button>
                <button class="tab-btn" data-tab="profile">내 정보</button>
                <button class="tab-btn" data-tab="notices">공지사항</button>
                <button class="tab-btn" data-tab="support">고객센터</button>
                <button class="tab-btn" data-tab="policy">약관 및 정책</button>
            </div>

            <div class="tab-content">
                <div id="activity-tab" class="tab-pane active">
                    <div class="section-header">
                        <h2>활동 정보</h2>
                    </div>

                    <div id="my-stats" class="activity-summary-grid">
                        <div class="loading">로딩 중...</div>
                    </div>

                    <div class="activity-group">
                        <div class="section-header">
                            <h3>내 게시글</h3>
                        </div>
                        <div id="my-posts-list">
                            <div class="loading">로딩 중...</div>
                        </div>
                    </div>

                    <div class="activity-group">
                        <div class="section-header">
                            <h3>내 댓글</h3>
                        </div>
                        <div id="my-comments-list">
                            <div class="loading">로딩 중...</div>
                        </div>
                    </div>
                </div>

                <div id="profile-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>내 정보</h2>
                    </div>

                    <div class="mypage-card fixed-info-card">
                        <h3>기본정보 (고정)</h3>
                        <div class="fixed-info-grid">
                            <div><span>이름</span><strong id="fixed-name">-</strong></div>
                            <div><span>생년월일</span><strong id="fixed-birth">-</strong></div>
                        </div>
                    </div>

                    <form id="profile-form" class="mypage-card profile-form">
                        <h3>수정 가능한 정보</h3>
                        <div class="profile-form-grid">
                            <label>비밀번호
                                <input type="password" name="password" placeholder="새 비밀번호 입력" autocomplete="new-password" />
                            </label>
                            <label>닉네임
                                <input type="text" name="nickname" id="profile-nickname" maxlength="20" />
                            </label>
                            <label>연락처
                                <input type="tel" name="phone" id="profile-phone" placeholder="010-0000-0000" />
                            </label>
                            <label>이메일
                                <input type="email" name="email" id="profile-email" />
                            </label>
                        </div>

                        <div class="consent-wrap">
                            <label><input type="checkbox" name="emailConsent" id="email-consent" /> 이메일 수신 동의</label>
                            <label><input type="checkbox" name="smsConsent" id="sms-consent" /> SMS 수신 동의</label>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">내 정보 저장</button>
                        </div>
                        <p class="help-text">* 기본정보(이름/생년월일)는 변경할 수 없습니다.</p>
                        <p id="profile-save-result" class="help-text"></p>
                    </form>
                </div>

                <div id="notices-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>공지사항</h2>
                    </div>
                    <div id="notice-list" class="notice-list">
                        <div class="loading">로딩 중...</div>
                    </div>
                </div>

                <div id="support-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>고객센터</h2>
                    </div>
                    <div class="mypage-card">
                        <h3>1:1 문의</h3>
                        <form id="support-form" class="support-form">
                            <label>문의 유형
                                <select name="inquiryType" id="inquiry-type">
                                    <option value="광고/제휴">광고/제휴</option>
                                    <option value="회원정보/계정">회원정보/계정</option>
                                    <option value="서비스 오류">서비스 오류</option>
                                    <option value="기타">기타</option>
                                </select>
                            </label>
                            <label>문의 내용
                                <textarea name="inquiryContent" id="inquiry-content" rows="6" placeholder="문의 내용을 입력해 주세요."></textarea>
                            </label>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">문의 등록</button>
                            </div>
                            <p id="support-result" class="help-text"></p>
                        </form>
                    </div>
                </div>

                <div id="policy-tab" class="tab-pane hidden">
                    <div class="section-header">
                        <h2>약관 및 정책</h2>
                    </div>
                    <div class="policy-grid">
                        <a href="#" class="mypage-card policy-card">
                            <h3>이용약관</h3>
                            <p>서비스 이용 시 필요한 기본 약관을 확인하세요.</p>
                        </a>
                        <a href="#" class="mypage-card policy-card">
                            <h3>개인정보 처리방침</h3>
                            <p>개인정보 수집 및 이용, 보관 정책을 확인하세요.</p>
                        </a>
                        <a href="#" class="mypage-card policy-card">
                            <h3>커뮤니티 운영정책</h3>
                            <p>건강한 커뮤니티 운영을 위한 기준을 확인하세요.</p>
                        </a>
                    </div>
                </div>
            </div>

            <section class="company-footer-slot">
                <div class="company-footer-top">
                    <div class="company-footer-logo">Midnight Terrace</div>
                    <div class="company-footer-socials">
                        <button type="button" class="company-social-btn" aria-label="카카오톡 채널">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M9.99935 2.5C14.7718 2.5 18.64 5.51489 18.64 9.23495C18.64 12.9542 14.7718 15.9691 10.0002 15.9691C9.52508 15.9682 9.05049 15.938 8.57913 15.8786L4.95205 18.2508C4.53981 18.4689 4.39416 18.445 4.56367 17.911L5.29764 14.8846C2.92786 13.6832 1.36035 11.6014 1.36035 9.23495C1.36035 5.51571 5.2277 2.5 10.0002 2.5M14.8615 9.13209L16.0711 7.96037C16.1409 7.88788 16.1798 7.79114 16.1797 7.69051C16.1796 7.58989 16.1404 7.49324 16.0704 7.42092C16.0005 7.3486 15.9052 7.30627 15.8046 7.30283C15.704 7.29939 15.606 7.33511 15.5313 7.40248L13.9449 8.9379V7.66908C13.9449 7.56608 13.9039 7.46729 13.8311 7.39445C13.7583 7.32162 13.6595 7.2807 13.5565 7.2807C13.4535 7.2807 13.3547 7.32162 13.2819 7.39445C13.209 7.46729 13.1681 7.56608 13.1681 7.66908V9.77308C13.1544 9.8332 13.1544 9.89563 13.1681 9.95575V11.1398C13.1681 11.2428 13.209 11.3416 13.2819 11.4144C13.3547 11.4873 13.4535 11.5282 13.5565 11.5282C13.6595 11.5282 13.7583 11.4873 13.8311 11.4144C13.9039 11.3416 13.9449 11.2428 13.9449 11.1398V10.0183L14.2962 9.67846L15.4712 11.3513C15.5006 11.3931 15.5378 11.4286 15.5809 11.456C15.624 11.4833 15.6721 11.502 15.7224 11.5107C15.7726 11.5195 15.8241 11.5183 15.874 11.5072C15.9238 11.4961 15.9709 11.4753 16.0127 11.4459C16.0544 11.4166 16.09 11.3793 16.1174 11.3362C16.1447 11.2931 16.1633 11.2451 16.1721 11.1948C16.1809 11.1445 16.1797 11.093 16.1686 11.0432C16.1575 10.9934 16.1366 10.9463 16.1073 10.9045L14.8615 9.13209ZM12.4275 10.7152H11.2262V7.68142C11.2216 7.58162 11.1787 7.48742 11.1065 7.41842C11.0342 7.34942 10.9381 7.31091 10.8382 7.31091C10.7383 7.31091 10.6423 7.34942 10.57 7.41842C10.4977 7.48742 10.4549 7.58162 10.4503 7.68142V11.1036C10.4503 11.3176 10.6231 11.492 10.8378 11.492H12.4275C12.5306 11.492 12.6293 11.4511 12.7022 11.3782C12.775 11.3054 12.8159 11.2066 12.8159 11.1036C12.8159 11.0006 12.775 10.9018 12.7022 10.829C12.6293 10.7562 12.5306 10.7152 12.4275 10.7152ZM7.60818 9.81752L8.18087 8.41211L8.70584 9.81669L7.60818 9.81752ZM9.6842 10.2182L9.68585 10.2051C9.68557 10.1072 9.64823 10.0132 9.58135 9.94176L8.72066 7.63781C8.68458 7.52802 8.61585 7.43185 8.52366 7.36216C8.43147 7.29246 8.32021 7.25256 8.20473 7.24779C8.08852 7.24773 7.97501 7.28283 7.87912 7.34848C7.78322 7.41412 7.70942 7.50724 7.66742 7.6156L6.29986 10.9687C6.26091 11.064 6.26143 11.171 6.30132 11.266C6.34121 11.3609 6.4172 11.4362 6.51256 11.4751C6.60793 11.5141 6.71487 11.5136 6.80985 11.4737C6.90483 11.4338 6.98007 11.3578 7.01902 11.2624L7.29221 10.5935H8.99548L9.24069 11.2517C9.25742 11.3009 9.28385 11.3463 9.31842 11.3851C9.35299 11.4239 9.395 11.4554 9.44196 11.4776C9.48891 11.4999 9.53986 11.5125 9.59178 11.5147C9.6437 11.517 9.69554 11.5088 9.74423 11.4906C9.79292 11.4724 9.83747 11.4446 9.87523 11.4089C9.91299 11.3732 9.9432 11.3303 9.96408 11.2827C9.98495 11.2351 9.99606 11.1838 9.99675 11.1319C9.99744 11.0799 9.98769 11.0283 9.96808 10.9802L9.6842 10.2182ZM6.9499 7.68554C6.95012 7.63454 6.94025 7.58401 6.92086 7.53684C6.90147 7.48968 6.87295 7.44682 6.83693 7.41072C6.8009 7.37462 6.7581 7.346 6.71098 7.32652C6.66385 7.30703 6.61334 7.29705 6.56235 7.29716H3.89223C3.78923 7.29716 3.69044 7.33808 3.6176 7.41091C3.54477 7.48375 3.50385 7.58253 3.50385 7.68554C3.50385 7.78854 3.54477 7.88733 3.6176 7.96016C3.69044 8.033 3.78923 8.07392 3.89223 8.07392H4.84672V11.148C4.84672 11.2511 4.88764 11.3498 4.96048 11.4227C5.03331 11.4955 5.1321 11.5364 5.23511 11.5364C5.33811 11.5364 5.4369 11.4955 5.50973 11.4227C5.58257 11.3498 5.62349 11.2511 5.62349 11.148V8.07392H6.56152C6.61259 8.07414 6.66319 8.06424 6.71041 8.0448C6.75763 8.02536 6.80053 7.99676 6.83664 7.96065C6.87274 7.92454 6.90134 7.88164 6.92078 7.83442C6.94022 7.7872 6.95012 7.7366 6.9499 7.68554Z" fill="white"></path>
                            </svg>
                        </button>
                        <button type="button" class="company-social-btn" aria-label="인스타그램">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M6.85 2.5H13.15C15.55 2.5 17.5 4.45 17.5 6.85V13.15C17.5 14.3037 17.0417 15.4101 16.2259 16.2259C15.4101 17.0417 14.3037 17.5 13.15 17.5H6.85C4.45 17.5 2.5 15.55 2.5 13.15V6.85C2.5 5.69631 2.9583 4.58987 3.77409 3.77409C4.58987 2.9583 5.69631 2.5 6.85 2.5ZM6.7 4C5.98392 4 5.29716 4.28446 4.79081 4.79081C4.28446 5.29716 4 5.98392 4 6.7V13.3C4 14.7925 5.2075 16 6.7 16H13.3C14.0161 16 14.7028 15.7155 15.2092 15.2092C15.7155 14.7028 16 14.0161 16 13.3V6.7C16 5.2075 14.7925 4 13.3 4H6.7ZM13.9375 5.125C14.1861 5.125 14.4246 5.22377 14.6004 5.39959C14.7762 5.5754 14.875 5.81386 14.875 6.0625C14.875 6.31114 14.7762 6.5496 14.6004 6.72541C14.4246 6.90123 14.1861 7 13.9375 7C13.6889 7 13.4504 6.90123 13.2746 6.72541C13.0988 6.5496 13 6.31114 13 6.0625C13 5.81386 13.0988 5.5754 13.2746 5.39959C13.4504 5.22377 13.6889 5.125 13.9375 5.125ZM10 6.25C10.9946 6.25 11.9484 6.64509 12.6517 7.34835C13.3549 8.05161 13.75 9.00544 13.75 10C13.75 10.9946 13.3549 11.9484 12.6517 12.6517C11.9484 13.3549 10.9946 13.75 10 13.75C9.00544 13.75 8.05161 13.3549 7.34835 12.6517C6.64509 11.9484 6.25 10.9946 6.25 10C6.25 9.00544 6.64509 8.05161 7.34835 7.34835C8.05161 6.64509 9.00544 6.25 10 6.25ZM10 7.75C9.40326 7.75 8.83097 7.98705 8.40901 8.40901C7.98705 8.83097 7.75 9.40326 7.75 10C7.75 10.5967 7.98705 11.169 8.40901 11.591C8.83097 12.0129 9.40326 12.25 10 12.25C10.5967 12.25 11.169 12.0129 11.591 11.591C12.0129 11.169 12.25 10.5967 12.25 10C12.25 9.40326 12.0129 8.83097 11.591 8.40901C11.169 7.98705 10.5967 7.75 10 7.75Z" fill="white"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="company-footer-links-row">
                    <a target="_blank" rel="noopener noreferrer" href="https://o3z16.channel.io/workflows/739947">1:1 고객센터</a>
                    <span class="footer-divider" aria-hidden="true"></span>
                    <a target="_blank" rel="noopener noreferrer" href="https://o3z16.channel.io/workflows/739947">광고/제휴 문의</a>
                    <span class="footer-divider" aria-hidden="true"></span>
                    <button type="button" class="mypage-footer-logout">로그아웃</button>
                </div>

                <div class="company-business-link-wrap">
                    <a target="_blank" rel="noopener noreferrer" href="/business-info" class="company-business-link">
                        (주)블랙스케일 사업자정보
                        <span aria-hidden="true">›</span>
                    </a>
                </div>

                <p class="company-footer-notice">미드나잇테라스는 통신판매 중개자이며, 통신 판매의 당사자가 아닙니다. 상품, 상품정보, 거래에 관한 의무와 책임은 판매자에게 있습니다.</p>
                <p class="company-footer-copyright">Copyright 2025. Black Scale Co., Ltd. All right reserved.</p>
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
