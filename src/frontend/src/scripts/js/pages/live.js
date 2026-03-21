/**
 * 파일 역할: LIVE 페이지의 필터/목록 렌더링과 이벤트를 초기화하는 페이지 스크립트 파일.
 */
const LIVE_CATEGORIES = {
    choice: { key: 'choice', label: '초이스톡' },
    waiting: { key: 'waiting', label: '룸/웨이팅' },
    entry: { key: 'entry', label: '엔트리' }
};

const LIVE_FILTERS_CACHE_KEY = 'liveFiltersCache:v1';
const LIVE_ENTRIES_CACHE_PREFIX = 'liveEntriesCache:v1:';
const LIVE_REFRESH_INTERVAL_MS = 30000;

const liveState = {
    stores: [],
    categories: [],
    selectedStoreNo: null,
    selectedCategoryKey: 'choice',
    refreshTimerId: null,
    entriesRequestId: 0,
    filtersRequestId: 0,
    hasBoundEvents: false,
    hasCachedEntries: false
};

function initializeScrollableFilter(element) {
    if (!element || element.dataset.scrollCueBound === 'true') return;

    const updateScrollState = () => {
        window.requestAnimationFrame(() => {
            syncScrollableFilterState(element);
        });
    };

    element.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    element.dataset.scrollCueBound = 'true';
}

function syncScrollableFilterState(element) {
    if (!element) return;

    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    const scrollLeft = Math.max(0, element.scrollLeft);
    const hasOverflow = maxScrollLeft > 4;
    const canScrollLeft = scrollLeft > 4;
    const canScrollRight = scrollLeft < maxScrollLeft - 4;

    element.classList.toggle('has-overflow', hasOverflow);
    element.classList.toggle('can-scroll-left', hasOverflow && canScrollLeft);
    element.classList.toggle('can-scroll-right', hasOverflow && canScrollRight);
}

async function initLivePage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') {
        initHeader();
    }

    bindLiveEvents();
    hydrateLiveFiltersCache();
    hydrateLiveEntriesCache();
    startLiveAutoRefresh();

    try {
        await refreshLiveData({ showLoading: true });
    } catch (error) {
        if (!liveState.hasCachedEntries) {
            showLiveError(error.message || 'LIVE 데이터를 불러오지 못했습니다.');
        }
    }
}

function bindLiveEvents() {
    if (liveState.hasBoundEvents) return;

    const storeFilter = document.getElementById('live-store-filter');
    const categoryFilter = document.getElementById('live-category-filter');

    initializeScrollableFilter(storeFilter);
    initializeScrollableFilter(categoryFilter);

    storeFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-store-option]');
        if (!button) return;

        const nextStoreNo = Number.parseInt(button.dataset.storeOption || '', 10);
        if (!Number.isInteger(nextStoreNo) || liveState.selectedStoreNo === nextStoreNo) return;

        liveState.selectedStoreNo = nextStoreNo;
        renderStoreButtons();
        hydrateLiveEntriesCache();
        await loadLiveEntries({ showLoading: true });
    });

    categoryFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-category-option]');
        if (!button) return;

        const nextCategoryKey = button.dataset.categoryOption || 'choice';
        if (liveState.selectedCategoryKey === nextCategoryKey) return;

        liveState.selectedCategoryKey = nextCategoryKey;
        renderCategoryButtons(liveState.categories);
        hydrateLiveEntriesCache();
        await loadLiveEntries({ showLoading: true });
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshLiveData({ showLoading: false }).catch((error) => {
                console.error('LIVE visibility refresh error:', error);
            });
        }
    });

    liveState.hasBoundEvents = true;
}

function startLiveAutoRefresh() {
    if (liveState.refreshTimerId) {
        clearInterval(liveState.refreshTimerId);
    }

    liveState.refreshTimerId = window.setInterval(() => {
        if (document.hidden) return;

        refreshLiveData({ showLoading: false }).catch((error) => {
            console.error('LIVE auto refresh error:', error);
        });
    }, LIVE_REFRESH_INTERVAL_MS);
}

async function refreshLiveData({ showLoading = false } = {}) {
    await loadLiveFilters();
    await loadLiveEntries({ showLoading });
}

function hydrateLiveFiltersCache() {
    const cachedFilters = readLiveCache(LIVE_FILTERS_CACHE_KEY);
    if (!cachedFilters?.data) {
        renderStoreNameList();
        renderCategoryButtons([]);
        return false;
    }

    liveState.stores = normalizeStores(cachedFilters.data.stores);
    liveState.categories = Array.isArray(cachedFilters.data.categories) ? cachedFilters.data.categories : [];
    syncSelectedStoreNo();

    renderStoreNameList();
    renderStoreButtons();
    renderCategoryButtons(liveState.categories);
    return true;
}

function hydrateLiveEntriesCache() {
    const cacheKey = getLiveEntriesCacheKey();
    const cachedEntries = readLiveCache(cacheKey);
    if (!cachedEntries?.data) {
        liveState.hasCachedEntries = false;
        renderLiveSummary();

        const listElement = document.getElementById('live-entry-list');
        const emptyElement = document.getElementById('live-empty');

        if (listElement) {
            listElement.innerHTML = '';
        }

        hideElement(emptyElement);
        return false;
    }

    liveState.hasCachedEntries = true;
    applyLiveEntriesResponse(cachedEntries.data);
    return true;
}

async function loadLiveFilters() {
    const requestId = ++liveState.filtersRequestId;
    const response = await APIClient.get('/live/filters');

    if (requestId !== liveState.filtersRequestId) {
        return;
    }

    liveState.stores = normalizeStores(response?.stores);
    liveState.categories = Array.isArray(response?.categories) ? response.categories : [];
    syncSelectedStoreNo();

    writeLiveCache(LIVE_FILTERS_CACHE_KEY, {
        stores: liveState.stores,
        categories: liveState.categories
    });

    renderStoreNameList();
    renderStoreButtons();
    renderCategoryButtons(liveState.categories);
}

async function loadLiveEntries({ showLoading = false } = {}) {
    const loadingElement = document.getElementById('live-loading');
    const errorElement = document.getElementById('live-error');
    const emptyElement = document.getElementById('live-empty');
    const listElement = document.getElementById('live-entry-list');
    const requestId = ++liveState.entriesRequestId;

    hideElement(errorElement);

    if (showLoading) {
        hideElement(emptyElement);
        showElement(loadingElement);
    } else {
        hideElement(loadingElement);
    }

    try {
        const response = await APIClient.get('/live/entries', {
            category: liveState.selectedCategoryKey,
            storeNo: liveState.selectedStoreNo,
            limit: liveState.selectedCategoryKey === 'entry' ? 200 : 30
        });

        if (requestId !== liveState.entriesRequestId) {
            return;
        }

        writeLiveCache(getLiveEntriesCacheKey(), response);
        liveState.hasCachedEntries = true;
        applyLiveEntriesResponse(response);
    } catch (error) {
        if (requestId !== liveState.entriesRequestId) {
            return;
        }

        if (!listElement?.children.length) {
            renderLiveEntries([], null);
            showLiveError(error.message || 'LIVE 데이터를 불러오지 못했습니다.');
        }

        console.error('LIVE entries load error:', error);
        throw error;
    } finally {
        hideElement(loadingElement);
    }
}

function applyLiveEntriesResponse(response) {
    renderLiveSummary(response);
    renderLiveEntries(response?.rows || [], response?.titleColumn);

    const hasRows = Array.isArray(response?.rows) && response.rows.length > 0;
    const emptyElement = document.getElementById('live-empty');

    if (hasRows) {
        hideElement(emptyElement);
    } else {
        showElement(emptyElement);
    }
}

const WAITING_STORE_DECORATIONS = {
    '달토': '🐰',
    '엘리트': '🎆',
    '퍼펙트': '💫',
    '유앤미': '💟',
    '도파민': '🌌',
    '제우스': '🔱'
};

function normalizeStores(stores) {
    return (Array.isArray(stores) ? stores : [])
        .map((store) => ({
            storeNo: Number.parseInt(store?.storeNo, 10),
            storeName: String(store?.storeName || '').trim(),
            storeAddress: String(store?.storeAddress || '').trim()
        }))
        .filter((store) => Number.isInteger(store.storeNo) && store.storeName)
        .sort((a, b) => a.storeNo - b.storeNo);
}

function getSelectedStore() {
    return liveState.stores.find((store) => store.storeNo === liveState.selectedStoreNo) || null;
}

function getSelectedStoreName() {
    return getSelectedStore()?.storeName || '전체';
}

function renderStoreButtons() {
    const storeFilter = document.getElementById('live-store-filter');
    if (!storeFilter) return;

    storeFilter.innerHTML = liveState.stores.map((store) => `
        <button
            type="button"
            class="area-filter__button ${liveState.selectedStoreNo === store.storeNo ? 'is-active' : ''}"
            data-store-option="${store.storeNo}"
        >
            ${sanitizeHTML(store.storeName)}
        </button>
    `).join('');
    syncScrollableFilterState(storeFilter);
}

function syncSelectedStoreNo() {
    if (!Array.isArray(liveState.stores) || !liveState.stores.length) {
        liveState.selectedStoreNo = null;
        return;
    }

    const hasSelectedStore = liveState.stores.some((store) => store.storeNo === liveState.selectedStoreNo);
    if (!hasSelectedStore) {
        liveState.selectedStoreNo = liveState.stores[0].storeNo;
    }
}

function renderStoreNameList() {
    const storeNameList = document.getElementById('live-store-name-list');
    if (!storeNameList) return;

    if (!Array.isArray(liveState.stores) || !liveState.stores.length) {
        storeNameList.innerHTML = '<p class="live-store-name-list__empty">등록된 매장명이 없습니다.</p>';
        return;
    }

    storeNameList.innerHTML = liveState.stores.map((store) => `
        <span class="live-store-name-list__item">${sanitizeHTML(store.storeName)}</span>
    `).join('');
}

function renderCategoryButtons(categories) {
    const categoryFilter = document.getElementById('live-category-filter');
    if (!categoryFilter) return;

    const normalizedCategories = Object.values(LIVE_CATEGORIES).map((baseCategory) => {
        const matched = Array.isArray(categories)
            ? categories.find((item) => item?.key === baseCategory.key)
            : null;
        return {
            ...baseCategory,
            totalCount: Number(matched?.totalCount || 0)
        };
    });
    categoryFilter.innerHTML = normalizedCategories.map((category) => `<button type="button" class="area-filter__button area-filter__button--district ${liveState.selectedCategoryKey === category.key ? 'is-active' : ''}" data-category-option="${category.key}">${sanitizeHTML(category.label)} </button>`).join('');
    syncScrollableFilterState(categoryFilter);
}

function renderLiveSummary(response = null) {
    const selectedStore = document.getElementById('live-selected-store');
    const selectedCategory = document.getElementById('live-selected-category');
    const totalCount = document.getElementById('live-total-count');

    if (selectedStore) {
        selectedStore.textContent = response?.selectedStoreName || getSelectedStoreName();
    }

    if (selectedCategory) {
        selectedCategory.textContent = response?.selectedCategory?.label || LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || '초이스톡';
    }

    if (totalCount) {
        totalCount.textContent = String(response?.totalCount || 0);
    }
}

function renderLiveEntries(rows, titleColumn) {
    const listElement = document.getElementById('live-entry-list');
    const emptyElement = document.getElementById('live-empty');
    if (!listElement) return;

    if (!Array.isArray(rows) || !rows.length) {
        listElement.innerHTML = '';
        showElement(emptyElement);
        return;
    }

    hideElement(emptyElement);

    if (liveState.selectedCategoryKey === 'entry') {
        listElement.innerHTML = createEntrySummaryLiveCard(rows, titleColumn);
        return;
    }

    listElement.innerHTML = rows.map((row, index) => createLiveEntryCard(row, index, titleColumn)).join('');
}

function createLiveEntryCard(row, index, titleColumn) {
    const title = resolveEntryTitle(row, titleColumn, index);
    const choiceMessage = getRowValueByCandidates(row, ['choiceMsg', 'choice_msg', 'choice msg', 'message', 'msg', 'content']);

    if (liveState.selectedCategoryKey === 'choice' && choiceMessage) {
        return createChoiceLiveEntryCard(row, index, title, choiceMessage);
    }

    if (liveState.selectedCategoryKey === 'waiting') {
        return createWaitingLiveEntryCard(row, index, title);
    }

    return createStructuredLiveEntryCard(row, index, title);
}

function createChoiceLiveEntryCard(row, index, title, choiceMessage = '') {
    const storeName = resolveChoiceStoreName(row);
    const createdAt = getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
    const timestamp = formatLiveEntryTime(createdAt);

    return createLiveChatCard({
        index,
        title: resolveChoiceCardTitle(storeName, title),
        message: formatFieldValue(choiceMessage),
        timestamp,
        rawTimestamp: createdAt,
        avatarLabel: getChoiceAvatarLabel(storeName, index)
    });
}

function createStructuredLiveEntryCard(row, index, title) {
    const details = Object.entries(row || {})
        .filter(([key, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .slice(0, 6)
        .map(([key, value]) => ({
            key: formatFieldLabel(key),
            value: formatFieldValue(value)
        }));

    const storeName = resolveChoiceStoreName(row);
    const createdAt = getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
    const timestamp = formatLiveEntryTime(createdAt);

    return createLiveChatCard({
        index,
        title: resolveStructuredCardTitle(storeName, title),
        details,
        emptyMessage: '표시할 정보가 없습니다.',
        timestamp,
        rawTimestamp: createdAt,
        avatarLabel: getChoiceAvatarLabel(storeName, index)
    });
}

function createEntrySummaryLiveCard(rows, titleColumn) {
    const entryNames = (Array.isArray(rows) ? rows : [])
        .map((row, index) => resolveEntryWorkerName(row, titleColumn, index))
        .filter(Boolean);
    const totalWorkers = entryNames.length;
    const rankedEntries = buildEntryRankings(rows, titleColumn);
    const latestTimestamp = findLatestEntryTimestamp(rows);
    const storeName = resolveChoiceStoreName(rows[0] || {});
    const title = storeName ? `${storeName} 엔트리` : '엔트리';
    const entryNameRows = chunkEntryNames(entryNames, 5);
    const contentHtml = `
        <div class="entry-live-card">
            <section class="entry-live-card__section entry-live-card__section--count">
                <div class="entry-live-card__count-row">
                    <span class="entry-live-card__count-label">총 출근인원</span>
                    <strong class="entry-live-card__count-value">${sanitizeHTML(String(totalWorkers))}</strong>
                    <span class="entry-live-card__count-unit">명</span>
                </div>
            </section>

            <section class="entry-live-card__section">
                <div class="entry-live-card__section-header">
                    <h3 class="entry-live-card__section-title">엔트리 목록</h3>
                </div>
                <div class="entry-live-card__chips">
                    ${entryNameRows.length
                        ? entryNameRows.map((row) => `
                            <div class="entry-live-card__chip-row">
                                ${row.map((name) => `<span class="entry-live-card__chip">${sanitizeHTML(name)}</span>`).join('')}
                            </div>
                        `).join('')
                        : '<p class="entry-live-card__empty">표시할 엔트리 멤버가 없습니다.</p>'}
                </div>
            </section>

            <section class="entry-live-card__section entry-live-card__section--ranking">
                <div class="entry-live-card__section-header">
                    <h3 class="entry-live-card__section-title">오늘의 인기 멤버 TOP 5</h3>
                </div>
                ${rankedEntries.length ? `
                    <ol class="entry-live-card__ranking-list">
                        ${rankedEntries.map((entry, index) => `
                            <li class="entry-live-card__ranking-item">
                                <div class="entry-live-card__ranking-main">
                                    <span class="entry-live-card__ranking-rank">${sanitizeHTML(String(index + 1))}.</span>
                                    <span class="entry-live-card__ranking-name">${sanitizeHTML(entry.name)}</span>
                                </div>
                                <span class="entry-live-card__ranking-score">합계 ${sanitizeHTML(String(entry.score))}</span>
                            </li>
                        `).join('')}
                    </ol>
                ` : `
                    <p class="entry-live-card__empty">표시할 인기 멤버가 없습니다.</p>
                `}
            </section>
        </div>`;

    return createLiveChatCard({
        index: 0,
        title,
        body: contentHtml,
        timestamp: latestTimestamp ? formatLiveEntryTime(latestTimestamp) : '',
        rawTimestamp: latestTimestamp,
        badge: LIVE_CATEGORIES.entry.label,
        avatarLabel: getChoiceAvatarLabel(storeName || LIVE_CATEGORIES.entry.label, 0)
    });
}

function chunkEntryNames(entryNames, size = 5) {
    if (!Array.isArray(entryNames) || size <= 0) {
        return [];
    }

    const rows = [];
    for (let index = 0; index < entryNames.length; index += size) {
        rows.push(entryNames.slice(index, index + size));
    }

    return rows;
}

function resolveEntryWorkerName(row, titleColumn, index) {
    const candidates = ['workerName', 'worker_name', 'nickName', 'nickname', 'name', 'entryName'];
    const detectedName = getRowValueByCandidates(row, candidates);
    if (detectedName !== null && detectedName !== undefined && String(detectedName).trim() !== '') {
        return String(detectedName).trim();
    }

    return resolveEntryTitle(row, titleColumn, index).trim();
}

function buildEntryRankings(rows, titleColumn) {
    return (Array.isArray(rows) ? rows : [])
        .map((row, index) => {
            const mentionCount = Number(getRowValueByCandidates(row, ['mentionCount', 'mention_count'])) || 0;
            const insertCount = Number(getRowValueByCandidates(row, ['insertCount', 'insert_count'])) || 0;
            const rawScore = (mentionCount * 5) + insertCount;

            return {
                name: resolveEntryWorkerName(row, titleColumn, index),
                score: Math.max(0, rawScore - 6),
                rawScore
            };
        })
        .filter((entry) => entry.name)
        .sort((a, b) => b.rawScore - a.rawScore || a.name.localeCompare(b.name, 'ko'))
        .slice(0, 5);
}

function findLatestEntryTimestamp(rows) {
    const candidates = ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'regDate', 'reg_date', 'date'];

    return (Array.isArray(rows) ? rows : [])
        .map((row) => getRowValueByCandidates(row, candidates))
        .filter(Boolean)
        .map((value) => ({
            raw: value,
            time: new Date(value).getTime()
        }))
        .filter((item) => Number.isFinite(item.time))
        .sort((a, b) => b.time - a.time)[0]?.raw || '';
}

function createWaitingLiveEntryCard(row, index, title) {
    const store = resolveWaitingStore(row);
    const storeName = store?.storeName || getSelectedStoreName();
    const waitInfo = getWaitingStatus(row);
    const roomInfo = getRoomStatus(row);
    const roomDetail = getRowValueByCandidates(row, ['roomDetail', 'room_detail', 'detail', 'details']);
    const updatedAt = getRowValueByCandidates(row, ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'regDate', 'reg_date', 'date']);
    const timestamp = formatLiveEntryTime(updatedAt);
    const waitingMessage = buildWaitingMessage({
        storeName,
        storeAddress: store?.storeAddress || '',
        waitInfo,
        roomInfo,
        roomDetail,
        updatedAt
    });

    return createLiveChatCard({
        index,
        title: resolveWaitingCardTitle(storeName, title),
        body: `<p class="live-chat-card__message">${convertTextToHtml(waitingMessage)}</p>`,
        timestamp,
        rawTimestamp: updatedAt,
        badge: LIVE_CATEGORIES.waiting.label,
        avatarLabel: getChoiceAvatarLabel(storeName || LIVE_CATEGORIES.waiting.label, index)
    });
}

function createLiveChatCard({
    index,
    title,
    body = '',
    details = [],
    message = '',
    emptyMessage = '',
    timestamp = '',
    rawTimestamp = '',
    badge = '',
    avatarLabel = '',
    cardClassName = '',
    bubbleClassName = '',
    hideHeader = false
}) {
    const normalizedAvatarLabel = avatarLabel || getChoiceAvatarLabel(title, index);
    const normalizedDetails = Array.isArray(details) ? details : [];
    const normalizedCardClassName = ['live-chat-card', cardClassName].filter(Boolean).join(' ');
    const normalizedBubbleClassName = ['live-chat-card__bubble', bubbleClassName].filter(Boolean).join(' ');
    const contentHtml = body || (normalizedDetails.length
        ? `<ul class="live-chat-card__details">${normalizedDetails.map((detail) => `
            <li class="live-chat-card__detail-item">
                <span class="live-chat-card__detail-key">${sanitizeHTML(detail.key)}</span>
                <span class="live-chat-card__detail-value">${sanitizeHTML(detail.value)}</span>
            </li>
        `).join('')}</ul>`
        : `<p class="live-chat-card__message">${sanitizeHTML(message || emptyMessage)}</p>`);

    return `
        <article class="${normalizedCardClassName}">
            ${hideHeader ? '' : `
                <div class="live-chat-card__header">
                    <div class="live-chat-card__avatar" aria-hidden="true">${sanitizeHTML(normalizedAvatarLabel)}</div>
                    <div class="live-chat-card__header-copy">
                        <h3 class="live-chat-card__title">${sanitizeHTML(title)}</h3>
                    </div>
                </div>
            `}
            <div class="live-chat-card__body">
                <div class="live-chat-card__bubble-wrap">
                    <div class="${normalizedBubbleClassName}">
                        ${contentHtml}
                    </div>
                    ${timestamp ? `<time class="live-chat-card__time" datetime="${sanitizeHTML(String(rawTimestamp))}">${sanitizeHTML(timestamp)}</time>` : ''}
                </div>
            </div>
        </article>
    `;
}

function resolveEntryTitle(row, titleColumn, index) {
    if (titleColumn && row?.[titleColumn]) {
        return String(row[titleColumn]);
    }

    const fallbackKeys = ['title', 'subject', 'name', 'nickName', 'nickname', 'roomName', 'choiceName', 'entryName'];
    for (const key of fallbackKeys) {
        if (row?.[key]) return String(row[key]);
    }

    return `${LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || 'LIVE'} 항목 ${index + 1}`;
}

function normalizeFieldKey(key) {
    return String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function getRowValueByCandidates(row, candidates = []) {
    const entries = Object.entries(row || {});
    const normalizedCandidates = candidates.map((candidate) => normalizeFieldKey(candidate));

    for (const [key, value] of entries) {
        if (value === null || value === undefined || String(value).trim() === '') continue;
        if (normalizedCandidates.includes(normalizeFieldKey(key))) {
            return value;
        }
    }

    return '';
}

function getChoiceAvatarLabel(title, index) {
    const normalizedTitle = String(title || '').replace(/\s+/g, '');
    return normalizedTitle.slice(0, 1) || String(index + 1);
}

function resolveChoiceStoreName(row) {
    const detectedStoreName = getRowValueByCandidates(row, ['storeName', 'store_name', 'shopName', 'shop_name', 'branchName', 'branch_name', 'store', 'storeNm']);
    if (detectedStoreName !== null && detectedStoreName !== undefined && String(detectedStoreName).trim() !== '') {
        return String(detectedStoreName).trim();
    }

    return getSelectedStoreName();
}

function resolveChoiceCardTitle(storeName, fallbackTitle) {
    const normalizedStoreName = String(storeName || '').trim();
    if (normalizedStoreName) {
        return `${normalizedStoreName} 초이스톡`;
    }

    return fallbackTitle;
}

function resolveWaitingStore(row) {
    const detectedStoreName = getRowValueByCandidates(row, ['storeName', 'store_name', 'shopName', 'shop_name', 'branchName', 'branch_name', 'store', 'storeNm']);
    if (detectedStoreName !== null && detectedStoreName !== undefined && String(detectedStoreName).trim() !== '') {
        const normalizedStoreName = String(detectedStoreName).trim();
        const matchedByName = liveState.stores.find((store) => store.storeName === normalizedStoreName);
        if (matchedByName) {
            return matchedByName;
        }

        return {
            storeNo: Number.parseInt(getRowValueByCandidates(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']), 10),
            storeName: normalizedStoreName,
            storeAddress: ''
        };
    }

    const storeNo = Number.parseInt(getRowValueByCandidates(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']), 10);
    if (Number.isInteger(storeNo)) {
        const matchedStore = liveState.stores.find((store) => store.storeNo === storeNo);
        if (matchedStore) {
            return matchedStore;
        }
    }

    return getSelectedStore() || {
        storeNo: null,
        storeName: '전체',
        storeAddress: ''
    };
}

function resolveWaitingStoreName(row) {
    return resolveWaitingStore(row)?.storeName || getSelectedStoreName();
}

function resolveWaitingCardTitle(storeName, fallbackTitle) {
    const normalizedStoreName = String(storeName || '').trim();
    if (normalizedStoreName) {
        return `${normalizedStoreName} 웨이팅`;
    }

    return fallbackTitle;
}


function resolveStructuredCardTitle(storeName, fallbackTitle) {
    const normalizedStoreName = String(storeName || '').trim();
    if (normalizedStoreName) {
        return `${normalizedStoreName} ${LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || 'LIVE'}`;
    }

    return fallbackTitle;
}

function getRoomStatus(row) {
    const roomInfo = getRowValueByCandidates(row, ['roomInfo', 'room_info']);
    if (roomInfo === null || roomInfo === undefined || String(roomInfo).trim() === '') {
        return '정보 없음';
    }

    return Number(roomInfo) === 999 ? '여유' : String(roomInfo).trim();
}

function getWaitingStatus(row) {
    const waitInfo = getRowValueByCandidates(row, ['waitInfo', 'wait_info', 'waitingInfo', 'waiting_info']);
    if (waitInfo === null || waitInfo === undefined || String(waitInfo).trim() === '') {
        return '정보 없음';
    }

    return String(waitInfo).trim();
}

function formatWaitingUpdatedAt(value) {
    if (!value) return '시간 정보 없음';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '시간 정보 없음';

    const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type) => Number.parseInt(parts.find((part) => part.type === type)?.value || '', 10);
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${month}월 ${day}일 ${hour}시 ${minute}분 기준`;
}

function formatWaitingStoreHeadline(storeName) {
    const normalizedStoreName = String(storeName || '전체').trim() || '전체';
    const decoration = WAITING_STORE_DECORATIONS[normalizedStoreName];
    if (!decoration) {
        return `✨✨✨ ${normalizedStoreName} ✨✨✨`;
    }

    return `${decoration.repeat(3)} ${normalizedStoreName} ${decoration.repeat(3)}`;
}

function normalizeWaitingBulletValue(value) {
    if (value === null || value === undefined) return '정보 없음';

    const normalized = String(value).trim();
    return normalized || '정보 없음';
}

function tryParseWaitingDetail(rawDetail) {
    if (rawDetail === null || rawDetail === undefined || rawDetail === '') {
        return { object: null, text: '' };
    }

    if (typeof rawDetail === 'object') {
        return { object: rawDetail, text: '' };
    }

    const text = String(rawDetail).trim();
    if (!text) {
        return { object: null, text: '' };
    }

    try {
        return { object: JSON.parse(text), text: '' };
    } catch (error) {
        // ignore JSON parse error
    }

    try {
        const fixedText = text
            .replace(/\r?\n|\r/g, ' ')
            .replace(/([,{\s])(\w+)\s*:/g, '$1"$2":')
            .replace(/'/g, '"');
        return { object: JSON.parse(fixedText), text: '' };
    } catch (error) {
        // ignore JSON parse error
    }

    return { object: null, text };
}

function formatWaitingDetailKey(key) {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function collectWaitingDetailLines(detail, depth = 0) {
    if (detail === null || detail === undefined || detail === '') {
        return [];
    }

    if (Array.isArray(detail)) {
        return detail.flatMap((item) => collectWaitingDetailLines(item, depth));
    }

    if (typeof detail !== 'object') {
        return String(detail)
            .split(/\r?\n|\r/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => (depth > 0 ? `• ${line}` : line));
    }

    return Object.entries(detail).reduce((lines, [key, value], index) => {
        const label = formatWaitingDetailKey(key);

        if (value !== null && typeof value === 'object') {
            const childLines = collectWaitingDetailLines(value, depth + 1);
            if (depth === 0 && index > 0 && childLines.length) {
                lines.push('');
            }

            if (!childLines.length) {
                lines.push(`• ${label} : 정보 없음`);
                return lines;
            }

            lines.push(label, ...childLines);
            return lines;
        }

        lines.push(`• ${label} : ${normalizeWaitingBulletValue(value)}`);
        return lines;
    }, []);
}

function buildWaitingDetailLines(roomDetail) {
    const { object, text } = tryParseWaitingDetail(roomDetail);

    if (object) {
        return collectWaitingDetailLines(object);
    }

    if (!text) {
        return [];
    }

    return text
        .split(/\r?\n|\r/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            if (/^[•●\-]/.test(line) || /^[0-9]+층/.test(line)) {
                return line;
            }

            const [key, ...rest] = line.split(':');
            if (!rest.length) {
                return line;
            }

            return `• ${formatWaitingDetailKey(key)} : ${normalizeWaitingBulletValue(rest.join(':'))}`;
        });
}

function buildWaitingMessage({ storeName, storeAddress, waitInfo, roomInfo, roomDetail, updatedAt }) {
    const normalizedStoreName = String(storeName || '전체').trim() || '전체';
    const normalizedStoreAddress = String(storeAddress || '').trim();
    const updatedText = formatWaitingUpdatedAt(updatedAt);
    const detailLines = buildWaitingDetailLines(roomDetail);
    const lines = [
        `    ${updatedText}`,
        ` ${formatWaitingStoreHeadline(normalizedStoreName)}`,
        '        룸/웨이팅 상황'
    ];

    if (normalizedStoreAddress) {
        lines.push(`        ${normalizedStoreAddress}`);
    }

    lines.push(
        '➖➖➖➖➖➖➖➖➖',
        `● 빈방 : ${roomInfo}`
    );

    if (detailLines.length) {
        lines.push('', ...detailLines);
    }

    lines.push('', `● 웨이팅 : ${waitInfo}`, '➖➖➖➖➖➖➖➖➖');

    return lines.join('\n');
}

function convertTextToHtml(value) {
    return sanitizeHTML(String(value || '')).replace(/\n/g, '<br>');
}

function formatLiveEntryTime(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatFieldLabel(key) {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

function formatFieldValue(value) {
    if (value instanceof Date) {
        return formatDate(value.toISOString());
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function getLiveEntriesCacheKey() {
    return `${LIVE_ENTRIES_CACHE_PREFIX}${liveState.selectedCategoryKey}:${liveState.selectedStoreNo ?? 'all'}`;
}

function readLiveCache(key) {
    try {
        const rawValue = window.localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
        console.error('LIVE cache read error:', error);
        return null;
    }
}

function writeLiveCache(key, data) {
    try {
        window.localStorage.setItem(key, JSON.stringify({
            savedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.error('LIVE cache write error:', error);
    }
}

function showLiveError(message) {
    const errorElement = document.getElementById('live-error');
    if (!errorElement) return;

    errorElement.textContent = message;
    showElement(errorElement);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePage, { once: true });
} else {
    initLivePage();
}
