/**
 * 파일 역할: LIVE 페이지의 필터/목록 렌더링과 이벤트를 초기화하는 페이지 스크립트 파일.
 */
const LIVE_CATEGORIES = {
    choice: { key: 'choice', label: '초이스톡' },
    waiting: { key: 'waiting', label: '웨이팅' },
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
            limit: 30
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

function normalizeStores(stores) {
    return (Array.isArray(stores) ? stores : [])
        .map((store) => ({
            storeNo: Number.parseInt(store?.storeNo, 10),
            storeName: String(store?.storeName || '').trim()
        }))
        .filter((store) => Number.isInteger(store.storeNo) && store.storeName)
        .sort((a, b) => a.storeNo - b.storeNo);
}

function getSelectedStoreName() {
    return liveState.stores.find((store) => store.storeNo === liveState.selectedStoreNo)?.storeName || '전체';
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
    listElement.innerHTML = rows.map((row, index) => createLiveEntryCard(row, index, titleColumn)).join('');
}

function createLiveEntryCard(row, index, titleColumn) {
    const title = resolveEntryTitle(row, titleColumn, index);
    const choiceMessage = getRowValueByCandidates(row, ['choiceMsg', 'choice_msg', 'choice msg', 'message', 'msg', 'content']);

    if (liveState.selectedCategoryKey === 'choice' && choiceMessage) {
        return createChoiceLiveEntryCard(row, index, title, choiceMessage);
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

    const categoryLabel = LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || 'LIVE';
    const createdAt = getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
    const timestamp = formatLiveEntryTime(createdAt);

    return createLiveChatCard({
        index,
        title,
        details,
        emptyMessage: '표시할 정보가 없습니다.',
        timestamp,
        rawTimestamp: createdAt,
        badge: categoryLabel,
        avatarLabel: getChoiceAvatarLabel(categoryLabel, index)
    });
}

function createLiveChatCard({ index, title, message = '', details = [], emptyMessage = '', timestamp = '', rawTimestamp = '', badge = '', avatarLabel = '' }) {
    const normalizedAvatarLabel = avatarLabel || getChoiceAvatarLabel(title, index);
    const normalizedDetails = Array.isArray(details) ? details : [];
    const contentHtml = normalizedDetails.length
        ? `<ul class="live-chat-card__details">${normalizedDetails.map((detail) => `
            <li class="live-chat-card__detail-item">
                <span class="live-chat-card__detail-key">${sanitizeHTML(detail.key)}</span>
                <span class="live-chat-card__detail-value">${sanitizeHTML(detail.value)}</span>
            </li>
        `).join('')}</ul>`
        : `<p class="live-chat-card__message">${sanitizeHTML(message || emptyMessage)}</p>`;

    return `
        <article class="live-chat-card">
            <div class="live-chat-card__header">
                <div class="live-chat-card__avatar" aria-hidden="true">${sanitizeHTML(normalizedAvatarLabel)}</div>
                <div class="live-chat-card__header-copy">
                    ${badge ? `<span class="live-chat-card__badge">${sanitizeHTML(badge)}</span>` : ''}
                    <h3 class="live-chat-card__title">${sanitizeHTML(title)}</h3>
                </div>
            </div>
            <div class="live-chat-card__body">
                <div class="live-chat-card__bubble-wrap">
                    <div class="live-chat-card__bubble">
                        ${contentHtml}
                        ${timestamp ? `<time class="live-chat-card__time" datetime="${sanitizeHTML(String(rawTimestamp))}">${sanitizeHTML(timestamp)}</time>` : ''}
                    </div>
                    ${timestamp ? `<time class="live-chat-card__time" datetime="${sanitizeHTML(String(createdAt))}">${sanitizeHTML(timestamp)}</time>` : ''}
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
