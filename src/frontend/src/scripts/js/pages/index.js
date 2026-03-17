/**
 * 파일 역할: index 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let currentPage = 0;
let totalPages = 0;
let isLoading = false;
const pageSize = 20;
const VIEWED_POST_IDS_STORAGE_KEY = 'communityViewedPostIds';
const searchState = {
    searchType: 'bbs_title',
    keyword: ''
};
let currentBoardType = 'ALL';

async function initIndexPage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') {
        initHeader();
    }

    setupCommunityActions();
    initBoardTabs();
    initSearchEvents();
    await loadBestPosts();
    updateBestPostsVisibility();
    await loadPosts(0);
    initCommonEvents();
}

function updateBestPostsVisibility() {
    const bestPostsSection = document.querySelector('.best-posts-section');
    if (!bestPostsSection) return;

    if (currentBoardType === 'ALL') {
        showElement(bestPostsSection);
        return;
    }

    hideElement(bestPostsSection);
}

async function loadBestPosts() {
    const dailyList = document.getElementById('daily-best-list');
    const weeklyList = document.getElementById('weekly-best-list');
    const dailyEmpty = document.getElementById('daily-best-empty');
    const weeklyEmpty = document.getElementById('weekly-best-empty');

    if (!dailyList || !weeklyList || !dailyEmpty || !weeklyEmpty) return;

    try {
        const response = await PostAPI.getBestPosts();
        const dailyPosts = Array.isArray(response?.daily) ? response.daily : [];
        const weeklyPosts = Array.isArray(response?.weekly) ? response.weekly : [];

        renderBestPosts(dailyPosts, dailyList, dailyEmpty);
        renderBestPosts(weeklyPosts, weeklyList, weeklyEmpty);
    } catch (error) {
        dailyList.innerHTML = '';
        weeklyList.innerHTML = '';
        dailyEmpty.textContent = '베스트 게시글을 불러오지 못했습니다.';
        weeklyEmpty.textContent = '베스트 게시글을 불러오지 못했습니다.';
        showElement(dailyEmpty);
        showElement(weeklyEmpty);
    }
}

function renderBestPosts(posts, container, emptyElement) {
    if (!Array.isArray(posts) || !posts.length) {
        container.innerHTML = '';
        showElement(emptyElement);
        return;
    }

    hideElement(emptyElement);
    container.innerHTML = posts.map((post, index) => {
        const score = Number(post.score || 0).toFixed(1);
        const likeCount = Number(post.likeCount || 0);
        const commentCount = Number(post.commentCount || 0);
        const viewCount = Number(post.viewCount || 0);

        return `
            <li class="best-post-item">
                <a class="best-post-link" href="/post-detail?id=${post.id}">
                    <span class="best-post-rank">${index + 1}</span>
                    <span class="best-post-text">[${sanitizeHTML(getBoardLabel(post.boardType))}] ${sanitizeHTML(post.title || '제목 없음')}</span>
                    <span class="best-post-meta">점수 ${score} · 👍 ${likeCount} · 💬 ${commentCount} · 👁 ${viewCount}</span>
                </a>
            </li>
        `;
    }).join('');
}

async function loadPosts(page = 0) {
    if (isLoading) return;

    const loading = document.getElementById('loading');
    const postListContainer = document.getElementById('post-list');
    const errorBanner = document.getElementById('error-banner');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination');

    try {
        isLoading = true;

        showElement(loading);
        hideElement(errorBanner);
        hideElement(emptyState);
        hideElement(pagination);

        const response = await PostAPI.getPosts({
            page,
            size: pageSize,
            keyword: searchState.keyword,
            search: searchState.searchType,
            boardType: currentBoardType
        });

        const posts = Array.isArray(response?.posts)
            ? response.posts
            : Array.isArray(response?.content)
                ? response.content
                : [];

        const resolvedCurrentPage = Number(response.currentPage ?? response.page ?? page);
        const resolvedTotalPages = Number(response.totalPages ?? 0);

        currentPage = resolvedCurrentPage;
        totalPages = resolvedTotalPages;

        if (posts.length > 0) {
            renderPostList(posts, postListContainer);
            updatePagination();
            showElement(pagination);
        } else {
            postListContainer.innerHTML = '';
            showElement(emptyState);
        }
    } catch (error) {
        showErrorBanner('게시글을 불러오는데 실패했습니다: ' + error.message);
        postListContainer.innerHTML = '';
    } finally {
        isLoading = false;
        hideElement(loading);
    }
}

function renderPostList(posts, container) {
    if (!container) return;

    container.innerHTML = posts
        .map((post) => createArticleItem(post))
        .join('');
}

function getBoardLabel(boardType) {
    const boardMap = {
        FREE: '자유',
        ANON: '익명',
        REVIEW: '후기',
        STORY: '썰',
        QUESTION: '질문'
    };

    return boardMap[String(boardType || '').toUpperCase()] || '자유';
}

function createArticleItem(post) {
    const createdAt = formatDate(post.createdAt);
    const commentCount = Number(post.commentCount || 0);
    const viewCount = Number(post.viewCount || 0);
    const recommendCount = Number(post.likeCount || post.recommendCount || 0);
    const previewText = sanitizeHTML(getPreviewText(post));
    const authorName = sanitizeHTML(post.boardType === 'ANON' ? '익명' : (post.authorNickname || '익명'));
    const isNoticePost = Boolean(post.isNotice);
    const noticeType = String(post.noticeType || 'NOTICE').toUpperCase();
    const boardLabel = sanitizeHTML(
        isNoticePost
            ? (noticeType === 'IMPORTANT' ? '필독' : '공지')
            : getBoardLabel(post.boardType)
    );
    const boardLabelClass = isNoticePost
        ? (noticeType === 'IMPORTANT' ? 'article-board-label article-board-label-important' : 'article-board-label article-board-label-notice')
        : 'article-board-label';
    const authorBadge = sanitizeHTML(post.authorRole === 'ADMIN' ? '관리자' : authorName);
    const categoryTag = '';
    const isNewPost = isWithin12Hours(post.createdAt);
    const isNewComment = isWithin12Hours(
        post.lastCommentCreatedAt
        || post.latestCommentCreatedAt
        || post.commentCreatedAt
        || post.recentCommentCreatedAt
    );
    const shouldShowNewBadge = isNewPost || isNewComment || post.isNew || post.newPost;
    const isViewedPost = hasViewedPost(post.id);

    return `
        <li class="article-item ${isViewedPost ? 'article-item-viewed' : 'article-item-unviewed'} ${isNoticePost ? 'article-item-notice' : ''} ${isNoticePost && noticeType === 'IMPORTANT' ? 'article-item-important' : ''}">
            <a class="article-main" href="/post-detail?id=${post.id}" data-post-id="${post.id}">
                <div class="article-title-row">
                    <span class="article-inline-icon" aria-hidden="true">💬</span>
                    <h3 class="article-title"><span class="${boardLabelClass}">[${boardLabel}]</span> ${sanitizeHTML(post.title || '제목 없음')}</h3>
                    <span class="article-comment-inline">[${commentCount}]</span>
                    ${shouldShowNewBadge ? '<span class="article-new-badge">NEW</span>' : ''}
                </div>
                <p class="article-preview">${previewText}</p>
                <div class="article-meta">
                    <span>${authorBadge}</span>
                    <span>${createdAt}</span>
                    <span>조회수 : ${viewCount}</span>
                    <span class="article-recommend">추천수 : ${recommendCount}</span>
                </div>
            </a>
            <div class="article-side">
                ${categoryTag}
            </div>
        </li>
    `;
}

function getViewedPostIdSet() {
    try {
        const raw = localStorage.getItem(VIEWED_POST_IDS_STORAGE_KEY);
        const parsed = JSON.parse(raw || '[]');
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.map((id) => String(id)));
    } catch (error) {
        return new Set();
    }
}

function markPostAsViewed(postId) {
    if (!postId) return;

    const viewedPostIds = getViewedPostIdSet();
    viewedPostIds.add(String(postId));

    try {
        localStorage.setItem(VIEWED_POST_IDS_STORAGE_KEY, JSON.stringify([...viewedPostIds]));
    } catch (error) {
        // localStorage 접근 제한 등 브라우저 예외 상황은 무시
    }

    updatePostViewedStyle(postId, true);
}

function hasViewedPost(postId) {
    if (!postId) return false;
    return getViewedPostIdSet().has(String(postId));
}

function updatePostViewedStyle(postId, isViewed) {
    const postLink = document.querySelector(`.article-main[data-post-id="${postId}"]`);
    const articleItem = postLink?.closest('.article-item');
    if (!articleItem) return;

    articleItem.classList.toggle('article-item-viewed', isViewed);
    articleItem.classList.toggle('article-item-unviewed', !isViewed);
}

function syncViewedPostStyles() {
    const postLinks = document.querySelectorAll('.article-main[data-post-id]');
    postLinks.forEach((postLink) => {
        const postId = postLink.dataset.postId;
        updatePostViewedStyle(postId, hasViewedPost(postId));
    });
}

function isWithin12Hours(dateValue) {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;

    const diffInMs = Date.now() - date.getTime();
    const twelveHoursInMs = 12 * 60 * 60 * 1000;
    return diffInMs >= 0 && diffInMs < twelveHoursInMs;
}

function getPreviewText(post) {
    const source = post.preview || post.content || post.body || '';
    return String(source).replace(/\s+/g, ' ').trim().slice(0, 140) || '내용 미리보기가 없습니다.';
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 0) return;

    const blockSize = 10;
    const blockStart = Math.floor(currentPage / blockSize) * blockSize;
    const blockEnd = Math.min(blockStart + blockSize, totalPages);

    let html = '';
    for (let i = blockStart; i < blockEnd; i += 1) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<a href="#" class="page ${activeClass}" data-page="${i}">${i + 1}</a>`;
    }

    if (blockEnd < totalPages) {
        html += `<a href="#" class="page-nav" data-page="${blockEnd}">다음</a>`;
    }

    pagination.innerHTML = html;
    pagination.querySelectorAll('a[data-page]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const target = Number(link.dataset.page);
            if (!isLoading) loadPosts(target);
        });
    });
}


function initBoardTabs() {
    const tabsPanel = document.getElementById('board-tabs-panel');
    const toggleButton = document.getElementById('board-menu-toggle');
    const tabs = document.querySelectorAll('.board-tab');
    if (!tabs.length || !tabsPanel || !toggleButton) return;

    const closeTabsPanel = () => {
        hideElement(tabsPanel);
        toggleButton.setAttribute('aria-expanded', 'false');
    };

    toggleButton.addEventListener('click', () => {
        const isOpen = !tabsPanel.classList.contains('hidden');
        if (isOpen) {
            closeTabsPanel();
            return;
        }

        showElement(tabsPanel);
        toggleButton.setAttribute('aria-expanded', 'true');
    });

    document.addEventListener('click', (event) => {
        if (tabsPanel.classList.contains('hidden')) return;
        if (tabsPanel.contains(event.target) || toggleButton.contains(event.target)) return;
        closeTabsPanel();
    });

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            currentBoardType = tab.dataset.boardType || 'ALL';
            tabs.forEach((item) => item.classList.toggle('active', item === tab));
            closeTabsPanel();
            updateBestPostsVisibility();
            loadPosts(0);
        });
    });
}

function setupCommunityActions() {
    const communityActions = document.getElementById('community-actions');
    if (!communityActions) return;

    const user = Auth.getUser();
    if (user) {
        showElement(communityActions);
    } else {
        hideElement(communityActions);
    }
}
function initSearchEvents() {
    const searchForm = document.getElementById('search_frm');
    const searchTypeEl = document.getElementById('search-type');
    const searchKeywordEl = document.getElementById('search-keyword');
    const resetBtn = document.getElementById('search-reset-btn');

    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            searchState.searchType = searchTypeEl.value;
            searchState.keyword = searchKeywordEl.value.trim();
            loadPosts(0);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            searchState.searchType = 'bbs_title';
            searchState.keyword = '';
            searchTypeEl.value = 'bbs_title';
            searchKeywordEl.value = '';
            loadPosts(0);
        });
    }
}

function initCommonEvents() {
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.onclick = () => {
            if (!isLoading) loadPosts(currentPage);
        };
    }

    const postList = document.getElementById('post-list');
    if (postList) {
        postList.addEventListener('click', (event) => {
            const targetLink = event.target.closest('.article-main');
            if (!targetLink) return;

            const targetPostId = targetLink.dataset.postId;
            markPostAsViewed(targetPostId);
        });
    }

    window.addEventListener('pageshow', syncViewedPostStyles);
}

function showErrorBanner(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) errorMessage.textContent = message;
    showElement(errorBanner);
}

function showElement(element) {
    if (element) element.classList.remove('hidden');
}

function hideElement(element) {
    if (element) element.classList.add('hidden');
}

function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndexPage);
} else {
    initIndexPage();
}
