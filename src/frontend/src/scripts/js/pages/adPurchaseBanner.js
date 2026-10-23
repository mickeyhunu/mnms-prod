/**
 * 파일 역할: ad-purchase 페이지 배너광고 탭에서 위치별(홈 상단/커뮤니티 상단/LIVE 하단) 월 경매 입찰·취소와 확정 순서 조회를 처리하는 스크립트 파일.
 * 배너 이미지/링크 설정은 배너광고 관리(/banner-ad-management) 페이지에서 한다.
 */
(() => {
    const section = document.getElementById('ad-banner-bid-section');
    const pageRoot = document.querySelector('.ad-management-container');
    const placementTabs = Array.from(document.querySelectorAll('#ad-banner-placement-tabs .ad-product-card'));
    const storeRow = document.getElementById('ad-banner-store-row');
    const storeLocationSelect = document.getElementById('ad-banner-store-location');
    const storeIndustrySelect = document.getElementById('ad-banner-store-industry');
    const storeSearchInput = document.getElementById('ad-banner-store-search');
    const storeList = document.getElementById('ad-banner-store-list');
    const storeSelectedText = document.getElementById('ad-banner-store-selected');
    const stampBalance = document.getElementById('ad-banner-stamp-balance');
    const auctionInfo = document.getElementById('ad-banner-auction-info');
    const bidBody = document.getElementById('ad-banner-bid-body');
    const benefitTitle = document.getElementById('ad-banner-benefit-title');
    const featureList = document.getElementById('ad-banner-features');
    const statusBadge = document.getElementById('ad-management-status-badge');
    const statusTitle = document.getElementById('ad-management-status-title');
    const startDate = document.getElementById('ad-management-start-date');
    const expireDate = document.getElementById('ad-management-expire-date');
    const remainingTime = document.getElementById('ad-management-remaining-time');

    if (!section || !pageRoot || !placementTabs.length || !bidBody) return;

    const PLACEMENTS = ['HOME', 'COMMUNITY', 'LIVE'];
    const BANNER_BADGES = {
        HOME: { image: '/src/assets/ad-plan-badges/home-banner-badge.png', alt: 'HOME' },
        COMMUNITY: { image: '/src/assets/ad-plan-badges/community-banner-badge.png', alt: 'COMMUNITY' },
        LIVE: { image: '/src/assets/ad-plan-badges/live-banner-badge.png', alt: 'LIVE' }
    };
    const NONE_BADGE_IMAGE = '/src/assets/ad-plan-badges/none-badge.png';
    // 서버 설정을 받기 전 기본값 (로딩 전 카드 표시용, 실제 값은 /users/me/banner-ads 응답의 placements)
    const DEFAULT_PLACEMENTS = {
        HOME: { code: 'HOME', label: '홈 상단', slotCount: 20, minBidStamps: 10 },
        COMMUNITY: { code: 'COMMUNITY', label: '커뮤니티 상단', slotCount: 20, minBidStamps: 15 },
        LIVE: { code: 'LIVE', label: 'LIVE 하단', slotCount: 10, minBidStamps: 20 }
    };
    const PLACEMENT_EXPOSURE_TEXT = {
        HOME: '홈 화면 최상단 슬라이드 배너에 노출 (5초마다 자동 전환)',
        COMMUNITY: '커뮤니티 게시판 상단 슬라이드 배너에 노출 (5초마다 자동 전환)',
        LIVE: '선택한 LIVE 매장 화면 하단 슬라이드 배너에 노출 (5초마다 자동 전환)'
    };
    const params = new URLSearchParams(window.location.search);
    const requestedPlacement = String(params.get('placement') || '').toUpperCase();
    const state = {
        placement: PLACEMENTS.includes(requestedPlacement) ? requestedPlacement : 'HOME',
        storeNo: Number.parseInt(params.get('storeNo') || '', 10) || null,
        data: null,
        isLoading: false,
        isSubmitting: false,
        placementConfigs: { ...DEFAULT_PLACEMENTS },
        exposedPlacements: [],
        // LIVE 매장 선택기 필터 (목록만 다시 그리고 서버 재조회는 매장을 고를 때만 한다)
        storeFilter: { location: '', industryCode: '', keyword: '' }
    };
    // LIVE 페이지와 같은 업종 노출 순서. 목록에 없는 업종은 뒤에 붙는다.
    const LIVE_INDUSTRY_ORDER = ['하이퍼블릭', '가라오케', '쩜오'];
    const STORE_GROUP_FALLBACK_LABEL = '기타';

    const formatKoreaDateTime = (value, options = {}) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, ...options });
    };
    // 마감/종료 시각(다음 날 00:00)은 사용자에게 "전날 23:59"로 보여준다.
    const formatEndMinute = (value) => formatKoreaDateTime(new Date(new Date(value).getTime() - 60 * 1000));
    const formatMonthLabel = (monthKey) => {
        const [year, month] = String(monthKey || '').split('-');
        return year && month ? `${year}년 ${Number(month)}월` : '-';
    };
    const formatRemaining = (value) => {
        const diff = new Date(value).getTime() - Date.now();
        if (!Number.isFinite(diff) || diff <= 0) return '';
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return days > 0 ? `${days}일 ${hours}시간 남음` : `${hours}시간 ${minutes}분 남음`;
    };
    const getSettingsUrl = () => `/banner-ad-management?placement=${state.placement}`;

    const renderStatusCard = (data) => {
        const banner = data.myCurrentBanner;
        const label = data.placement.label;
        if (statusBadge) {
            const badge = BANNER_BADGES[data.placement.code];
            statusBadge.src = banner && badge ? badge.image : NONE_BADGE_IMAGE;
            statusBadge.alt = banner && badge ? badge.alt : '미광고';
        }
        if (statusTitle) {
            statusTitle.textContent = banner
                ? `${label} 배너가 노출 중입니다 (${banner.finalRank}위)`
                : `이번 달 노출 중인 ${label} 배너가 없습니다`;
        }
        if (startDate) startDate.textContent = banner ? formatKoreaDateTime(data.currentPeriod.startAt) : '-';
        if (expireDate) expireDate.textContent = banner ? formatEndMinute(data.currentPeriod.endAt) : '-';
        if (remainingTime) remainingTime.textContent = banner ? formatRemaining(data.currentPeriod.endAt) : '활성화 대기 중';
    };

    const formatStampCount = (value) => `${Number(value || 0).toLocaleString('ko-KR')}개`;

    // 업체광고 탭의 '스탬프 정보'와 같은 카드 형태로 경매 입찰 정보를 보여준다.
    const renderAuctionInfo = (data) => {
        const { placement, myBid, upcoming } = data;
        const isBidding = upcoming.status === 'BIDDING';
        const storeName = placement.code === 'LIVE' ? data.stores.find((store) => store.storeNo === data.storeNo)?.storeName : '';
        if (stampBalance) stampBalance.textContent = formatStampCount(data.totalStamps);
        const items = [
            ['선택한 상품', `${placement.label} 배너${storeName ? ` (${sanitizeHTML(storeName)})` : ''}`],
            ['입찰 상태', isBidding ? '입찰 진행중' : '입찰 마감 · 노출순서 확정'],
            ['노출 기간', `${formatMonthLabel(upcoming.targetMonth)} 1일 ~ 말일`],
            ['입찰 마감', isBidding ? `${formatEndMinute(upcoming.bidCloseAt)}까지 (${formatRemaining(upcoming.bidCloseAt)})` : '마감됨'],
            ['최소 입찰', `스탬프 ${placement.minBidStamps}개`],
            ['노출 슬롯', `${placement.slotCount}개`],
            [isBidding ? '참여 업체' : '확정 업체', `${data.bidderCount}곳`],
            ['현재 커트라인', isBidding ? (data.cutoffBidStamps ? `스탬프 ${data.cutoffBidStamps}개` : '슬롯 여유 있음') : '-'],
            ['내 입찰', myBid ? `스탬프 ${myBid.bidStamps}개` : '미입찰'],
            [isBidding ? '내 예상 순위' : '내 확정 순위', data.expectedRank ? `${data.expectedRank}위` : '-'],
            // 이미 입찰한 경우 입찰가를 올릴 때 차액만 추가로 차감된다.
            [myBid ? '추가 차감 스탬프' : '차감 스탬프', '<span id="ad-banner-charge-stamps">-</span>'],
            ['사용후 잔여 스탬프', '<span id="ad-banner-stamps-after-use">-</span>']
        ];
        auctionInfo.innerHTML = items.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    };

    const renderCreativeStatus = (creative) => (creative?.imageUrl
        ? `<div class="banner-ad-creative-status">
                <div class="banner-ad-preview"><img src="${sanitizeHTML(creative.imageUrl)}" alt="${sanitizeHTML(creative.title || '배너 미리보기')}"></div>
                <a class="btn btn-outline btn-sm" href="${getSettingsUrl()}">배너 이미지·링크 변경</a>
            </div>`
        : `<div class="banner-ad-result banner-ad-result--lost">
                배너 이미지가 아직 설정되지 않았습니다. 입찰 전에 배너광고 관리에서 이미지와 링크를 설정해주세요.
                <a class="btn btn-outline btn-sm" href="${getSettingsUrl()}">배너 설정하러 가기</a>
            </div>`);

    const renderBidForm = (data) => {
        const { placement, myBid, creative } = data;
        if (!data.canBid) {
            return '<p class="banner-ad-empty">사업자정보 승인과 업체광고프로필 등록이 완료되어야 입찰할 수 있습니다. <a href="/ad-profile-management">업체광고프로필 관리로 이동</a></p>';
        }
        const nextMinBid = myBid ? myBid.bidStamps + 1 : placement.minBidStamps;
        const expectedRankText = data.expectedRank
            ? (data.expectedRank <= placement.slotCount
                ? `현재 ${data.expectedRank}위로 노출권 안에 있습니다.`
                : `현재 ${data.expectedRank}위로 노출권(${placement.slotCount}위) 밖입니다. 입찰가를 올려보세요.`)
            : '';
        const hasCreative = Boolean(creative?.imageUrl);
        return `
            ${renderCreativeStatus(creative)}
            ${expectedRankText ? `<p class="banner-ad-result">${expectedRankText}</p>` : ''}
            <div class="banner-ad-field">
                <label class="form-label" for="ad-banner-bid-stamps">${myBid ? '새 입찰 스탬프' : '입찰 스탬프'} <small>(최소 ${nextMinBid}개)</small></label>
                <input type="number" class="form-control" id="ad-banner-bid-stamps" min="${nextMinBid}" step="1" value="${nextMinBid}" inputmode="numeric" ${hasCreative ? '' : 'disabled'}>
            </div>
            <div class="ad-activation-action banner-ad-actions">
                <button type="button" class="ad-management-start-btn" id="ad-banner-bid-submit" ${hasCreative ? '' : 'disabled'}>⚡ <span id="ad-banner-bid-submit-count">${nextMinBid}</span> 스탬프${myBid ? '로 입찰가 올리기' : ' 사용하고 입찰하기'}</button>
                ${myBid ? '<button type="button" class="banner-ad-cancel-btn" id="ad-banner-bid-cancel">입찰 취소 (전액 환불)</button>' : ''}
            </div>
        `;
    };

    const renderConfirmedOrder = (data) => {
        const { myBid, placement } = data;
        const resultText = myBid?.status === 'WON'
            ? `<p class="banner-ad-result banner-ad-result--won">낙찰되었습니다. 노출 순서 <b>${myBid.finalRank}위</b> / ${placement.slotCount}슬롯</p>`
            : (myBid?.status === 'LOST' ? `<p class="banner-ad-result banner-ad-result--lost">미낙찰되어 입찰 스탬프 ${myBid.bidStamps}개가 환불되었습니다.</p>` : '');
        const list = data.confirmedOrder.length
            ? `<ol class="banner-ad-order">${data.confirmedOrder.map((item) => `
                <li class="${item.isMine ? 'is-mine' : ''}"><span>${item.rank}</span>${sanitizeHTML(item.businessName)}${item.isMine ? ' <b>(내 배너)</b>' : ''}</li>`).join('')}</ol>`
            : '<p class="banner-ad-empty">확정된 배너가 없습니다.</p>';
        const creativeHint = myBid?.status === 'WON' ? renderCreativeStatus(data.creative) : '';
        return `${resultText}${creativeHint}<h3 class="banner-ad-subtitle">확정 노출순서</h3>${list}`;
    };

    // 입찰 입력값에 맞춰 '차감 스탬프'·'사용후 잔여 스탬프'와 버튼 문구를 갱신한다. (입찰 기간이 아니면 '-')
    const updateBidChargeHelp = () => {
        const chargeText = document.getElementById('ad-banner-charge-stamps');
        const afterUseText = document.getElementById('ad-banner-stamps-after-use');
        const input = document.getElementById('ad-banner-bid-stamps');
        const submitCount = document.getElementById('ad-banner-bid-submit-count');
        if (!state.data || !chargeText || !afterUseText) return;
        if (!input) {
            chargeText.textContent = '-';
            afterUseText.textContent = '-';
            return;
        }
        const bidStamps = Number(input.value || 0);
        const charge = Math.max(0, bidStamps - (state.data.myBid?.bidStamps || 0));
        const balance = Number(state.data.totalStamps || 0);
        const previousBid = Number(state.data.myBid?.bidStamps || 0);
        chargeText.textContent = previousBid
            ? `스탬프 ${charge.toLocaleString('ko-KR')}개 (입찰가 ${previousBid.toLocaleString('ko-KR')}개 → ${bidStamps.toLocaleString('ko-KR')}개)`
            : `스탬프 ${charge.toLocaleString('ko-KR')}개`;
        afterUseText.textContent = charge > balance ? '스탬프 부족' : formatStampCount(balance - charge);
        afterUseText.classList.toggle('text-danger', charge > balance);
        if (submitCount) submitCount.textContent = bidStamps.toLocaleString('ko-KR');
    };

    const formatStoreGroupLabel = (value) => String(value || '').trim() || STORE_GROUP_FALLBACK_LABEL;
    const toOptionValue = (value) => sanitizeHTML(value).replace(/"/g, '&quot;');

    const getStoreIndustryCodes = (stores, location) => {
        const codes = [...new Set(stores.filter((store) => !location || store.location === location).map((store) => store.industryCode))];
        const getOrder = (code) => {
            const index = LIVE_INDUSTRY_ORDER.indexOf(code);
            return index === -1 ? LIVE_INDUSTRY_ORDER.length : index;
        };
        return codes
            .map((code, index) => ({ code, index }))
            .sort((a, b) => (getOrder(a.code) - getOrder(b.code)) || (a.index - b.index))
            .map(({ code }) => code);
    };

    // LIVE 매장 선택기: 지역·업종 선택과 이름 검색으로 목록을 좁히고 카드를 눌러 매장을 고른다.
    const renderStorePicker = () => {
        const stores = state.data?.stores || [];
        const filter = state.storeFilter;
        const locations = [...new Set(stores.map((store) => store.location))];
        if (filter.location && !locations.includes(filter.location)) filter.location = '';
        const industryCodes = getStoreIndustryCodes(stores, filter.location);
        if (filter.industryCode && !industryCodes.includes(filter.industryCode)) filter.industryCode = '';

        if (storeLocationSelect) {
            storeLocationSelect.innerHTML = ['<option value="">전체</option>', ...locations.map((location) => (
                `<option value="${toOptionValue(location)}" ${location === filter.location ? 'selected' : ''}>${sanitizeHTML(formatStoreGroupLabel(location))}</option>`
            ))].join('');
        }
        if (storeIndustrySelect) {
            storeIndustrySelect.innerHTML = ['<option value="">전체</option>', ...industryCodes.map((code) => (
                `<option value="${toOptionValue(code)}" ${code === filter.industryCode ? 'selected' : ''}>${sanitizeHTML(formatStoreGroupLabel(code))}</option>`
            ))].join('');
        }

        const selectedStore = stores.find((store) => store.storeNo === state.storeNo);
        if (storeSelectedText) storeSelectedText.textContent = `선택한 매장: ${selectedStore ? selectedStore.storeName : '-'}`;
        if (!storeList) return;

        const keyword = filter.keyword.trim().toLowerCase();
        const visibleStores = stores.filter((store) => (
            (!filter.location || store.location === filter.location)
            && (!filter.industryCode || store.industryCode === filter.industryCode)
            && (!keyword || store.storeName.toLowerCase().includes(keyword))
        ));
        if (!stores.length) {
            storeList.innerHTML = '<li class="banner-ad-store-empty">등록된 매장이 없습니다.</li>';
            return;
        }
        if (!visibleStores.length) {
            storeList.innerHTML = '<li class="banner-ad-store-empty">조건에 맞는 매장이 없습니다.</li>';
            return;
        }
        const bidByStoreNo = new Map((state.data?.myLiveBidStores || []).map((bid) => [bid.storeNo, bid]));
        storeList.innerHTML = visibleStores.map((store) => {
            const isSelected = store.storeNo === state.storeNo;
            const myBid = bidByStoreNo.get(store.storeNo);
            const bidLabel = myBid ? ({ BIDDING: '입찰중', WON: '낙찰', LOST: '미낙찰' }[myBid.status] || '') : '';
            return `
                <li class="banner-ad-store-option ${isSelected ? 'is-selected' : ''}" data-store-no="${store.storeNo}" role="option" aria-selected="${isSelected}" tabindex="0">
                    <span class="banner-ad-store-emoji" aria-hidden="true">${sanitizeHTML(store.storeEmoji || '🏠')}</span>
                    <span class="banner-ad-store-main">
                        <strong>${sanitizeHTML(store.storeName)}</strong>
                        <small>${sanitizeHTML(formatStoreGroupLabel(store.location))} · ${sanitizeHTML(formatStoreGroupLabel(store.industryCode))}</small>
                    </span>
                    ${bidLabel ? `<span class="banner-ad-store-bid ${myBid.status === 'WON' ? 'is-won' : ''}">${bidLabel} ${myBid.bidStamps}개</span>` : ''}
                    <span class="banner-ad-store-check" aria-hidden="true"></span>
                </li>
            `;
        }).join('');
    };

    const renderPlacementCards = () => {
        placementTabs.forEach((tab) => {
            const code = tab.dataset.bannerPlacement;
            const config = state.placementConfigs[code];
            const active = code === state.placement;
            const running = state.exposedPlacements.includes(code);
            tab.classList.toggle('is-active', active);
            tab.classList.toggle('is-running', running);
            tab.setAttribute('aria-selected', String(active));
            if (running) tab.setAttribute('aria-label', `${config.label} 배너, 현재 노출 중`);
            else tab.removeAttribute('aria-label');
            const cost = tab.querySelector('[data-banner-min-bid]');
            if (cost && config) cost.textContent = `${config.minBidStamps}스탬프 / 1개월`;
        });

        const config = state.placementConfigs[state.placement];
        if (benefitTitle) benefitTitle.textContent = `${config.label} 배너광고를 낙찰받으면`;
        if (featureList) {
            featureList.innerHTML = [
                PLACEMENT_EXPOSURE_TEXT[state.placement],
                `${state.placement === 'LIVE' ? '매장당 ' : ''}${config.slotCount}개 슬롯, 입찰 스탬프 순으로 노출 순서 결정`,
                `최소 ${config.minBidStamps}스탬프부터 입찰, 매월 1일~말일 한 달간 노출`,
                '입찰 스탬프가 같으면 먼저 입찰한 업체 우선',
                '미낙찰·입찰 취소 시 스탬프 전액 환불'
            ].map((text) => `<li class="is-enabled">${text}</li>`).join('');
        }
    };

    const render = () => {
        renderPlacementCards();
        storeRow.classList.toggle('hidden', state.placement !== 'LIVE');
        const data = state.data;
        if (!data) {
            if (statusTitle) statusTitle.textContent = '배너광고 정보를 확인하고 있습니다';
            [startDate, expireDate].forEach((element) => { if (element) element.textContent = '-'; });
            if (remainingTime) remainingTime.textContent = '정보 확인 중';
            return;
        }

        if (state.placement === 'LIVE') renderStorePicker();

        const isBidding = data.upcoming.status === 'BIDDING';

        renderStatusCard(data);
        renderAuctionInfo(data);
        bidBody.innerHTML = state.placement === 'LIVE' && !data.storeNo
            ? '<p class="banner-ad-empty">매장을 선택해주세요.</p>'
            : (isBidding ? renderBidForm(data) : renderConfirmedOrder(data));
        updateBidChargeHelp();
    };

    const load = async () => {
        state.isLoading = true;
        try {
            const query = { placement: state.placement };
            if (state.placement === 'LIVE' && state.storeNo) query.storeNo = state.storeNo;
            const response = await APIClient.get('/users/me/banner-ads', query);
            state.data = response?.content || null;
            state.storeNo = state.data?.storeNo || null;
            if (Array.isArray(state.data?.placements)) {
                state.placementConfigs = Object.fromEntries(state.data.placements.map((placement) => [placement.code, placement]));
            }
            state.exposedPlacements = Array.isArray(state.data?.exposedPlacements) ? state.data.exposedPlacements : [];
            render();
        } finally {
            state.isLoading = false;
        }
    };

    const reload = () => load().catch((error) => {
        bidBody.innerHTML = '';
        alert(error.message || '배너광고 입찰 정보를 불러오지 못했습니다.');
    });

    const notifyStampsChanged = (totalStamps) => {
        if (totalStamps == null) return;
        pageRoot.dispatchEvent(new CustomEvent('ad-purchase:stamps-changed', { detail: { totalStamps } }));
    };

    const withSubmitting = async (task) => {
        if (state.isSubmitting) return;
        state.isSubmitting = true;
        section.querySelectorAll('button').forEach((button) => { button.disabled = true; });
        try {
            await task();
        } catch (error) {
            alert(error.message || '요청을 처리하지 못했습니다.');
            render();
        } finally {
            state.isSubmitting = false;
            section.querySelectorAll('#ad-banner-placement-tabs .ad-product-card, #ad-banner-bid-cancel').forEach((button) => { button.disabled = false; });
        }
    };

    const submitBid = () => withSubmitting(async () => {
        const data = state.data;
        const bidStamps = Number(document.getElementById('ad-banner-bid-stamps')?.value || 0);
        const charge = Math.max(0, bidStamps - (data.myBid?.bidStamps || 0));
        if (!window.confirm(`${formatMonthLabel(data.upcoming.targetMonth)} ${data.placement.label} 배너에 ${bidStamps}스탬프로 입찰합니다.\n지금 ${charge}스탬프가 차감되며, 미낙찰 시 전액 환불됩니다.`)) {
            render();
            return;
        }
        const response = await APIClient.put('/users/me/banner-ads/bid', {
            placement: state.placement,
            storeNo: state.placement === 'LIVE' ? data.storeNo : null,
            bidStamps
        });
        alert(response?.message || '입찰이 완료되었습니다.');
        notifyStampsChanged(response?.totalStamps);
        await load();
    });

    const cancelBid = () => withSubmitting(async () => {
        if (!window.confirm('입찰을 취소하고 스탬프를 환불받을까요? 다시 입찰하면 입찰 시각이 새로 기록됩니다.')) {
            render();
            return;
        }
        const response = await APIClient.delete('/users/me/banner-ads/bid', {
            placement: state.placement,
            storeNo: state.placement === 'LIVE' ? state.data.storeNo : null
        });
        alert(response?.message || '입찰이 취소되었습니다.');
        notifyStampsChanged(response?.totalStamps);
        await load();
    });

    storeList?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const option = event.target instanceof Element ? event.target.closest('[data-store-no]') : null;
        if (!option) return;
        event.preventDefault();
        option.click();
    });

    placementTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            if (state.placement === tab.dataset.bannerPlacement) return;
            state.placement = tab.dataset.bannerPlacement;
            state.data = null;
            bidBody.innerHTML = '<div class="loading">로딩 중...</div>';
            auctionInfo.innerHTML = '';
            if (stampBalance) stampBalance.textContent = '확인 중...';
            render();
            reload();
        });
    });

    storeLocationSelect?.addEventListener('change', () => {
        state.storeFilter.location = storeLocationSelect.value;
        state.storeFilter.industryCode = '';
        renderStorePicker();
    });

    storeIndustrySelect?.addEventListener('change', () => {
        state.storeFilter.industryCode = storeIndustrySelect.value;
        renderStorePicker();
    });

    storeSearchInput?.addEventListener('input', () => {
        state.storeFilter.keyword = storeSearchInput.value;
        renderStorePicker();
    });

    storeList?.addEventListener('click', (event) => {
        const option = event.target instanceof Element ? event.target.closest('[data-store-no]') : null;
        if (!option || state.isSubmitting) return;
        const storeNo = Number.parseInt(option.dataset.storeNo, 10);
        if (!Number.isInteger(storeNo) || storeNo === state.storeNo) return;
        state.storeNo = storeNo;
        renderStorePicker();
        bidBody.innerHTML = '<div class="loading">로딩 중...</div>';
        reload();
    });

    section.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.id === 'ad-banner-bid-submit') submitBid();
        else if (target.id === 'ad-banner-bid-cancel') cancelBid();
    });

    section.addEventListener('input', (event) => {
        if (event.target?.id === 'ad-banner-bid-stamps') updateBidChargeHelp();
    });

    // adPurchase.js 가 배너광고 탭을 열 때 호출한다. 첫 진입 시에만 불러오고 이후엔 상태 카드만 다시 그린다.
    window.AdPurchaseBanner = {
        show() {
            if (state.data) {
                render();
                return;
            }
            if (!state.isLoading) {
                render();
                reload();
            }
        }
    };
})();
