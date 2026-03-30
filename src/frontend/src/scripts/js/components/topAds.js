/**
 * 파일 역할: HOME/커뮤니티 상단 광고 배너(캐러셀) 로딩/렌더링을 담당하는 공통 컴포넌트 스크립트 파일.
 */
const TOP_AD_AUTOPLAY_INTERVAL_MS = 5000;
const topAdsState = {
    autoPlayTimerId: null
};

function initTopAds(options = {}) {
    const container = document.getElementById(options.containerId || 'top-ads-container');
    const placement = String(options.placement || container?.dataset.topAdPlacement || 'HOME').trim().toUpperCase();
    if (!container) return;

    loadTopAds(container, placement).catch((error) => {
        console.error('TOP ads load error:', error);
        container.classList.add('hidden');
    });
}

async function loadTopAds(container, placement) {
    const response = await APIClient.get('/live/top-ads', { placement });
    const ads = Array.isArray(response?.content) ? response.content : [];
    renderTopAds(container, ads);
}

function renderTopAds(container, ads = []) {
    clearTopAdsAutoPlay();

    if (!Array.isArray(ads) || !ads.length) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    const bannerItems = ads.map((ad, index) => {
        const imageUrl = sanitizeHTML(ad.imageUrl || '');
        const title = sanitizeHTML(ad.title || '상단 광고');
        const linkUrl = sanitizeHTML(normalizeTopAdExternalUrl(ad.linkUrl));
        return `
            <a class="top-ad-banner" href="${linkUrl}" target="_blank" rel="noopener noreferrer" draggable="false" role="group" aria-roledescription="slide" aria-label="${index + 1} / ${ads.length}: ${title}">
                <img class="top-ad-banner__image" src="${imageUrl}" alt="${title}" loading="${index === 0 ? 'eager' : 'lazy'}" draggable="false">
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div class="top-ads__viewport" tabindex="0" role="region" aria-roledescription="carousel" aria-label="상단 광고 목록">
            <div class="top-ads__track" role="list">
                ${bannerItems}
            </div>
        </div>
        <p class="top-ads__indicator" aria-live="polite">1/${ads.length}</p>
    `;

    bindTopAdsCarousel(container, ads.length);
}

function clearTopAdsAutoPlay() {
    if (!topAdsState.autoPlayTimerId) return;
    window.clearInterval(topAdsState.autoPlayTimerId);
    topAdsState.autoPlayTimerId = null;
}

function bindTopAdsCarousel(container, totalCount) {
    const viewport = container.querySelector('.top-ads__viewport');
    const indicator = container.querySelector('.top-ads__indicator');
    if (!viewport || !indicator) return;

    const getCurrentIndex = () => {
        const pageWidth = viewport.clientWidth || 1;
        return Math.min(totalCount - 1, Math.max(0, Math.round(viewport.scrollLeft / pageWidth)));
    };

    const updateIndicator = () => {
        indicator.textContent = `${getCurrentIndex() + 1}/${totalCount}`;
    };

    const moveToIndex = (nextIndex) => {
        const pageWidth = viewport.clientWidth;
        if (!pageWidth) return;
        const clampedIndex = Math.min(totalCount - 1, Math.max(0, nextIndex));
        viewport.scrollTo({
            left: clampedIndex * pageWidth,
            behavior: 'smooth'
        });
        window.requestAnimationFrame(updateIndicator);
    };

    const moveByStep = (step) => {
        const current = getCurrentIndex();
        const next = (current + step + totalCount) % totalCount;
        moveToIndex(next);
    };

    viewport.addEventListener('scroll', () => {
        window.requestAnimationFrame(updateIndicator);
    }, { passive: true });

    updateIndicator();

    if (totalCount <= 1) {
        return;
    }

    const restartAutoPlay = () => {
        clearTopAdsAutoPlay();
        topAdsState.autoPlayTimerId = window.setInterval(() => {
            if (document.hidden) return;
            moveByStep(1);
        }, TOP_AD_AUTOPLAY_INTERVAL_MS);
    };

    viewport.addEventListener('mouseenter', clearTopAdsAutoPlay);
    viewport.addEventListener('mouseleave', restartAutoPlay);
    viewport.addEventListener('focusin', clearTopAdsAutoPlay);
    viewport.addEventListener('focusout', restartAutoPlay);

    restartAutoPlay();
}

function isValidTopAdExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function normalizeTopAdExternalUrl(url) {
    const target = String(url || '').trim();
    return isValidTopAdExternalUrl(target) ? target : '#';
}

window.initTopAds = initTopAds;
