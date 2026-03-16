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
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">관리자 페이지</span>
                </div>
            </header>

            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="posts">게시글 관리</button>
                <button class="admin-tab" data-tab="comments">댓글 관리</button>
                <button class="admin-tab" data-tab="users">회원 관리</button>
                <button class="admin-tab" data-tab="ads">광고 관리</button>
                <button class="admin-tab" data-tab="support">공지/FAQ 관리</button>
            </div>

            <div class="tab-content">
                <div id="posts-section" class="tab-pane active">
                    <div class="loading" id="posts-loading"><div class="spinner"></div><p>게시글을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="posts-error"><p id="posts-error-message"></p><button class="btn btn-sm btn-primary" id="posts-retry-btn">다시 시도</button></div>
                    <div class="admin-table-container hidden" id="posts-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>제목</th><th>작성자</th><th>작성일</th><th>좋아요</th><th>댓글</th><th>관리</th></tr></thead><tbody id="posts-tbody"></tbody></table>
                    </div>
                </div>

                <div id="comments-section" class="tab-pane hidden">
                    <div class="loading" id="comments-loading"><div class="spinner"></div><p>댓글을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="comments-error"><p id="comments-error-message"></p><button class="btn btn-sm btn-primary" id="comments-retry-btn">다시 시도</button></div>
                    <div class="admin-table-container hidden" id="comments-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>내용</th><th>게시글</th><th>작성자</th><th>작성일</th><th>관리</th></tr></thead><tbody id="comments-tbody"></tbody></table>
                    </div>
                </div>

                <div id="users-section" class="tab-pane hidden">
                    <div class="loading" id="users-loading"><div class="spinner"></div><p>회원 정보를 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="users-error"><p id="users-error-message"></p><button class="btn btn-sm btn-primary" id="users-retry-btn">다시 시도</button></div>
                    <div class="admin-table-container hidden" id="users-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>이메일</th><th>닉네임</th><th>포인트</th><th>가입일</th><th>권한</th><th>비고</th><th>관리</th></tr></thead><tbody id="users-tbody"></tbody></table>
                    </div>
                </div>

                <div id="ads-section" class="tab-pane hidden">
                    <div class="admin-support-toolbar admin-support-toolbar-right"><button class="btn btn-primary btn-sm" id="ads-new-btn">광고 등록</button></div>
                    <div class="loading" id="ads-loading"><div class="spinner"></div><p>광고를 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="ads-error"><p id="ads-error-message"></p><button class="btn btn-sm btn-primary" id="ads-retry-btn">다시 시도</button></div>
                    <div class="admin-table-container hidden" id="ads-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>제목</th><th>링크</th><th>순서</th><th>노출</th><th>생성일</th><th>수정일</th><th>관리</th></tr></thead><tbody id="ads-tbody"></tbody></table>
                    </div>
                </div>

                <div id="support-section" class="tab-pane hidden">
                    <div class="admin-support-toolbar"><select id="support-category" class="form-control"><option value="NOTICE">공지사항</option><option value="FAQ">FAQ</option></select><button class="btn btn-primary btn-sm" id="support-new-btn">새 글 작성</button></div>
                    <div class="loading" id="support-loading"><div class="spinner"></div><p>글을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="support-error"><p id="support-error-message"></p><button class="btn btn-sm btn-primary" id="support-retry-btn">다시 시도</button></div>
                    <div class="admin-table-container hidden" id="support-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>구분</th><th>제목</th><th>작성일</th><th>관리</th></tr></thead><tbody id="support-tbody"></tbody></table>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="modal hidden" id="support-modal">
        <div class="modal-content">
            <div class="modal-header"><h3 id="support-modal-title">공지/FAQ 작성</h3></div>
            <div class="modal-body">
                <div class="form-group"><label class="form-label" for="support-form-category">구분</label><select id="support-form-category" class="form-control"><option value="NOTICE">공지사항</option><option value="FAQ">FAQ</option></select></div>
                <div class="form-group"><label class="form-label" for="support-form-title">제목</label><input id="support-form-title" class="form-control" maxlength="255"></div>
                <div class="form-group"><label class="form-label" for="support-form-content">내용</label><textarea id="support-form-content" class="form-control" rows="8"></textarea></div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" id="support-cancel-btn">취소</button><button class="btn btn-primary" id="support-save-btn">저장</button></div>
        </div>
    </div>

    <div class="modal hidden" id="delete-modal">
        <div class="modal-content">
            <div class="modal-header"><h3 id="delete-modal-title">삭제 확인</h3></div>
            <div class="modal-body"><p id="delete-modal-message">정말로 삭제하시겠습니까?</p><p class="text-muted text-sm">삭제된 내용은 복구할 수 없습니다.</p></div>
            <div class="modal-footer"><button class="btn btn-secondary" id="delete-cancel-btn">취소</button><button class="btn btn-danger" id="delete-confirm-btn">삭제</button></div>
        </div>
    </div>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/admin.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/pages.css"],
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
                    
                    <div class="form-group hidden" id="admin-post-options">
                        <label class="form-label">관리자 게시글 옵션</label>
                        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
                            <label><input type="checkbox" id="is-notice"> 공지/필독으로 등록</label>
                            <label><input type="checkbox" id="is-pinned"> 게시판 상단 고정</label>
                        </div>
                        <div class="mt-2 hidden" id="notice-type-wrap">
                            <label for="notice-type" class="form-label">공지 유형</label>
                            <select id="notice-type" class="form-control" style="max-width:200px;">
                                <option value="NOTICE">공지</option>
                                <option value="IMPORTANT">필독</option>
                            </select>
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
                        <a class="mypage-link-item" href="/support?tab=faq"><span>FAQ</span></a>
                    </div>
                </section>

                <div class="mypage-link-section">
                    <p class="mypage-link-section-title">ABOUT 미드나잇 맨즈</p>
                    <div class="mypage-link-list">
                        <a class="mypage-link-item" href="/support?tab=notice"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a>
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
                <span class="profile-consent-inline"><input type="checkbox" id="email-consent" name="emailConsent"> 이메일 수신 동의</span>
              </label>
              <label>연락처
                <input type="text" id="profile-phone" name="phone" placeholder="010-0000-0000">
                <span class="profile-consent-inline"><input type="checkbox" id="sms-consent" name="smsConsent"> SMS 수신 동의</span>
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
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header>
    <section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list">
    <a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a>
    <a class="support-link-item" href="/my-inquiries"><span>내 문의함</span></a>
    <a class="support-link-item" href="/support?tab=faq"><span>FAQ</span></a>
    <a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a>
    </div></section><div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇테라스</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support?tab=notice"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇테라스 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><span class="community-board-name">마이페이지</span></div></header>
    <div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇테라스</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support?tab=notice"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇테라스 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div><section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list"><a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a><a class="support-link-item" href="/support?tab=faq"><span>FAQ</span></a><a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a></div></section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },


  'customer-service': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">1:1 고객센터</span></div></header>
    <section class="customer-service-card"><div class="customer-service-intro"><h2>문의 / 신고 접수</h2><p>불편하신 사항을 접수해주시면 확인 후 신속하게 처리하겠습니다.<br>게시글 신고, 댓글 신고, 일반 문의 모두 동일한 화면에서 등록할 수 있습니다.</p></div>
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
    </section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/pages/customerService.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/pages/customerService.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiries': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="고객센터 메뉴로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">내 문의함</span></div></header>
    <section class="customer-service-card"><div id="my-inquiries-list" class="my-inquiries-board"></div><p id="my-inquiries-empty" class="my-inquiries-empty">아직 접수된 문의가 없습니다.</p></section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/pages/myInquiries.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/pages/myInquiries.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiry-detail': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page"><header class="community-section-header"><div class="community-header-left"><a href="/my-inquiries" class="community-back-link" aria-label="내 문의함으로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">문의 상세</span></div></header>
    <section id="my-inquiry-detail" class="customer-service-card my-inquiry-detail-card"></section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/pages/myInquiryDetail.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/pages/myInquiryDetail.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'support-board': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container community-container"><header class="community-section-header"><div class="community-header-left"><button type="button" class="board-menu-toggle" id="board-menu-toggle" aria-label="공지사항 메뉴 열기" aria-expanded="false" aria-controls="board-tabs-panel"><span aria-hidden="true">☰</span></button><nav class="board-tabs hidden" id="board-tabs-panel" aria-label="공지사항 카테고리"><button type="button" class="board-tab active" data-tab="notice">공지사항</button><button type="button" class="board-tab" data-tab="faq">FAQ</button></nav><span class="community-board-name">공지사항</span></div></header>
    <div class="loading" id="support-public-loading"><div class="spinner"></div><p>불러오는 중...</p></div>
    <div class="error-banner hidden" id="support-public-error"><p id="support-public-error-message"></p></div>
    <div id="support-public-list" class="hidden"></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/supportBoard.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/supportBoard.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
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
                            <span class="lv hidden" id="post-author-level" data-text=""></span>
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

            <div class="adjacent-post-navigation hidden" id="post-adjacent-navigation">
                <a class="adjacent-post-link" id="previous-post-link" href="#">
                    <span class="adjacent-post-label"><span class="adjacent-post-direction" aria-hidden="true">˄</span>이전글</span>
                    <span class="adjacent-post-title">게시글이 없습니다.</span>
                </a>
                <a class="adjacent-post-link" id="next-post-link" href="#">
                    <span class="adjacent-post-label"><span class="adjacent-post-direction" aria-hidden="true">˅</span>다음글</span>
                    <span class="adjacent-post-title">게시글이 없습니다.</span>
                </a>
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
