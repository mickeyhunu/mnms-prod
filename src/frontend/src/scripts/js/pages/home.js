/**
 * 파일 역할: home 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
function initHomePage() {
    Auth.updateHeaderUI();
    Auth.bindLogoutButton();

    const bamcheatMenu = document.getElementById('bamcheat-service-item');
    if (bamcheatMenu) {
        const currentUser = Auth.getUser();
        const canUseBamcheat = Auth.isBusinessAccount(currentUser) || Auth.isAdminAccount(currentUser);
        bamcheatMenu.classList.toggle('hidden', !canUseBamcheat);
    }
    if (typeof initTopAds === 'function') {
        initTopAds({
            containerId: 'top-ads-container',
            placement: 'HOME'
        });
    }
    initHomePosters();
    initHomePreviews();
}

async function initHomePreviews() {
    await Promise.allSettled([
        loadHomeBusinessPreview(),
        loadHomeLivePreview(),
        loadHomeCommunityPreview(),
        loadHomeBestPosts()
    ]);
}

function renderHomePreviewStatus(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        const tagName = container.tagName === 'UL' ? 'li' : 'p';
        container.innerHTML = `<${tagName} class="home-preview-status">${sanitizeHTML(message)}</${tagName}>`;
    }
}

function openHomeBusinessPreview(item) {
    const detailUrl = item?.dataset?.businessAdUrl;
    if (detailUrl) window.location.href = detailUrl;
}

function bindHomeBusinessPreviewNavigation(container) {
    if (container.dataset.navigationBound === 'true') return;
    container.dataset.navigationBound = 'true';
    container.addEventListener('click', (event) => {
        const item = event.target.closest('.business-directory-item[data-business-ad-url]');
        if (item && container.contains(item)) openHomeBusinessPreview(item);
    });
    container.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const item = event.target.closest('.business-directory-item[data-business-ad-url]');
        if (!item || !container.contains(item)) return;
        event.preventDefault();
        openHomeBusinessPreview(item);
    });
}

async function loadHomeBusinessPreview() {
    const container = document.getElementById('home-business-preview-list');
    if (!container) return;
    bindHomeBusinessPreviewNavigation(container);
    try {
        const response = await APIClient.get('/live/business-ads');
        const ads = Array.isArray(response?.content) ? response.content.slice(0, 4) : [];
        if (!ads.length) return renderHomePreviewStatus(container.id, '현재 노출 중인 업체정보가 없습니다.');
        container.innerHTML = ads.map((ad, index) => {
            const detailPath = createBusinessInfoDetailPath(ad);
            return BusinessDirectoryItem.render(ad, {
                index,
                attributes: (item) => `data-business-ad-id="${sanitizeHTML(item.id || '')}" data-business-ad-url="${sanitizeHTML(detailPath)}" data-business-ad-view-count="${Number(item.viewCount || 0)}"`
            });
        }).join('');
    } catch (error) {
        renderHomePreviewStatus(container.id, '업체정보를 불러오지 못했습니다.');
    }
}

function getHomeLiveRowText(row, candidates) {
    const key = candidates.find((candidate) => row?.[candidate] !== undefined && row[candidate] !== null && String(row[candidate]).trim());
    return key ? String(row[key]).trim() : '';
}

const HOME_LIVE_CATEGORIES = [
    { key: 'choice', label: '초톡' },
    { key: 'chojoong', label: '초중' },
    { key: 'waiting', label: '룸/웨이팅' },
    { key: 'entry', label: '엔트리' }
];

function getHomeLiveStoreKey(row) {
    const storeNo = getHomeLiveRowText(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']);
    if (storeNo) return `no:${storeNo}`;
    const storeName = getHomeLiveRowText(row, ['storeName', 'store_name', 'shopName', 'shop_name', 'branchName', 'branch_name']);
    return storeName ? `name:${storeName}` : '';
}

function getHomeLiveSummary(categoryKey, rows) {
    if (!rows.length) return '업데이트 없음';
    const latest = rows[rows.length - 1];
    if (categoryKey === 'choice') {
        return getHomeLiveRowText(latest, ['choiceMsg', 'choice_msg', 'message', 'msg', 'content']) || '초톡 업데이트';
    }
    if (categoryKey === 'chojoong') {
        return getHomeLiveRowText(latest, ['chojoongMsg', 'chojoong_msg', 'message', 'msg', 'content']) || '초중 업데이트';
    }
    if (categoryKey === 'waiting') {
        const room = getHomeLiveRowText(latest, ['roomInfo', 'room_info']);
        const waiting = getHomeLiveRowText(latest, ['waitInfo', 'wait_info', 'waitingInfo', 'waiting_info']);
        return `방수 : ${room || 0} · 웨이팅 : ${waiting || 0}`;
    }

    return `총 출근인원 ${rows.length}명`;
}

function bindHomeLiveScroller(container) {
    const previousButton = document.getElementById('home-live-scroll-prev');
    const nextButton = document.getElementById('home-live-scroll-next');
    if (!previousButton || !nextButton) return;

    const updateButtons = () => {
        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
        previousButton.disabled = container.scrollLeft <= 4;
        nextButton.disabled = container.scrollLeft >= maxScrollLeft - 4;
    };
    const move = (direction) => container.scrollBy({ left: direction * container.clientWidth, behavior: 'smooth' });
    previousButton.onclick = () => move(-1);
    nextButton.onclick = () => move(1);
    container.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    window.requestAnimationFrame(updateButtons);
}

async function loadHomeLivePreview() {
    const container = document.getElementById('home-live-preview-list');
    if (!container) return;
    try {
        const filters = await APIClient.get('/live/filters');
        const stores = Array.isArray(filters?.stores) ? filters.stores : [];
        if (!stores.length) return renderHomePreviewStatus(container.id, '등록된 LIVE 정보가 없습니다.');

        const categoryResponses = await Promise.all(HOME_LIVE_CATEGORIES.map(({ key }) =>
            APIClient.get('/live/entries', { category: key, limit: 300 })
        ));
        const rowsByCategoryAndStore = new Map();
        HOME_LIVE_CATEGORIES.forEach(({ key }, index) => {
            const rows = Array.isArray(categoryResponses[index]?.rows) ? categoryResponses[index].rows : [];
            rows.forEach((row) => {
                const storeKey = getHomeLiveStoreKey(row);
                if (!storeKey) return;
                const mapKey = `${key}|${storeKey}`;
                if (!rowsByCategoryAndStore.has(mapKey)) rowsByCategoryAndStore.set(mapKey, []);
                rowsByCategoryAndStore.get(mapKey).push(row);
            });
        });

        container.innerHTML = stores.map((store) => {
            const storeNo = Number(store.storeNo);
            const storeKey = Number.isInteger(storeNo) && storeNo > 0 ? `no:${storeNo}` : `name:${store.storeName}`;
            const items = HOME_LIVE_CATEGORIES.map(({ key, label }) => {
                const summary = getHomeLiveSummary(key, rowsByCategoryAndStore.get(`${key}|${storeKey}`) || []);
                return `<li><span>${sanitizeHTML(label)}</span><strong>${sanitizeHTML(summary)}</strong></li>`;
            }).join('');
            const storeName = store.storeName || '가게';
            const avatarLabel = Array.from(storeName.trim())[0] || '가';
            return `<a class="home-live-store-card" href="live.html" aria-label="${sanitizeHTML(store.storeName)} LIVE 정보 보기">
                <span class="home-live-store-card__heading">
                    <span class="home-live-store-card__avatar" aria-hidden="true"><span class="live-chat-card__avatar-fallback">${sanitizeHTML(avatarLabel)}</span></span>
                    <strong>${sanitizeHTML(storeName)}</strong><small>최신 LIVE</small>
                </span>
                <ul>${items}</ul>
                <span class="home-live-store-card__more">상세 정보 보기 <span aria-hidden="true">→</span></span>
            </a>`;
        }).join('');
        bindHomeLiveScroller(container);
    } catch (error) {
        renderHomePreviewStatus(container.id, 'LIVE 정보를 불러오지 못했습니다.');
    }
}

async function loadHomeCommunityPreview() {
    const container = document.getElementById('home-community-preview-list');
    if (!container) return;
    try {
        const response = await APIClient.get('/api/posts', {
            page: 0,
            size: 5,
            boardType: 'ALL',
            excludeAdminAuthors: true
        });
        const posts = Array.isArray(response?.content) ? response.content.slice(0, 5) : [];
        if (!posts.length) return renderHomePreviewStatus(container.id, '등록된 커뮤니티 게시글이 없습니다.');
        container.innerHTML = posts.map(renderHomeCommunityArticle).join('');
    } catch (error) {
        renderHomePreviewStatus(container.id, '커뮤니티 게시글을 불러오지 못했습니다.');
    }
}

function renderHomeCommunityArticle(post) {
    const boardLabel = HOME_BOARD_LABELS[String(post.boardType || '').toUpperCase()]
        || post.boardTypeLabel
        || post.boardType
        || '커뮤니티';
    const href = post.url || createPostDetailPath(post);
    const commentCount = Number(post.commentCount || 0);
    const viewCount = Number(post.viewCount || 0).toLocaleString('ko-KR');
    const recommendCount = Number(post.likeCount || post.recommendCount || 0).toLocaleString('ko-KR');
    const previewText = getCommunityPostPreviewText(post);
    const authorLevel = Number(post.authorLevel ?? post.level ?? post.authorRank ?? post.rank);
    const authorBadge = Number.isInteger(authorLevel) && authorLevel > 0
        ? ` <img class="user-level-badge" src="/src/assets/lv-badges/lv${authorLevel}.png" alt="회원 등급 배지" loading="lazy">`
        : '';
    let isViewed = false;
    try {
        const viewedPostIds = JSON.parse(localStorage.getItem('communityViewedPostIds') || '[]');
        isViewed = Array.isArray(viewedPostIds) && viewedPostIds.map(String).includes(String(post.id));
    } catch (error) {
        isViewed = false;
    }

    return `<li class="article-item ${isViewed ? 'article-item-viewed' : 'article-item-unviewed'}">
        <a class="article-main" href="${sanitizeHTML(href)}" data-post-id="${sanitizeHTML(post.id)}">
            <div class="article-title-row">
                <span class="article-inline-icon" aria-hidden="true">💬</span>
                <h3 class="article-title"><span class="article-board-label">[${sanitizeHTML(boardLabel)}]</span> ${sanitizeHTML(post.title || '제목 없음')}</h3>
                <span class="article-comment-inline">[${commentCount}]</span>
            </div>
            <p class="article-preview">${sanitizeHTML(previewText || '내용 미리보기가 없습니다.')}</p>
            <div class="article-meta">
                <span>${sanitizeHTML(post.authorNickname || '익명')}${authorBadge}</span>
                <span>${sanitizeHTML(formatDate(post.createdAt))}</span>
                <span>조회수 : ${viewCount}</span>
                <span class="article-recommend">추천수 : ${recommendCount}</span>
            </div>
        </a>
        <div class="article-side"></div>
    </li>`;
}

const HOME_BOARD_LABELS = {
    FREE: '자유', ANON: '익명', REVIEW: '후기', STORY: '썰', PIECE: '조각',
    ATTENDANCE: '출석', QUESTION: '질문', EVENT: '이벤트', PROMOTION: '홍보'
};

function renderHomeBestPosts(posts, list, empty) {
    if (!Array.isArray(posts) || !posts.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = posts.map((post, index) => {
        const boardLabel = HOME_BOARD_LABELS[String(post.boardType || '').toUpperCase()] || '자유';
        const href = post.url || createPostDetailPath(post);
        return `<li class="best-post-item">
            <a class="best-post-link" href="${sanitizeHTML(href)}">
                <span class="best-post-rank">${index + 1}</span>
                <span class="best-post-text">[${sanitizeHTML(boardLabel)}] ${sanitizeHTML(post.title || '제목 없음')}</span>
                <span class="best-post-meta">👍 ${Number(post.likeCount || 0)} · 💬 ${Number(post.commentCount || 0)} · 👁 ${Number(post.viewCount || 0)}</span>
            </a>
        </li>`;
    }).join('');
}

async function loadHomeBestPosts() {
    const dailyList = document.getElementById('home-daily-best-list');
    const weeklyList = document.getElementById('home-weekly-best-list');
    const dailyEmpty = document.getElementById('home-daily-best-empty');
    const weeklyEmpty = document.getElementById('home-weekly-best-empty');
    if (!dailyList || !weeklyList || !dailyEmpty || !weeklyEmpty) return;

    try {
        const response = await APIClient.get('/api/posts/best');
        renderHomeBestPosts(response?.daily, dailyList, dailyEmpty);
        renderHomeBestPosts(response?.weekly, weeklyList, weeklyEmpty);
    } catch (error) {
        [dailyList, weeklyList].forEach((list) => { list.innerHTML = ''; });
        [dailyEmpty, weeklyEmpty].forEach((empty) => {
            empty.textContent = '베스트 게시글을 불러오지 못했습니다.';
            empty.classList.remove('hidden');
        });
    }
}

const HOME_POSTER_DISMISS_KEY = 'homePosterDismissedUntil';

async function initHomePosters() {
    try {
        const response = await APIClient.get('/posters');
        const posters = (response.content || []).filter((poster) => !isPosterDismissedToday(poster.id));
        showHomePosters(posters);
    } catch (error) {
        console.warn('홈 포스터를 불러오지 못했습니다.', error);
    }
}

function isPosterDismissedToday(posterId) {
    try {
        const dismissed = JSON.parse(window.localStorage.getItem(HOME_POSTER_DISMISS_KEY) || '{}');
        return dismissed[String(posterId)] === getLocalDateKey();
    } catch (error) { return false; }
}

function dismissPosterToday(posterId) {
    let dismissed = {};
    try { dismissed = JSON.parse(window.localStorage.getItem(HOME_POSTER_DISMISS_KEY) || '{}'); } catch (error) { dismissed = {}; }
    dismissed[String(posterId)] = getLocalDateKey();
    window.localStorage.setItem(HOME_POSTER_DISMISS_KEY, JSON.stringify(dismissed));
}

function getLocalDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function showHomePosters(posters) {
    if (!posters.length) return;

    const workspace = document.createElement('div');
    workspace.className = 'home-poster-workspace';
    workspace.setAttribute('aria-label', '알림 포스터');

    posters.forEach((poster, index) => {
        const popup = document.createElement('section');
        popup.className = 'home-poster-popup';
        popup.setAttribute('data-poster-drag', '');
        setHomePosterStackOffset(popup, index);
        // Later siblings are painted on top by default, so explicitly keep the
        // first (lowest displayOrder) poster in the foreground.
        popup.style.zIndex = String(posters.length - index);
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', poster.title || '안내 포스터');
        const image = `<img class="home-poster-popup__image" src="${sanitizeHTML(poster.imageUrl)}" alt="${sanitizeHTML(poster.title || '안내 포스터')}">`;
        const linkedImage = poster.targetUrl
            ? `<a class="home-poster-popup__link" href="${sanitizeHTML(poster.targetUrl)}">${image}</a>`
            : image;
        popup.innerHTML = `<header class="home-poster-popup__titlebar"><span>${sanitizeHTML(poster.title || '안내 포스터')}</span><button class="home-poster-popup__close" type="button" data-poster-close aria-label="창닫기">&times;</button></header>${linkedImage}<div class="home-poster-popup__actions"><button type="button" data-poster-today>오늘 하루 보지 않기</button><button type="button" data-poster-close>창닫기</button></div>`;

        const close = (dismissToday = false) => {
            if (dismissToday) dismissPosterToday(poster.id);
            popup.remove();
            if (!workspace.children.length) {
                workspace.remove();
                return;
            }
            [...workspace.children].forEach((remainingPopup, index) => {
                if (!remainingPopup.classList.contains('is-positioned')) {
                    setHomePosterStackOffset(remainingPopup, index);
                }
            });
        };
        popup.querySelector('[data-poster-today]').addEventListener('click', () => close(true));
        popup.querySelectorAll('[data-poster-close]').forEach((button) => {
            button.addEventListener('click', () => close(false));
        });
        bindHomePosterDrag(popup);
        workspace.appendChild(popup);
    });

    document.body.appendChild(workspace);
}

function setHomePosterStackOffset(popup, index) {
    popup.style.setProperty('--poster-stack-offset', `${index * 32}px`);
    popup.style.setProperty('--poster-stack-offset-mobile', `${index * 18}px`);
}

function bindHomePosterDrag(popup) {
    const handle = popup;
    const DRAG_START_DISTANCE = 6;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let activePointerId = null;
    let didDrag = false;

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('button')) return;
        const rect = popup.getBoundingClientRect();
        activePointerId = event.pointerId;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;
        didDrag = false;
    });

    handle.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointerId) return;

        if (!didDrag) {
            const distance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
            if (distance < DRAG_START_DISTANCE) return;

            didDrag = true;
            handle.setPointerCapture(event.pointerId);
            const rect = popup.getBoundingClientRect();
            // Repositioning the popup on pointerdown detaches a clicked link from
            // the document and cancels its click in Safari and desktop browsers.
            // Only change the DOM after the pointer has actually started dragging.
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.top}px`;
            popup.style.width = `${rect.width}px`;
            popup.classList.add('is-positioned', 'is-dragging');
            const siblingZIndexes = [...(popup.parentElement?.children || [])]
                .map((element) => Number(element.style.zIndex) || 0);
            popup.style.zIndex = String(Math.max(0, ...siblingZIndexes) + 1);
            popup.parentElement?.appendChild(popup);
        }

        event.preventDefault();
        const maxLeft = Math.max(8, window.innerWidth - popup.offsetWidth - 8);
        const maxTop = Math.max(8, window.innerHeight - popup.offsetHeight - 8);
        popup.style.left = `${Math.min(Math.max(8, event.clientX - dragOffsetX), maxLeft)}px`;
        popup.style.top = `${Math.min(Math.max(8, event.clientY - dragOffsetY), maxTop)}px`;
    });

    const stopDragging = (event) => {
        if (event.pointerId !== activePointerId) return;
        popup.classList.remove('is-dragging');
        activePointerId = null;
        if (event.type === 'pointercancel') {
            didDrag = false;
        } else if (didDrag) {
            window.setTimeout(() => { didDrag = false; }, 0);
        }
    };
    handle.addEventListener('pointerup', stopDragging);
    handle.addEventListener('pointercancel', stopDragging);

    handle.addEventListener('click', (event) => {
        if (!didDrag) return;
        event.preventDefault();
        event.stopPropagation();
        didDrag = false;
    }, true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}
