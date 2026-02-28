<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>내 북마크 - 커뮤니티</title>
    <link rel="stylesheet" href="/static/css/common.css">
    <link rel="stylesheet" href="/static/css/layout.css">
    <link rel="stylesheet" href="/static/css/pages.css">
</head>
<body class="bookmarks-page">
    <header class="header">
        <div class="header-container">
            <a href="/index" class="logo">
                <h1>커뮤니티</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/my-page" class="btn btn-outline btn-sm">마이페이지</a>
                    <a href="/bookmarks" class="btn btn-outline btn-sm">북마크</a>
                    <a href="/create-post" class="btn btn-primary btn-sm">글쓰기</a>
                    <a href="/admin" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
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
                <a href="/index" class="btn btn-primary">게시글 둘러보기</a>
            </div>

            <div id="bookmark-list"></div>

            <div class="pagination hidden" id="pagination">
                <button class="btn btn-outline btn-sm" id="prev-btn" disabled>이전</button>
                <div class="page-numbers" id="page-numbers"></div>
                <button class="btn btn-outline btn-sm" id="next-btn">다음</button>
            </div>
        </div>
    </main>
    <script src="/static/js/utils/constants.js"></script>
    <script src="/static/js/utils/helpers.js"></script>
    <script src="/static/js/utils/validation.js"></script>
    <script src="/static/js/utils/auth.js"></script>
    <script src="/static/js/utils/notifications.js"></script>
    <script src="/static/js/api/apiClient.js"></script>
    <script src="/static/js/api/authAPI.js"></script>
    <script src="/static/js/api/postAPI.js"></script>
    <script src="/static/js/api/bookmarkAPI.js"></script>
    <script src="/static/js/components/header.js"></script>
    <script src="/static/js/components/postCard.js"></script>
    <script src="/static/js/components/pagination.js"></script>
    <script src="/static/js/pages/bookmarks.js"></script>
    <script src="/static/js/app.js"></script>
</body>
</html>