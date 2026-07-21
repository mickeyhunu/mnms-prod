/**
 * 파일 역할: index 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let currentPage = 0;
let totalPages = 0;
let isLoading = false;
const pageSize = 20;
const VIEWED_POST_IDS_STORAGE_KEY = 'communityViewedPostIds';
const PIECE_TEMPLATE_START = '<!-- PIECE_TEMPLATE_START -->';
const PIECE_TEMPLATE_END = '<!-- PIECE_TEMPLATE_END -->';
let viewedPostIdSetCache = null;
let viewedPostSyncPromise = null;
const pendingViewedPostIds = new Set();
let flushViewedPostTimerId = null;
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
    updateBestPostsVisibility();
    initCommonEvents();
    syncViewedPostsFromServer();
    if (typeof initTopAds === 'function') {
        initTopAds({
            containerId: 'top-ads-container',
            placement: 'COMMUNITY'
        });
    }

    const postsPromise = loadPosts(0);
    loadBestPosts().catch(() => {
        // 베스트 게시글은 개별적으로 실패 처리하므로 초기 게시글 로딩을 막지 않는다.
    });

    await postsPromise;
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
                <a class="best-post-link" href="${createPostDetailPath(post)}">
                    <span class="best-post-rank">${index + 1}</span>
                    <span class="best-post-text">[${sanitizeHTML(getBoardLabel(post.boardType))}] ${sanitizeHTML(post.title || '제목 없음')}</span>
                    <span class="best-post-meta">👍 ${likeCount} · 💬 ${commentCount} · 👁 ${viewCount}</span>
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
        PIECE: '조각',
        ATTENDANCE: '출석',
        QUESTION: '질문',
        EVENT: '이벤트',
        PROMOTION: '홍보'
    };

    return boardMap[String(boardType || '').toUpperCase()] || '자유';
}


function resolveAuthorLevelBadgeImage(level) {
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel) || numericLevel <= 0) {
        return '';
    }

    const normalizedLevel = Math.min(7, Math.max(1, Math.floor(numericLevel)));
    return `/src/assets/lv-badges/lv${normalizedLevel}.png`;
}

function isBusinessAuthor(post = {}) {
    const normalizedRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    const normalizedMemberType = String(
        post?.authorMemberType
        || post?.author_member_type
        || post?.memberType
        || post?.member_type
        || post?.accountType
        || ''
    ).toUpperCase();

    return normalizedRole === 'BUSINESS' || normalizedMemberType === 'BUSINESS' || Boolean(post?.authorIsBusiness);
}


function resolveAdvertiserRankLabel(source = {}) {
    const levels = [
        { emoji: '🌱', title: '미광고', minDays: 0 },
        { emoji: '🥉', title: '브론즈', minDays: 1 },
        { emoji: '🥈', title: '실버', minDays: 91 },
        { emoji: '🥇', title: '골드', minDays: 181 },
        { emoji: '💠', title: '플래티넘', minDays: 361 },
        { emoji: '💎', title: '다이아', minDays: 721 },
        { emoji: '👑', title: '레전드', minDays: 1441 }
    ];

    const explicit = String(source?.authorAdvertiserLevelLabel || source?.advertiserLevelLabel || '').trim();
    const explicitLevel = levels.find((level) => explicit.includes(level.emoji) || explicit.includes(level.title));
    if (explicitLevel) return explicitLevel.emoji;

    const days = Number(source?.authorAdvertiserAdDays ?? source?.cumulativeAdDays ?? 0);
    const normalizedDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
    return levels.reduce((current, level) => (normalizedDays >= level.minDays ? level : current), levels[0]).emoji;
}

function normalizeBusinessAdPlan(plan) {
    const normalized = String(plan || '').trim().toLowerCase();
    if (['basic', 'plus', 'premium', 'banner'].includes(normalized)) return normalized;
    if (normalized === 'normal') return 'basic';
    return '';
}

function resolveBusinessAuthorBadgeImage(post = {}) {
    if (!isBusinessAuthor(post)) return '';

    const adPlan = normalizeBusinessAdPlan(
        post?.authorAdPlan
        || post?.authorPlanType
        || post?.planType
        || post?.adPlan
        || post?.plan
        || post?.businessAdPlan
        || post?.businessPlan
    );
    if (adPlan) return `/src/assets/ad-plan-badges/${adPlan}-badge.png`;

    return Boolean(post?.authorHasActiveBusinessAd || post?.hasActiveBusinessAd)
        ? '/src/assets/ad-plan-badges/premium-badge.png'
        : '/src/assets/ad-plan-badges/none-badge.png';
}

function getAuthorGradeBadgeMarkup(post = {}) {
    const normalizedRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    if (normalizedRole === 'ADMIN') {
        return ' <img class="user-level-badge" src="/src/assets/lv-badges/admin.png" alt="관리자 배지" loading="lazy">';
    }

    if (isBusinessAuthor(post)) {
        return ` <span class="user-level-badge">${sanitizeHTML(resolveAdvertiserRankLabel(post))}</span>`;
    }

    const badgeImage = resolveAuthorLevelBadgeImage(post?.authorLevel ?? post?.level ?? post?.authorRank ?? post?.rank ?? post?.authorGrade ?? post?.grade);
    return badgeImage
        ? ` <img class="user-level-badge" src="${badgeImage}" alt="회원 등급 배지" loading="lazy">`
        : '';
}

function createArticleItem(post) {
    const createdAt = formatDate(post.createdAt);
    const commentCount = Number(post.commentCount || 0);
    const viewCount = Number(post.viewCount || 0);
    const previewText = sanitizeHTML(getPreviewText(post));
    const currentUser = Auth.getUser();
    const isAdminViewer = String(currentUser?.role || '').toUpperCase() === 'ADMIN';
    const authorName = sanitizeHTML(post.boardType === 'ANON' && !isAdminViewer ? '익명' : (post.authorNickname || '익명'));
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
    const authorBadge = `${authorName}${getAuthorGradeBadgeMarkup(post)}`;
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
    const hasPhotoAttachment = hasPostImageAttachment(post);
    const photoBadge = hasPhotoAttachment
        ? '<span class="article-photo-badge" role="img" aria-label="사진 첨부">📷</span>'
        : '';
    const inlineIcon = getArticleInlineIcon(post, isNoticePost);
    const sourceType = String(post.sourceType || '').toUpperCase();
    const articleHref = sourceType === 'SUPPORT'
        ? `/support?articleId=${encodeURIComponent(post.sourceId || post.id)}&sourceType=SUPPORT`
        : createPostDetailPath(post);
    const commentInlineMarkup = isNoticePost
        ? ''
        : `<span class="article-comment-inline">[${commentCount}]</span>`;
    const recommendMarkup = isNoticePost
        ? ''
        : `<span class="article-recommend">추천수 : ${Number(post.likeCount || post.recommendCount || 0)}</span>`;
    const pieceStatusMarkup = getPieceStatusBadgeMarkup(post);

    return `
        <li class="article-item ${isViewedPost ? 'article-item-viewed' : 'article-item-unviewed'} ${isNoticePost ? 'article-item-notice' : ''} ${isNoticePost && noticeType === 'IMPORTANT' ? 'article-item-important' : ''}">
            <a class="article-main" href="${articleHref}" data-post-id="${post.id}">
                <div class="article-title-row">
                    <span class="article-inline-icon" aria-hidden="true">${inlineIcon}</span>
                    <h3 class="article-title"><span class="${boardLabelClass}">[${boardLabel}]</span> ${sanitizeHTML(post.title || '제목 없음')} ${photoBadge}</h3>
                    ${commentInlineMarkup}
                    ${shouldShowNewBadge ? '<span class="article-new-badge">NEW</span>' : ''}
                    ${pieceStatusMarkup}
                </div>
                <p class="article-preview">${previewText}</p>
                <div class="article-meta">
                    <span>${authorBadge}</span>
                    <span>${createdAt}</span>
                    <span>조회수 : ${viewCount}</span>
                    ${recommendMarkup}
                </div>
            </a>
            <div class="article-side">
                ${categoryTag}
            </div>
        </li>
    `;
}


function getArticleInlineIcon(post, isNoticePost) {
    if (isNoticePost) {
        return '📢';
    }

    const authorRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    const authorMemberType = String(post?.authorMemberType || post?.memberType || post?.member_type || '').toUpperCase();

    if (authorRole === 'BUSINESS' || authorMemberType === 'BUSINESS') {
        return '🎯';
    }

    return '💬';
}

function hasPostImageAttachment(post) {
    const imageUrls = post?.imageUrls;
    if (Array.isArray(imageUrls)) {
        return imageUrls.some((url) => typeof url === 'string' && url.trim().length > 0);
    }

    if (typeof imageUrls === 'string') {
        const trimmed = imageUrls.trim();
        if (!trimmed) return false;

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.some((url) => typeof url === 'string' && url.trim().length > 0);
            }
        } catch (error) {
            // JSON 문자열이 아니라면 단일 URL 문자열로 간주
        }

        return true;
    }

    if (typeof post?.imageUrl === 'string') {
        return post.imageUrl.trim().length > 0;
    }

    return false;
}

function getViewedPostIdSet() {
    if (viewedPostIdSetCache) {
        return viewedPostIdSetCache;
    }

    try {
        const raw = localStorage.getItem(VIEWED_POST_IDS_STORAGE_KEY);
        const parsed = JSON.parse(raw || '[]');
        if (!Array.isArray(parsed)) {
            viewedPostIdSetCache = new Set();
            return viewedPostIdSetCache;
        }
        viewedPostIdSetCache = new Set(parsed.map((id) => String(id)));
        return viewedPostIdSetCache;
    } catch (error) {
        viewedPostIdSetCache = new Set();
        return viewedPostIdSetCache;
    }
}

function markPostAsViewed(postId) {
    if (!postId) return;

    const viewedPostIds = getViewedPostIdSet();
    viewedPostIds.add(String(postId));

    persistViewedPostIds(viewedPostIds);
    enqueueViewedPostSync(postId);

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

function persistViewedPostIds(viewedPostIds) {
    try {
        localStorage.setItem(VIEWED_POST_IDS_STORAGE_KEY, JSON.stringify([...viewedPostIds]));
    } catch (error) {
        // localStorage 접근 제한 등 브라우저 예외 상황은 무시
    }
}

async function syncViewedPostsFromServer() {
    if (!Auth.isAuthenticated()) return;
    if (viewedPostSyncPromise) return viewedPostSyncPromise;

    viewedPostSyncPromise = (async () => {
        try {
            const response = await APIClient.get('/users/me/posts/read', { limit: 500 });
            const remoteIds = Array.isArray(response?.content) ? response.content : [];
            if (!remoteIds.length) return;

            const viewedPostIds = getViewedPostIdSet();
            remoteIds.forEach((postId) => {
                if (postId) viewedPostIds.add(String(postId));
            });
            persistViewedPostIds(viewedPostIds);
            syncViewedPostStyles();
        } catch (error) {
            console.error('Failed to sync read posts:', error);
        }
    })().finally(() => {
        viewedPostSyncPromise = null;
    });

    return viewedPostSyncPromise;
}

function enqueueViewedPostSync(postId) {
    if (!Auth.isAuthenticated() || !postId) return;
    pendingViewedPostIds.add(Number(postId));

    if (flushViewedPostTimerId) return;
    flushViewedPostTimerId = window.setTimeout(() => {
        flushViewedPostTimerId = null;
        flushViewedPostsToServer();
    }, 300);
}

async function flushViewedPostsToServer() {
    if (!Auth.isAuthenticated() || !pendingViewedPostIds.size) return;

    const postIds = [...pendingViewedPostIds]
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);
    pendingViewedPostIds.clear();

    if (!postIds.length) return;

    try {
        await APIClient.post('/users/me/posts/read', { postIds });
    } catch (error) {
        console.error('Failed to persist read posts:', error);
    }
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
    const source = stripPieceTemplateFromPreview(post.preview || post.content || post.body || '');
    const firstLine = String(source)
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .find(Boolean);

    return firstLine?.slice(0, 140) || '내용 미리보기가 없습니다.';
}

function stripPieceTemplateFromPreview(content) {
    const rawContent = String(content || '');
    const startIndex = rawContent.indexOf(PIECE_TEMPLATE_START);
    const endIndex = rawContent.indexOf(PIECE_TEMPLATE_END);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return rawContent.trim();
    }

    return `${rawContent.slice(0, startIndex)}${rawContent.slice(endIndex + PIECE_TEMPLATE_END.length)}`.trim();
}

function parsePieceTemplateRows(content) {
    const rawContent = String(content || '');
    const startIndex = rawContent.indexOf(PIECE_TEMPLATE_START);
    const endIndex = rawContent.indexOf(PIECE_TEMPLATE_END);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return new Map();

    const templateContent = rawContent.slice(startIndex + PIECE_TEMPLATE_START.length, endIndex);
    return templateContent.split(/\r?\n/).reduce((rows, line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine.includes(':')) return rows;

        const [label, ...valueParts] = trimmedLine.split(':');
        const normalizedLabel = label.trim();
        const value = valueParts.join(':').trim();
        if (normalizedLabel && value) rows.set(normalizedLabel, value);
        return rows;
    }, new Map());
}

function parsePieceDateTime(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;

    const normalizedValue = rawValue
        .replace(/(년|\.)\s*/g, '-')
        .replace(/월\s*/g, '-')
        .replace(/일\s*/g, ' ')
        .replace(/시\s*/g, ':')
        .replace(/분\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const date = new Date(normalizedValue.includes('T') ? normalizedValue : normalizedValue.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePieceStatusValue(value) {
    const normalizedValue = String(value || '').trim().toUpperCase();
    if (!normalizedValue) return '';
    if (['모집완료', '모집 완료', '진행', 'ONGOING', 'IN_PROGRESS'].some((token) => normalizedValue.includes(token))) return '진행중';
    if (['종료', '마감', '완료', 'ENDED', 'CLOSED', 'DONE'].some((token) => normalizedValue.includes(token))) return '종료';
    if (['모집', 'RECRUITING', 'OPEN'].some((token) => normalizedValue.includes(token))) return '모집중';
    return '';
}

function resolvePieceStatus(post) {
    if (String(post?.boardType || '').toUpperCase() !== 'PIECE') return '';

    const explicitStatus = normalizePieceStatusValue(
        post?.pieceStatus
        || post?.piece_status
        || post?.meetingStatus
        || post?.meeting_status
        || post?.recruitmentStatus
        || post?.recruitment_status
    );
    if (explicitStatus) return explicitStatus;

    const pieceRows = parsePieceTemplateRows(post.content || post.body || '');
    const templateStatus = normalizePieceStatusValue(
        pieceRows.get('상태')
        || pieceRows.get('모집 상태')
        || pieceRows.get('진행 상태')
    );
    if (templateStatus) return templateStatus;

    const dateTime = parsePieceDateTime(pieceRows.get('날짜/시간') || pieceRows.get('일정') || pieceRows.get('만남 시간'));
    if (dateTime && dateTime.getTime() <= Date.now()) return '종료';

    return '모집중';
}

function getPieceMaximumParticipantCount(content) {
    const rawContent = String(content || '');
    const maxMatch = rawContent.match(/^\s*최대 인원\s*:\s*(\d+)/m);
    if (maxMatch) return Math.max(1, Number(maxMatch[1]) || 1);

    const summaryMaxMatch = rawContent.match(/최대\s*(\d+)명/);
    return summaryMaxMatch ? Math.max(1, Number(summaryMaxMatch[1]) || 1) : 1;
}

function getPieceCurrentParticipantCount(post) {
    if (String(post?.boardType || '').toUpperCase() !== 'PIECE') return 0;

    const additionalParticipants = Number(
        post?.pieceParticipantCount
        || post?.piece_participant_count
        || post?.participantCount
        || post?.participant_count
        || 0
    );
    return 1 + Math.max(0, Number.isFinite(additionalParticipants) ? Math.floor(additionalParticipants) : 0);
}

function getPieceStatusBadgeMarkup(post) {
    const status = resolvePieceStatus(post);
    if (!status) return '';

    const statusClassMap = {
        모집중: 'article-piece-status-recruiting',
        진행중: 'article-piece-status-ongoing',
        종료: 'article-piece-status-ended'
    };
    const statusClass = statusClassMap[status] || 'article-piece-status-recruiting';
    const currentParticipants = getPieceCurrentParticipantCount(post);
    const maxParticipants = getPieceMaximumParticipantCount(post?.content || post?.body || '');
    const participantText = `${currentParticipants} / ${maxParticipants}`;
    return `<span class="article-piece-status ${statusClass}">${sanitizeHTML(participantText)} ${sanitizeHTML(status)}</span>`;
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination || totalPages <= 0) return;

    const blockSize = 10;
    const blockStart = Math.floor(currentPage / blockSize) * blockSize;
    const blockEnd = Math.min(blockStart + blockSize, totalPages);

    let html = '';
    if (blockStart > 0) {
        html += `<a href="#" class="page-nav page-nav-prev" data-page="${blockStart - 1}">이전</a>`;
    }

    for (let i = blockStart; i < blockEnd; i += 1) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<a href="#" class="page ${activeClass}" data-page="${i}">${i + 1}</a>`;
    }

    if (blockEnd < totalPages) {
        html += `<a href="#" class="page-nav page-nav-next" data-page="${blockEnd}">다음</a>`;
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
            setupCommunityActions();
            updateBestPostsVisibility();
            loadPosts(0);
        });
    });
}

function setupCommunityActions() {
    const communityActions = document.getElementById('community-actions');
    if (!communityActions) return;

    const user = Auth.getUser();
    const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN' || Boolean(user?.isAdmin);
    const canWrite = Boolean(user) && (currentBoardType !== 'EVENT' || isAdmin);

    if (canWrite) {
        showElement(communityActions);
    } else {
        hideElement(communityActions);
    }
}
function initSearchEvents() {
    const searchForm = document.getElementById('search_frm');
    const searchTypeEl = document.getElementById('search-type');
    const searchKeywordEl = document.getElementById('search-keyword');

    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            searchState.searchType = searchTypeEl.value;
            searchState.keyword = searchKeywordEl.value.trim();
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

            if (!Auth.isAuthenticated()) {
                event.preventDefault();
                redirectToLoginForPostAccess();
                return;
            }

            const targetPostId = targetLink.dataset.postId;
            markPostAsViewed(targetPostId);
        });
    }

    const bestPostsSection = document.querySelector('.best-posts-section');
    if (bestPostsSection) {
        bestPostsSection.addEventListener('click', (event) => {
            const bestPostLink = event.target.closest('.best-post-link');
            if (!bestPostLink) return;

            if (!Auth.isAuthenticated()) {
                event.preventDefault();
                redirectToLoginForPostAccess();
            }
        });
    }

    window.addEventListener('pageshow', syncViewedPostStyles);
    window.addEventListener('beforeunload', flushViewedPostsToServer);
}

function redirectToLoginForPostAccess() {
    alert('로그인 후 게시글을 볼 수 있습니다.');
    window.location.href = '/login';
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
