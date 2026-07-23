/**
 * 파일 역할: 업체정보 카드 UI를 여러 페이지에서 동일하게 렌더링하는 공용 컴포넌트 파일.
 */
(function () {
    const DEFAULT_IMAGE_URL = '/src/assets/image/ad-profile-default.webp';
    const NEW_BADGE_IMAGE_URL = '/src/assets/image/business-directory-new-badge.webp';
    const STAMP_EVENT_BADGE_IMAGE_URL = '/src/assets/image/business-directory-stamp-event-badge.webp';
    const PIECE_BADGE_IMAGE_URL = '/src/assets/image/business-directory-piece-badge.webp';

    function escapeHTML(value) {
        if (typeof sanitizeHTML === 'function') return sanitizeHTML(value);
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeBooleanFlag(value) {
        return value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true';
    }

    function normalizeAdPlan(plan) {
        const normalized = String(plan || '').trim().toLowerCase();
        if (['basic', 'plus', 'premium'].includes(normalized)) return normalized;
        if (normalized === 'normal') return 'basic';
        return '';
    }

    function getCumulativeAdDays(ad) {
        const days = Number(ad?.cumulativeAdDays ?? ad?.cumulative_ad_days ?? ad?.authorAdvertiserAdDays ?? 0);
        return Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
    }

    function resolveAdvertiserRankLabel(ad = {}) {
        const levels = [
            { emoji: '🌱', title: '미광고', minDays: 0 },
            { emoji: '🥉', title: '브론즈', minDays: 1 },
            { emoji: '🥈', title: '실버', minDays: 91 },
            { emoji: '🥇', title: '골드', minDays: 181 },
            { emoji: '💠', title: '플래티넘', minDays: 361 },
            { emoji: '💎', title: '다이아', minDays: 721 },
            { emoji: '👑', title: '레전드', minDays: 1441 }
        ];
        const explicit = String(ad?.authorAdvertiserLevelLabel || ad?.advertiserLevelLabel || '').trim();
        const explicitLevel = levels.find((level) => explicit.includes(level.emoji) || explicit.includes(level.title));
        if (explicitLevel) return explicitLevel.emoji;
        const cumulativeAdDays = getCumulativeAdDays(ad);
        return levels.reduce((current, level) => (cumulativeAdDays >= level.minDays ? level : current), levels[0]).emoji;
    }

    function buildAdvertiserMeta(ad = {}) {
        const rankLabel = resolveAdvertiserRankLabel(ad);
        const nickname = escapeHTML(ad.ownerNickname || ad.authorNickname || ad.nickname || ad.managerName || ad.profileManagerName || '닉네임');
        const cumulativeAdDays = getCumulativeAdDays(ad).toLocaleString('ko-KR');
        return `${rankLabel} <strong class="business-directory-manager-nickname">${nickname}</strong> · ${cumulativeAdDays}일째 광고중`;
    }

    function hasPieceAd(ad) {
        return normalizeBooleanFlag(ad?.isPieceActive || ad?.pieceIsActive || ad?.piece_is_active);
    }

    function hasStampUseEvent(ad) {
        const count = Number(ad?.stampEventCount || ad?.stamp_event_count || 0);
        return normalizeBooleanFlag(ad?.useStampEvent) && Number.isFinite(count) && count > 0;
    }

    function hasStampEvent(ad) {
        return normalizeBooleanFlag(ad?.useVisitVerification) || hasStampUseEvent(ad);
    }

    function buildTitle(ad) {
        const regionLabel = escapeHTML(ad.region || '지역미지정');
        const businessName = escapeHTML(ad.businessName || ad.companyName || ad.ownerNickname || '업소');
        const baseTitle = escapeHTML(ad.title || '업체정보');
        return `[${regionLabel}-${businessName}] ${baseTitle}`;
    }

    function buildDetail(ad) {
        const region = escapeHTML(ad.region || '지역미지정');
        const district = escapeHTML(ad.district || '선택');
        const category = escapeHTML(ad.category || '선택');
        const openHour = escapeHTML(ad.openHour || '시간선택');
        const closeHour = escapeHTML(ad.closeHour || '시간선택');
        const formattedTime = (openHour !== '시간선택' && closeHour !== '시간선택')
            ? `${openHour} ~ ${closeHour}`
            : '시간선택 ~ 시간선택';
        return `${region} ${district} · ${category} · ${formattedTime}`;
    }

    function render(ad = {}, options = {}) {
        const index = Number(options.index || 0);
        const title = buildTitle(ad);
        const detail = buildDetail(ad);
        const viewCount = Number(ad.viewCount || 0).toLocaleString('ko-KR');
        const uploadedImageUrl = escapeHTML(ad.imageUrl || '');
        const thumbnailImageUrl = uploadedImageUrl || DEFAULT_IMAGE_URL;
        const thumbnailLoading = uploadedImageUrl || index < 6 ? 'eager' : 'lazy';
        const thumbnailFetchPriority = uploadedImageUrl && index < 6 ? 'high' : 'auto';
        const planType = normalizeAdPlan(ad.planType || ad.adPlan || ad.plan || ad.businessAdPlan || ad.businessPlan);
        const planClassName = planType ? ` business-directory-item--${planType}` : '';
        const isNewAd = options.showNewBadge !== false && getCumulativeAdDays(ad) < 30;
        const showStampBadge = options.showStampEventBadge !== false && hasStampEvent(ad);
        const showPieceBadge = options.showPieceBadge !== false && hasPieceAd(ad);
        const itemClassName = escapeHTML(`business-directory-item business-directory-item--clickable${planClassName}${options.extraClassName ? ` ${options.extraClassName}` : ''}`);
        const itemAttributes = typeof options.attributes === 'function' ? options.attributes(ad, title) : String(options.attributes || '');
        const role = escapeHTML(options.role || 'link');
        const ariaLabel = escapeHTML(options.ariaLabel || `${title} 상세 페이지 보기`);

        return `
            <li class="${itemClassName}" ${itemAttributes} role="${role}" tabindex="0" aria-label="${ariaLabel}">
                <div class="business-directory-thumbnail-wrap">
                    <img class="business-directory-thumbnail" src="${thumbnailImageUrl}" alt="${title} 대표이미지" loading="${thumbnailLoading}" fetchpriority="${thumbnailFetchPriority}" decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE_URL}';">
                    ${isNewAd ? `<img class="business-directory-new-badge-image" src="${NEW_BADGE_IMAGE_URL}" alt="신규 광고" loading="eager" decoding="async">` : ''}
                </div>
                ${showStampBadge ? `<img class="business-directory-stamp-event-badge-image" src="${STAMP_EVENT_BADGE_IMAGE_URL}" alt="스탬프 이벤트 진행중" loading="eager" decoding="async">` : ''}
                ${showPieceBadge ? `<img class="business-directory-piece-badge-image${showStampBadge ? ' business-directory-piece-badge-image--right' : ''}" src="${PIECE_BADGE_IMAGE_URL}" alt="조각제휴 활성화" loading="eager" decoding="async">` : ''}
                <div class="business-directory-main">
                    <div class="business-directory-meta">
                        <span class="business-directory-manager">${buildAdvertiserMeta(ad)}</span>
                        <span class="business-directory-views" data-business-ad-view-count>조회수 ${viewCount}</span>
                    </div>
                    <h4>${title}</h4>
                    <p class="business-directory-region-detail">${detail}</p>
                </div>
            </li>`;
    }

    window.BusinessDirectoryItem = { render, normalizeAdPlan, getCumulativeAdDays, hasPieceAd, hasStampEvent };
}());
