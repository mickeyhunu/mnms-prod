<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>마이페이지 - 커뮤니티</title>
    <link rel="stylesheet" href="/static/css/common.css">
    <link rel="stylesheet" href="/static/css/layout.css">
    <link rel="stylesheet" href="/static/css/components.css">
    <style>
        .tab-pane {
            display: none !important;
        }
        
        .tab-pane.active {
            display: block !important;
        }
        
        .my-page-tabs {
            display: flex;
            justify-content: center;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 4px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .tab-btn {
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: transparent;
            color: #6c757d;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s ease;
            font-weight: 500;
            font-size: 14px;
        }
        
        .tab-btn:hover {
            color: #495057;
            background: #f8f9fa;
        }
        
        .tab-btn.active {
            background: #007bff;
            color: white;
            font-weight: 600;
        }
        
        .page-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .page-header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #333;
        }
        
        .page-header p {
            color: #666;
            font-size: 16px;
        }
        
        .my-posts-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .my-post-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 15px;
        }
        
        .my-post-card:hover {
            border-color: #007bff;
            box-shadow: 0 2px 8px rgba(0,123,255,0.1);
        }
        
        .my-post-card .post-title {
            color: #333;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
            line-height: 1.4;
        }
        
        .my-post-card .post-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 14px;
        }
        
        .my-post-card .post-date {
            color: #666;
        }
        
        .my-post-card .post-stats {
            display: flex;
            gap: 15px;
            color: #666;
        }
        
        .my-post-card .post-content {
            color: #555;
            line-height: 1.6;
            font-size: 14px;
        }
        
        .stat-card {
            text-align: center;
            padding: 20px;
        }
        
        .stat-card h4 {
            color: #666;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        
        .info-group {
            display: flex;
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .info-group label {
            min-width: 80px;
            font-weight: 600;
            color: #495057;
        }
        
        .info-group span {
            color: #333;
        }
        
        .profile-info {
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .form {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .form h3 {
            margin-bottom: 20px;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-card h4 {
            color: #666;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(4px);
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal-container {
            background: white;
            width: 90%;
            max-width: 800px;
            max-height: 90%;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            position: relative;
            animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .modal-header {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #6c757d;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }

        .modal-close:hover {
            background: #e9ecef;
            color: #495057;
        }

        .modal-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .modal-message-tabs {
            display: flex;
            margin-bottom: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 4px;
        }

        .modal-message-tab-btn {
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: transparent;
            color: #6c757d;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .modal-message-tab-btn:hover {
            background: #e9ecef;
            color: #495057;
        }

        .modal-message-tab-btn.active {
            background: white;
            color: #007bff;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .modal-message-list {
            min-height: 300px;
        }

        .modal-message-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }

        .modal-message-card:hover {
            border-color: #007bff;
            background: #f1f8ff;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
        }

        .modal-message-card.unread {
            border-left: 4px solid #007bff;
            background: white;
        }

        .modal-message-card.unread::before {
            content: '';
            position: absolute;
            top: 16px;
            right: 16px;
            width: 8px;
            height: 8px;
            background: #007bff;
            border-radius: 50%;
        }

        .modal-message-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .modal-message-meta strong {
            color: #333;
            font-weight: 600;
        }

        .modal-message-date {
            color: #6c757d;
        }

        .modal-message-content {
            color: #495057;
            line-height: 1.5;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .modal-message-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        .compose-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .compose-btn:hover {
            background: #0056b3;
        }

        .loading-modal {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }

        .empty-state-modal {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }

        .empty-state-modal h4 {
            margin-bottom: 8px;
            color: #495057;
        }

        .message-detail-modal .modal-container {
            max-width: 600px;
        }

        .message-detail-header {
            background: #f8f9fa;
            padding: 16px 20px;
            border-bottom: 1px solid #e9ecef;
        }

        .message-detail-header h4 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
        }

        .message-detail-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #6c757d;
        }

        .message-detail-content {
            padding: 20px;
            line-height: 1.6;
            color: #333;
            min-height: 200px;
        }

        .message-detail-actions {
            padding: 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .form-group-modal {
            margin-bottom: 15px;
        }

        .form-group-modal label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }

        .form-control-modal {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .form-control-modal:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }

        textarea.form-control-modal {
            height: 150px;
            resize: vertical;
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
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>사용자 정보를 불러오는 중...</p>
            </div>

            <div id="error-banner" class="error-banner hidden">
                <p id="error-message">오류가 발생했습니다.</p>
                <button id="retry-btn" class="btn btn-primary btn-sm">다시 시도</button>
            </div>
            <div id="profile-container" class="hidden">
                <div class="page-header">
                    <h1>마이페이지</h1>
                    <p>내 활동과 쪽지를 관리할 수 있습니다</p>
                </div>

                <div class="my-page-tabs">
                    <button class="tab-btn active" data-tab="profile">프로필</button>
                    <button class="tab-btn" data-tab="posts">내 게시글</button>
                    <button class="tab-btn" data-tab="messages" id="hojun">쪽지함</button>
                    <button class="tab-btn" data-tab="stats">통계</button>
                </div>

                <div class="tab-content">
                    <div id="profile-tab" class="tab-pane active">
                        <div class="section-header">
                            <h2>프로필 정보</h2>
                        </div>

                        <div class="profile-info">
                            <div class="info-group">
                                <label>이메일:</label>
                                <span id="profile-email"></span>
                            </div>
                            <div class="info-group">
                                <label>닉네임:</label>
                                <span id="profile-nickname"></span>
                            </div>
                            <div class="info-group">
                                <label>가입일:</label>
                                <span id="join-date"></span>
                            </div>
                        </div>

                        <form id="profile-form" class="form">
                            <h3>프로필 수정</h3>
                            
                            <div class="form-group">
                                <label for="email">이메일</label>
                                <input type="email" id="email" name="email" class="form-control" readonly>
                            </div>

                            <div class="form-group">
                                <label for="department">부서</label>
                                <input type="text" id="department" name="department" class="form-control" required>
                            </div>

                            <div class="form-group">
                                <label for="job-position">직책</label>
                                <input type="text" id="job-position" name="jobPosition" class="form-control" required>
                            </div>

                            <div class="form-group">
                                <label for="nickname">닉네임</label>
                                <input type="text" id="nickname" name="nickname" class="form-control" required>
                            </div>

                            <div class="form-group">
                                <label for="company">회사명</label>
                                <input type="text" id="company" name="company" class="form-control" required>
                            </div>

                            <div class="form-actions">
                                <button type="submit" id="profile-submit-btn" class="btn btn-primary">저장</button>
                            </div>
                        </form>

                        <div id="profile-error-banner" class="error-banner hidden">
                            <p id="profile-error-message"></p>
                        </div>
                        <form id="password-form" class="form">
                            <h3>비밀번호 변경</h3>
                            
                            <div class="form-group">
                                <label for="newPassword">새 비밀번호</label>
                                <input type="password" id="newPassword" name="newPassword" class="form-control" required>
                            </div>

                            <div class="form-group">
                                <label for="confirmPassword">비밀번호 확인</label>
                                <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" required>
                            </div>

                            <div class="form-actions">
                                <button type="submit" id="password-submit-btn" class="btn btn-primary">비밀번호 변경</button>
                            </div>
                        </form>

                        <div id="password-error-banner" class="error-banner hidden">
                            <p id="password-error-message"></p>
                        </div>
                    </div>

                    <div id="posts-tab" class="tab-pane hidden">
                        <div class="section-header">
                            <h2>내 게시글</h2>
                        </div>
                        <div id="my-posts-list">
                            <div class="loading">로딩 중...</div>
                        </div>
                    </div>

                    <div id="stats-tab" class="tab-pane hidden">
                        <div class="section-header">
                            <h2>내 활동 통계</h2>
                        </div>
                        <div id="my-stats">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <h4>총 게시글</h4>
                                    <span class="stat-number" id="total-posts">-</span>
                                </div>
                                <div class="stat-card">
                                    <h4>총 댓글</h4>
                                    <span class="stat-number" id="total-comments">-</span>
                                </div>
                                <div class="stat-card">
                                    <h4>받은 좋아요</h4>
                                    <span class="stat-number" id="total-likes">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div id="messageModal" class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title">쪽지함</h3>
                <button class="compose-btn" onclick="openComposeModal()">새 쪽지</button>
                <button class="modal-close" onclick="closeMessageModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-message-tabs">
                    <button class="modal-message-tab-btn active" data-tab="received">받은 쪽지</button>
                    <button class="modal-message-tab-btn" data-tab="sent">보낸 쪽지</button>
                </div>
                <div id="modal-received-messages" class="modal-message-list">
                    <div class="loading-modal">받은 쪽지를 불러오는 중...</div>
                </div>
                <div id="modal-sent-messages" class="modal-message-list" style="display: none;">
                    <div class="loading-modal">보낸 쪽지를 불러오는 중...</div>
                </div>
            </div>
        </div>
    </div>

    <div id="messageDetailModal" class="modal-overlay message-detail-modal">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title">쪽지 상세보기</h3>
                <button class="modal-close" onclick="closeMessageDetailModal()">&times;</button>
            </div>
            <div id="messageDetailContent" class="modal-body"></div>
        </div>
    </div>

    <div id="composeModal" class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title">새 쪽지 작성</h3>
                <button class="modal-close" onclick="closeComposeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="composeForm">
                    <div class="form-group-modal" id="receiverContainer">
                        <label for="receiverNickname">받는 사람</label>
                        <input type="text" id="receiverNickname" class="form-control-modal" placeholder="닉네임을 입력하세요">
                        <input type="hidden" id="receiverId">
                    </div>
                    <div class="form-group-modal">
                        <label for="messageTitle">제목</label>
                        <input type="text" id="messageTitle" class="form-control-modal" placeholder="제목을 입력하세요">
                    </div>
                    <div class="form-group-modal">
                        <label for="messageContent">내용</label>
                        <textarea id="messageContent" class="form-control-modal" placeholder="내용을 입력하세요"></textarea>
                    </div>
                    <div style="text-align: right;">
                        <button type="button" class="btn btn-outline" onclick="closeComposeModal()">취소</button>
                        <button type="submit" class="btn btn-primary" style="margin-left: 8px;">전송</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div id="message-notification-badge" class="notification-badge hidden"></div>
    <script src="/static/js/utils/constants.js"></script>
    <script src="/static/js/utils/helpers.js"></script>
    <script src="/static/js/utils/validation.js"></script>
    <script src="/static/js/utils/auth.js"></script>
    <script src="/static/js/utils/notifications.js"></script>
    <script src="/static/js/api/apiClient.js"></script>
    <script src="/static/js/api/authAPI.js"></script>
    <script src="/static/js/api/postAPI.js"></script>
    <script src="/static/js/components/header.js"></script>
    <script src="/static/js/pages/myPage.js"></script>
    <script src="/static/js/app.js"></script>
</body>
</html>