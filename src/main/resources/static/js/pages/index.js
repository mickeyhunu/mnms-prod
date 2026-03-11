let currentPage = 0;
let totalPages = 0;
let isLoading = false;
const pageSize = 20;
const searchState = {
    searchType: 'bbs_title',
    keyword: ''
};

async function initIndexPage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') {
        initHeader();
    }

    setupCommunityActions();
    initSearchEvents();
    await loadPosts(0);
    initCommonEvents();
}

async function loadPosts(page = 0) {
    if (isLoading) return;

    const loading = document.getElementById('loading');
    const postListContainer = document.getElementById('post-list');
    const noticeArea = document.getElementById('notice-area');
    const errorBanner = document.getElementById('error-banner');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination');

    try {
        isLoading = true;

        showElement(loading);
        hideElement(errorBanner);
        hideElement(emptyState);
        hideElement(pagination);

        const response = searchState.keyword
            ? await APIClient.get(`/search/posts?keyword=${encodeURIComponent(searchState.keyword)}&search=${encodeURIComponent(searchState.searchType)}&page=${page}&size=${pageSize}`)
            : await PostAPI.getPosts({ page, size: pageSize });

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
            renderPostList(posts, postListContainer, noticeArea);
            updatePagination();
            showElement(pagination);
        } else {
            noticeArea.innerHTML = '';
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

function renderPostList(posts, container, noticeArea) {
    if (!container) return;

    const notices = posts.filter((post) => isNoticePost(post));
    const normalPosts = posts.filter((post) => !isNoticePost(post));

    noticeArea.innerHTML = notices
        .map((post) => `
            <div class="notice-item">
                <a href="post-detail.html?id=${post.id}">
                    <span class="badge">공지</span>
                    <span>${sanitizeHTML(post.title || '제목 없음')}</span>
                </a>
            </div>
        `)
        .join('');

    container.innerHTML = normalPosts
        .map((post) => createArticleItem(post))
        .join('');
}

function isNoticePost(post) {
    const title = String(post?.title || '').toLowerCase();
    const category = String(post?.category || post?.type || '').toLowerCase();
    const authorRole = String(post?.authorRole || '').toUpperCase();

    return Boolean(
        post?.isAdminPost
        || post?.adminPost
        || authorRole === 'ADMIN'
        || category.includes('공지')
        || category.includes('필독')
        || title.includes('[공지]')
        || title.includes('[필독]')
    );
}

function createArticleItem(post) {
    const createdAt = formatDate(post.createdAt);
    const commentCount = Number(post.commentCount || 0);
    const viewCount = Number(post.viewCount || 0);
    const recommendCount = Number(post.likeCount || post.recommendCount || 0);
    const previewText = sanitizeHTML(getPreviewText(post));
    const authorName = sanitizeHTML(post.authorNickname || '익명');
    const authorBadge = sanitizeHTML(post.authorRole === 'ADMIN' ? '관리자' : authorName);
    const categoryTag = post.category && !isNoticePost(post)
        ? `<span class="article-tag">${sanitizeHTML(post.category)}</span>`
        : '';
    const isNewPost = post.isNew || post.newPost;

    return `
        <li class="article-item">
            <a class="article-main" href="post-detail.html?id=${post.id}">
                <div class="article-title-row">
                    <span class="article-inline-icon" aria-hidden="true">💬</span>
                    <h3 class="article-title">${sanitizeHTML(post.title || '제목 없음')}</h3>
                    ${isNewPost ? '<span class="article-new-badge">NEW</span>' : ''}
                    <span class="article-comment-inline">[${commentCount}]</span>
                    <span class="article-mobile-badge">M</span>
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
