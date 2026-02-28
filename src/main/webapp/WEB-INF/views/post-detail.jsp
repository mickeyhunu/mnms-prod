<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>게시글 상세 - 커뮤니티</title>
    <link rel="stylesheet" href="/static/css/common.css">
    <link rel="stylesheet" href="/static/css/layout.css">
    <link rel="stylesheet" href="/static/css/components.css">
    <link rel="stylesheet" href="/static/css/postDetail.css">
    <style>
        .hidden {
            display: none !important;
        }
        
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal:not(.hidden) {
            display: flex;
        }

        .comments-section {
            margin-top: 30px;
        }

        .comments-header {
            display: flex;
            justify-content: between;
            align-items: center;
            padding: 20px 0 15px 0;
            border-bottom: 2px solid #f8f9fa;
            margin-bottom: 25px;
        }

        .comments-header h3 {
            color: #2c3e50;
            font-size: 1.4rem;
            font-weight: 600;
            margin: 0;
        }

        .comments-header #comment-count {
            background: #007bff !important;
            color: white !important;
            font-weight: 700 !important;
            font-size: 14px !important;
            padding: 6px 12px !important;
            border-radius: 20px !important;
            min-width: 40px !important;
            text-align: center !important;
            display: inline-block !important;
            line-height: 1 !important;
        }

        .comment-form {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            transition: border-color 0.3s ease;
        }

        .comment-form:hover {
            border-color: #007bff;
        }

        .comment-form #comment-content {
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            font-size: 15px;
            line-height: 1.6;
            resize: vertical;
            transition: border-color 0.3s ease;
            background: white;
        }

        .comment-form #comment-content:focus {
            outline: none;
            border-color: #007bff;
        }

        .comment-form #comment-content::placeholder {
            color: #6c757d;
            font-style: italic;
        }

        .comment-form .form-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
            gap: 12px;
        }

        .comment-form #comment-submit-btn {
            background: #007bff;
            color: white;
            border: 1px solid #007bff;
            border-radius: 6px;
            padding: 10px 24px;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.3s ease;
        }

        .comment-form #comment-submit-btn:hover {
            background: #0056b3;
            border-color: #0056b3;
        }

        .comments-list {
            margin-top: 20px;
        }

        .comment-item {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            transition: border-color 0.3s ease;
            position: relative;
        }

        .comment-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: #007bff;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .comment-item:hover {
            border-color: #007bff;
        }

        .comment-item:hover::before {
            opacity: 1;
        }

        .comment-meta {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .comment-meta > div:first-child {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .comment-author {
            font-weight: 700;
            color: #2c3e50;
            font-size: 15px;
            background: #f8f9fa;
            padding: 4px 12px;
            border-radius: 20px;
            border: 1px solid #dee2e6;
        }

        .admin-comment-author {
            background: #dc3545 !important;
            color: white !important;
            border-color: #dc3545 !important;
            font-weight: 700 !important;
        }

        .comment-date {
            color: #6c757d;
            font-size: 13px;
            font-weight: 500;
            background: #f8f9fa;
            padding: 4px 10px;
            border-radius: 12px;
        }

        .comment-meta-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .comment-message-btn,
        .reply-btn {
            background: white !important;
            border: 1px solid #007bff !important;
            color: #007bff !important;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .comment-message-btn:hover,
        .reply-btn:hover {
            background: #007bff !important;
            color: white !important;
        }

        .comment-content {
            color: #2c3e50;
            line-height: 1.7;
            font-size: 15px;
            margin-bottom: 16px;
            word-break: break-word;
        }

        .admin-comment-content {
            color: #dc3545 !important;
            font-weight: 600 !important;
            background: #fff5f5;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
            margin: 8px 0;
        }

        .comment-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            flex-wrap: wrap;
        }

        .comment-actions .btn {
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .comment-actions .btn-warning {
            background: #6c757d !important;
            color: white !important;
            border: 1px solid #6c757d !important;
        }

        .comment-actions .btn-warning:hover {
            background: #545b62 !important;
            border-color: #545b62 !important;
        }

        .comment-actions .btn-danger {
            background: #dc3545 !important;
            color: white !important;
            border: 1px solid #dc3545 !important;
        }

        .comment-actions .btn-danger:hover {
            background: #c82333 !important;
            border-color: #c82333 !important;
        }

        .reply-form-container {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 2px solid #f8f9fa;
        }

        .reply-form {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
        }

        .reply-form textarea {
            border: 2px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
            background: white;
            transition: border-color 0.3s ease;
        }

        .reply-form textarea:focus {
            outline: none;
            border-color: #007bff;
        }

        .reply-form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 12px;
        }

        .reply-form .btn-secondary {
            background: #6c757d !important;
            color: white !important;
            border: 1px solid #6c757d !important;
            border-radius: 6px;
            padding: 8px 16px;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }

        .reply-form .btn-secondary:hover {
            background: #545b62 !important;
            border-color: #545b62 !important;
        }

        .reply-form .btn-primary {
            background: #007bff !important;
            color: white !important;
            border: 1px solid #007bff !important;
            border-radius: 6px;
            padding: 8px 16px;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }

        .reply-form .btn-primary:hover {
            background: #0056b3 !important;
            border-color: #0056b3 !important;
        }

        .comment-item.reply {
            margin-left: 30px;
            margin-top: 12px;
            border-left: 4px solid #007bff;
            background: #f8f9fa;
            position: relative;
        }

        .comment-item.reply::before {
            display: none;
        }

        .comment-item.reply::after {
            content: '';
            position: absolute;
            top: -8px;
            left: -20px;
            width: 16px;
            height: 16px;
            border-left: 2px solid #007bff;
            border-bottom: 2px solid #007bff;
            border-bottom-left-radius: 8px;
        }

        .no-comments {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 60px 20px;
            background: #f8f9fa;
            border-radius: 12px;
            border: 2px dashed #dee2e6;
            font-size: 16px;
        }

        .reply-indicator {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #1976d2;
        }

        .reply-indicator .btn-close-small {
            background: none;
            border: none;
            color: #1976d2;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            padding: 0;
            margin-left: 8px;
        }

        .reply-indicator .btn-close-small:hover {
            color: #0d47a1;
        }

        @media (max-width: 768px) {
            .comment-meta {
                flex-direction: column;
                gap: 8px;
            }
            
            .comment-meta-actions {
                align-self: flex-start;
            }
            
            .comment-item.reply {
                margin-left: 16px;
            }
            
            .comment-form {
                padding: 20px 16px;
            }
            
            .comment-actions {
                justify-content: flex-start;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-container">
            <a href="/index" class="logo">
                <h1>커뮤니티</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="/login" class="btn btn-outline btn-sm">로그인</a>
                    <a href="/register" class="btn btn-primary btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
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
        <div class="container" style="max-width: 800px;">
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>게시글을 불러오는 중...</p>
            </div>

            <div class="error-banner hidden" id="error-banner">
                <p id="error-message"></p>
                <button class="btn btn-sm btn-primary" id="retry-btn">다시 시도</button>
            </div>

            <div class="post-detail hidden" id="post-detail">
                <div class="card">
                    <div class="post-header">
                        <div>
                            <h1 id="post-title"></h1>
                            <div class="post-meta">
                                <span id="post-author"></span>
                                <span id="post-date"></span>
                                <button type="button" class="btn btn-sm btn-outline-primary" id="message-btn" style="display: none;">쪽지</button>
                            </div>
                        </div>
                        <div class="post-owner-actions hidden" id="post-owner-actions">
                            <a href="#" class="btn btn-sm btn-secondary" id="edit-btn">수정</a>
                            <button class="btn btn-sm btn-danger" id="delete-btn">삭제</button>
                        </div>
                    </div>

                    <div class="post-content" id="post-content"></div>

                    <div class="post-images hidden" id="post-images">
                        <div class="images-grid" id="images-grid"></div>
                    </div>

                    <div class="post-actions">
                        <div class="flex" style="gap: 10px;">
                            <button class="like-btn" id="like-btn">
                                <span id="like-icon">🤍</span>
                                <span id="like-count">0</span>
                            </button>
                            <button class="bookmark-btn" id="bookmark-btn">
                                <span id="bookmark-icon">🔖</span>
                            </button>
                        </div>
                        <a href="/index" class="btn btn-outline btn-sm">목록으로</a>
                    </div>
                </div>
            </div>

            <div class="comments-section hidden" id="comments-section">
                <div class="card">
                    <div class="comments-header">
                        <h3>댓글 <span id="comment-count">0</span></h3>
                    </div>

                    <div class="comment-form hidden" id="comment-form">
                        <form id="comment-create-form">
                            <div class="form-group">
                                <textarea id="comment-content" name="content" class="form-control" placeholder="댓글을 입력하세요" rows="3" required></textarea>
                                <div class="error-message hidden" id="content-error"></div>
                            </div>
                            <div class="form-actions" style="justify-content: flex-end;">
                                <button type="submit" class="btn btn-primary btn-sm" id="comment-submit-btn">댓글 작성</button>
                            </div>
                        </form>
                    </div>

                    <div class="comments-list" id="comments-list">
                        <p class="no-comments">아직 댓글이 없습니다.</p>
                    </div>

                    <div class="comment-pagination hidden" id="comment-pagination">
                        <button class="btn btn-outline btn-sm" id="load-more-comments">더 보기</button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="image-modal" id="image-modal">
        <div class="modal-image-container">
            <img src="" alt="" class="modal-image" id="modal-image">
            <button class="modal-nav modal-prev hidden" id="modal-prev">‹</button>
            <button class="modal-nav modal-next hidden" id="modal-next">›</button>
            <button class="modal-close" id="modal-close">×</button>
            <div class="modal-counter" id="modal-counter"></div>
        </div>
    </div>

    <div class="modal hidden" id="message-modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>쪽지 보내기</h3>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">받는 사람</label>
                    <input type="text" id="message-recipient" class="form-control" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">내용</label>
                    <textarea id="message-content" class="form-control" placeholder="쪽지 내용을 입력하세요" rows="4" required></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="message-cancel-btn">취소</button>
                <button type="button" class="btn btn-primary" id="message-send-btn">전송</button>
            </div>
        </div>
    </div>
    <script src="/static/js/utils/constants.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/utils/helpers.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/utils/validation.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/utils/auth.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/utils/notifications.js"></script>
    <script src="/static/js/api/apiClient.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/api/messageAPI.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/api/authAPI.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/api/postAPI.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/api/commentAPI.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/components/header.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/pages/postDetail.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/components/imageModal.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/app.js?v=<%= System.currentTimeMillis() %>"></script>
    <script src="/static/js/utils/fallback.js?v=<%= System.currentTimeMillis() %>"></script>
</body>
</html>