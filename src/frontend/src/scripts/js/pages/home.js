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
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('button')) return;
        const rect = popup.getBoundingClientRect();
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.top}px`;
        popup.style.width = `${rect.width}px`;
        popup.classList.add('is-positioned', 'is-dragging');
        const siblingZIndexes = [...(popup.parentElement?.children || [])]
            .map((element) => Number(element.style.zIndex) || 0);
        popup.style.zIndex = String(Math.max(0, ...siblingZIndexes) + 1);
        popup.parentElement?.appendChild(popup);
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    handle.addEventListener('pointermove', (event) => {
        if (!popup.classList.contains('is-dragging')) return;
        const maxLeft = Math.max(8, window.innerWidth - popup.offsetWidth - 8);
        const maxTop = Math.max(8, window.innerHeight - popup.offsetHeight - 8);
        popup.style.left = `${Math.min(Math.max(8, event.clientX - dragOffsetX), maxLeft)}px`;
        popup.style.top = `${Math.min(Math.max(8, event.clientY - dragOffsetY), maxTop)}px`;
    });

    const stopDragging = () => popup.classList.remove('is-dragging');
    handle.addEventListener('pointerup', stopDragging);
    handle.addEventListener('pointercancel', stopDragging);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}
