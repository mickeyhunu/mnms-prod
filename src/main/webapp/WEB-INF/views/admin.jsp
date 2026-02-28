<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>관리자 페이지 - 커뮤니티</title>
    <link rel="stylesheet" href="/static/css/common.css">
    <link rel="stylesheet" href="/static/css/layout.css">
    <link rel="stylesheet" href="/static/css/components.css">
    <style>
        .admin-header {
            background: #007bff;
            color: white;
            padding: 40px 20px;
            text-align: center;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 123, 255, 0.3);
        }
        
        .admin-header h2 {
            font-size: 32px;
            margin-bottom: 12px;
            font-weight: 700;
        }
        
        .admin-header p {
            opacity: 0.9;
            font-size: 16px;
        }
        
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stats-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 5px solid #007bff;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .stats-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        
        .stats-card h3 {
            color: #666;
            font-size: 14px;
            margin-bottom: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stats-card .number {
            color: #007bff;
            font-size: 36px;
            font-weight: 700;
            line-height: 1;
        }
        
        .admin-tabs {
            display: flex;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 6px;
            margin-bottom: 30px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        
        .admin-tab-btn {
            flex: 1;
            padding: 14px 20px;
            border: none;
            background: transparent;
            color: #6c757d;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s ease;
            font-weight: 500;
            font-size: 15px;
        }
        
        .admin-tab-btn:hover {
            color: #495057;
            background: #f8f9fa;
        }
        
        .admin-tab-btn.active {
            background: #007bff;
            color: white;
            font-weight: 600;
            transform: translateY(-1px);
        }
        
        .admin-tab-content {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f8f9fa;
        }
        
        .section-header h2 {
            color: #2c3e50;
            font-size: 22px;
            margin: 0;
            font-weight: 600;
        }
        
        .admin-posts-table,
        .admin-users-table,
        .admin-comments-table {
            border: 1px solid #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .table-header {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
        }
        
        .admin-posts-table .table-header {
            display: grid;
            grid-template-columns: 80px 1fr 150px 120px 80px 80px 100px;
        }
        
        .admin-posts-table .table-row {
            display: grid;
            grid-template-columns: 80px 1fr 150px 120px 80px 80px 100px;
            border-bottom: 1px solid #f1f3f5;
            transition: all 0.2s ease;
        }
        
        .admin-users-table .users-header {
            display: grid;
            grid-template-columns: 80px 200px 150px 120px 120px 140px 100px;
        }
        
        .admin-users-table .users-row {
            display: grid;
            grid-template-columns: 80px 200px 150px 120px 120px 140px 100px;
            border-bottom: 1px solid #f1f3f5;
            transition: all 0.2s ease;
        }
        
        .admin-comments-table .table-header {
            display: grid;
            grid-template-columns: 80px 2fr 150px 120px 120px 100px;
        }
        
        .admin-comments-table .table-row {
            display: grid;
            grid-template-columns: 80px 2fr 150px 120px 120px 100px;
            border-bottom: 1px solid #f1f3f5;
            transition: all 0.2s ease;
        }
        
        .table-row:hover,
        .users-row:hover {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            transform: translateY(-1px);
        }
        
        .table-row:last-child,
        .users-row:last-child {
            border-bottom: none;
        }
        
        .header-cell, .table-cell {
            padding: 16px 14px;
            display: flex;
            align-items: center;
            font-size: 14px;
            border-right: 1px solid #f1f3f5;
        }
        
        .header-cell:last-child, .table-cell:last-child {
            border-right: none;
        }
        
        .title-cell {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .post-title-container {
            width: 100%;
        }
        
        .post-title-container a {
            color: #2c3e50;
            text-decoration: none;
            font-weight: 500;
            display: block;
            margin-bottom: 8px;
            line-height: 1.4;
        }
        
        .post-title-container a:hover {
            color: #007bff;
        }
        
        .admin-post-title {
            color: #dc3545 !important;
            font-weight: 600 !important;
        }
        
        .admin-badge {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .role-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .admin-badge {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
        }
        
        .user-badge {
            background: #007bff;
            color: white;
        }
        
        .comment-content {
            max-width: 300px;
            overflow: hidden;
        }
        
        .comment-content div {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
        }
        
        .post-link {
            color: #007bff;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        
        .post-link:hover {
            background: #007bff;
            color: white;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 6px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            border: none;
        }
        
        .btn-danger:hover {
            background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
            transform: translateY(-1px);
        }
        
        .btn-outline {
            background: transparent;
            border: 1px solid #007bff;
            color: #007bff;
        }
        
        .btn-outline:hover {
            background: #007bff;
            color: white;
        }
        
        .empty-state {
            text-align: center;
            padding: 80px 20px;
            color: #6c757d;
        }
        
        .empty-state p {
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .error-banner {
            background: linear-gradient(135deg, #f8d7da 0%, #f1aeb5 100%);
            color: #721c24;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            color: #6c757d;
        }
        
        .loading .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading p {
            font-size: 15px;
            margin: 0;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-container">
            <a href="/index" class="logo">
                <h1>커뮤니티</h1>
            </a>
            <nav class="nav">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/my-page" class="btn btn-outline btn-sm">마이페이지</a>
                    <a href="/bookmarks" class="btn btn-outline btn-sm">북마크</a>
                    <a href="/create-post" class="btn btn-primary btn-sm">글쓰기</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>관리자 권한을 확인하는 중...</p>
            </div>

            <div id="error-banner" class="error-banner hidden">
                <p id="error-message">오류가 발생했습니다.</p>
            </div>

            <div id="admin-container" class="hidden">
                <div id="admin-info" class="admin-header">
                    <h2>관리자 페이지</h2>
                    <p>게시글, 댓글, 사용자를 관리할 수 있습니다</p>
                </div>

                <div class="stats-cards">
                    <div class="stats-card">
                        <h3>전체 게시글</h3>
                        <div class="number" id="total-posts-stat">0</div>
                    </div>
                    <div class="stats-card">
                        <h3>전체 사용자</h3>
                        <div class="number" id="total-users-stat">0</div>
                    </div>
                    <div class="stats-card">
                        <h3>관리자 계정</h3>
                        <div class="number" id="total-admins-stat">0</div>
                    </div>
                    <div class="stats-card">
                        <h3>전체 댓글</h3>
                        <div class="number" id="total-comments-stat">0</div>
                    </div>
                </div>

                <div class="admin-tabs">
                    <button class="admin-tab-btn active" data-tab="posts">게시글 관리</button>
                    <button class="admin-tab-btn" data-tab="users">사용자 관리</button>
                    <button class="admin-tab-btn" data-tab="comments">댓글 관리</button>
                </div>

                <div id="posts-tab" class="admin-tab-content">
                    <div class="section-header">
                        <h2>게시글 관리</h2>
                        <button id="refresh-posts-btn" class="btn btn-outline btn-sm">새로고침</button>
                    </div>
                    <div id="posts-container">
                        <div id="posts-loading" class="loading">
                            <div class="spinner"></div>
                            <p>게시글을 불러오는 중...</p>
                        </div>
                    </div>
                </div>

                <div id="users-tab" class="admin-tab-content hidden">
                    <div class="section-header">
                        <h2>사용자 관리</h2>
                        <button id="refresh-users-btn" class="btn btn-outline btn-sm">새로고침</button>
                    </div>
                    <div id="users-container">
                        <div id="users-loading" class="loading">
                            <div class="spinner"></div>
                            <p>사용자 목록을 불러오는 중...</p>
                        </div>
                    </div>
                </div>

                <div id="comments-tab" class="admin-tab-content hidden">
                    <div class="section-header">
                        <h2>댓글 관리</h2>
                        <button id="refresh-comments-btn" class="btn btn-outline btn-sm">새로고침</button>
                    </div>
                    <div id="comments-container">
                        <div id="comments-loading" class="loading">
                            <div class="spinner"></div>
                            <p>댓글을 불러오는 중...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="/static/js/utils/constants.js"></script>
    <script src="/static/js/utils/helpers.js"></script>
    <script src="/static/js/utils/auth.js"></script>
	<script src="/static/js/utils/notifications.js"></script>
    <script src="/static/js/api/apiClient.js"></script>
    <script src="/static/js/components/header.js"></script>
    <script src="/static/js/pages/admin.js"></script>
    <script src="/static/js/app.js"></script>
</body>
</html>