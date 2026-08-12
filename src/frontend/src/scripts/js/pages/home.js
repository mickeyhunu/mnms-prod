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
        loadHomeCommunityPreview()
    ]);
}

function renderHomePreviewStatus(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = `<p class="home-preview-status">${sanitizeHTML(message)}</p>`;
}

async function loadHomeBusinessPreview() {
    const container = document.getElementById('home-business-preview-list');
    if (!container) return;
    try {
        const response = await APIClient.get('/live/business-ads');
        const ads = Array.isArray(response?.content) ? response.content.slice(0, 4) : [];
        if (!ads.length) return renderHomePreviewStatus(container.id, '현재 노출 중인 업체정보가 없습니다.');
        container.innerHTML = ads.map((ad) => {
            const detailPath = createBusinessInfoDetailPath(ad);
            const imageUrl = ad.imageUrl || '/src/assets/image/ad-profile-default.webp';
            return `<a class="home-business-preview" href="${sanitizeHTML(detailPath)}">
                <img src="${sanitizeHTML(imageUrl)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/src/assets/image/ad-profile-default.webp';">
                <span class="home-business-preview__copy"><strong>${sanitizeHTML(ad.businessName || ad.companyName || ad.title || '업체정보')}</strong><small>${sanitizeHTML([ad.region, ad.district, ad.category].filter(Boolean).join(' · ') || '상세정보 보기')}</small></span>
                <span class="home-preview-chevron" aria-hidden="true">›</span>
            </a>`;
        }).join('');
    } catch (error) {
        renderHomePreviewStatus(container.id, '업체정보를 불러오지 못했습니다.');
    }
}

function getHomeLiveRowText(row, candidates) {
    const key = candidates.find((candidate) => row?.[candidate] !== undefined && row[candidate] !== null && String(row[candidate]).trim());
    return key ? String(row[key]).trim() : '';
}

async function loadHomeLivePreview() {
    const container = document.getElementById('home-live-preview-list');
    if (!container) return;
    try {
        const response = await APIClient.get('/live/entries', { category: 'room', limit: 4 });
        const rows = Array.isArray(response?.rows) ? response.rows.slice(0, 4) : [];
        if (!rows.length) return renderHomePreviewStatus(container.id, '등록된 LIVE 정보가 없습니다.');
        container.innerHTML = rows.map((row, index) => {
            const title = getHomeLiveRowText(row, [response?.titleColumn, 'title', 'name', 'roomName', 'room_name']) || `LIVE 정보 ${index + 1}`;
            const store = getHomeLiveRowText(row, ['storeName', 'store_name', 'shopName', 'shop_name']);
            const description = getHomeLiveRowText(row, ['content', 'message', 'status', 'memo', 'description']);
            return `<a class="home-text-preview" href="live.html">
                <span class="home-text-preview__badge">LIVE</span>
                <span class="home-text-preview__copy"><strong>${sanitizeHTML(title)}</strong><small>${sanitizeHTML([store, description].filter(Boolean).join(' · ') || '실시간 현황을 확인해 보세요.')}</small></span>
                <span class="home-preview-chevron" aria-hidden="true">›</span>
            </a>`;
        }).join('');
    } catch (error) {
        renderHomePreviewStatus(container.id, 'LIVE 정보를 불러오지 못했습니다.');
    }
}

async function loadHomeCommunityPreview() {
    const container = document.getElementById('home-community-preview-list');
    if (!container) return;
    try {
        const response = await APIClient.get('/api/posts', { page: 0, size: 5, boardType: 'ALL' });
        const posts = Array.isArray(response?.content) ? response.content.slice(0, 5) : [];
        if (!posts.length) return renderHomePreviewStatus(container.id, '등록된 커뮤니티 게시글이 없습니다.');
        container.innerHTML = posts.map((post) => `<a class="home-text-preview" href="${sanitizeHTML(post.url || `/post-detail.html?id=${post.id}`)}">
            <span class="home-community-category">${sanitizeHTML(post.boardTypeLabel || post.boardType || '커뮤니티')}</span>
            <span class="home-text-preview__copy"><strong>${sanitizeHTML(post.title || '제목 없음')}</strong><small>${sanitizeHTML(post.authorNickname || '익명')} · 조회 ${Number(post.viewCount || 0).toLocaleString('ko-KR')}</small></span>
            <span class="home-preview-chevron" aria-hidden="true">›</span>
        </a>`).join('');
    } catch (error) {
        renderHomePreviewStatus(container.id, '커뮤니티 게시글을 불러오지 못했습니다.');
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
