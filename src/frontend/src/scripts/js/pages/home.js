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
        showNextHomePoster(posters);
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

function showNextHomePoster(posters) {
    const poster = posters.shift();
    if (!poster) return;
    const modal = document.createElement('div');
    modal.className = 'home-poster-modal';
    modal.innerHTML = `<div class="home-poster-modal__backdrop"></div><section class="home-poster-modal__panel" role="dialog" aria-modal="true" aria-label="${sanitizeHTML(poster.title || '안내 포스터')}"><img class="home-poster-modal__image" src="${sanitizeHTML(poster.imageUrl)}" alt="${sanitizeHTML(poster.title || '안내 포스터')}"><div class="home-poster-modal__actions"><button type="button" data-poster-today>오늘 하루 보지 않기</button><button type="button" data-poster-close>창닫기</button></div></section>`;
    const close = (dismissToday = false) => { if (dismissToday) dismissPosterToday(poster.id); modal.remove(); showNextHomePoster(posters); };
    modal.querySelector('[data-poster-today]').addEventListener('click', () => close(true));
    modal.querySelector('[data-poster-close]').addEventListener('click', () => close(false));
    modal.querySelector('.home-poster-modal__backdrop').addEventListener('click', () => close(false));
    document.body.appendChild(modal);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}
