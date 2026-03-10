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

    const notices = posts.slice(0, 2);
    const normalPosts = posts.slice(2);

    noticeArea.innerHTML = notices
        .map((post) => `
            <div class="notice-item">
                <a href="post-detail.html?id=${post.id}">
                    <span class="badge">필독</span>
                    <span>${sanitizeHTML(post.title || '제목 없음')}</span>
                </a>
            </div>
        `)
        .join('');

    container.innerHTML = normalPosts
        .map((post) => createArticleItem(post))
        .join('');
}

function createArticleItem(post) {
    const createdAt = formatDate(post.createdAt);
    const commentCount = Number(post.commentCount || 0);
    const likeCount = Number(post.likeCount || 0);
    const thumb = post.imageUrl
        ? `<img class="article-thumb" src="${sanitizeHTML(post.imageUrl)}" alt="썸네일" loading="lazy">`
        : '';

    return `
        <li class="article-item">
            <a class="article-main" href="post-detail.html?id=${post.id}">
                <div class="article-content">
                    <h3 class="article-title">${sanitizeHTML(post.title || '제목 없음')}</h3>
                    <div class="article-meta">
                        <span>${sanitizeHTML(post.authorNickname || '익명')}</span>
                        <span>${createdAt}</span>
                        <span>좋아요 ${likeCount}</span>
                    </div>
                </div>
                ${thumb}
            </a>
            <div class="article-comment">댓글 ${commentCount}</div>
        </li>
    `;
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
