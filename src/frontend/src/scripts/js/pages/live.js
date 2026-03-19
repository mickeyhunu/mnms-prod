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
const LIVE_ALL_STORES_LABEL = '전체';

const liveState = {
    stores: [],
    categories: [],
    selectedStoreName: '',
    selectedCategoryKey: 'choice',
    refreshTimerId: null,
    entriesRequestId: 0,
    filtersRequestId: 0,
    hasBoundEvents: false,
    hasCachedEntries: false
};

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

    storeFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-store-option]');
        if (!button) return;

        const nextStoreName = button.dataset.storeOption ? decodeURIComponent(button.dataset.storeOption) : LIVE_ALL_STORES_LABEL;
        if (liveState.selectedStoreName === nextStoreName) return;

        liveState.selectedStoreName = nextStoreName;
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
        renderLiveSummary();
        return false;
    }

    liveState.stores = Array.isArray(cachedFilters.data.stores) ? cachedFilters.data.stores : [];
    liveState.categories = Array.isArray(cachedFilters.data.categories) ? cachedFilters.data.categories : [];
    syncSelectedFilters();

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

    liveState.stores = Array.isArray(response?.stores) ? response.stores : [];
    liveState.categories = Array.isArray(response?.categories) ? response.categories : [];
    syncSelectedFilters();

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
            storeName: liveState.selectedStoreName === LIVE_ALL_STORES_LABEL ? '' : liveState.selectedStoreName,
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

function renderStoreButtons() {
    const storeFilter = document.getElementById('live-store-filter');
    if (!storeFilter) return;

    const items = [LIVE_ALL_STORES_LABEL, ...liveState.stores];
    storeFilter.innerHTML = items.map((storeName) => `
        <button
            type="button"
            class="area-filter__button ${liveState.selectedStoreName === storeName ? 'is-active' : ''}"
            data-store-option="${encodeURIComponent(storeName)}"
        >
            ${sanitizeHTML(storeName)}
        </button>
    `).join('');
}

function syncSelectedStoreName() {
    if (!Array.isArray(liveState.stores) || !liveState.stores.length) {
        liveState.selectedStoreName = '';
        return;
    }

    if (!liveState.stores.includes(liveState.selectedStoreName)) {
        [liveState.selectedStoreName] = liveState.stores;
    }
}

function renderStoreNameList() {
    const storeNameList = document.getElementById('live-store-name-list');
    if (!storeNameList) return;

    if (!Array.isArray(liveState.stores) || !liveState.stores.length) {
        storeNameList.innerHTML = '<p class="live-store-name-list__empty">등록된 매장명이 없습니다.</p>';
        return;
    }

    storeNameList.innerHTML = liveState.stores.map((storeName) => `
        <span class="live-store-name-list__item">${sanitizeHTML(storeName)}</span>
    `).join('');
}

function syncSelectedFilters() {
    const storeNames = Array.isArray(liveState.stores) ? liveState.stores : [];
    const categoryKeys = new Set(
        Array.isArray(liveState.categories)
            ? liveState.categories.map((category) => category?.key).filter(Boolean)
            : []
    );

    if (!storeNames.length) {
        liveState.selectedStoreName = LIVE_ALL_STORES_LABEL;
    } else if (!liveState.selectedStoreName || liveState.selectedStoreName === LIVE_ALL_STORES_LABEL) {
        liveState.selectedStoreName = storeNames[0];
    } else if (!storeNames.includes(liveState.selectedStoreName)) {
        liveState.selectedStoreName = storeNames[0];
    }

    if (categoryKeys.size && !categoryKeys.has(liveState.selectedCategoryKey)) {
        liveState.selectedCategoryKey = Array.from(categoryKeys)[0];
    }
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

    categoryFilter.innerHTML = normalizedCategories.map((category) => `
        <button
            type="button"
            class="area-filter__button area-filter__button--district ${liveState.selectedCategoryKey === category.key ? 'is-active' : ''}"
            data-category-option="${category.key}"
        >
            ${sanitizeHTML(category.label)} <span class="live-filter-count">${category.totalCount}</span>
        </button>
    `).join('');
}

function renderLiveSummary(response = null) {
    const selectedStore = document.getElementById('live-selected-store');
    const selectedCategory = document.getElementById('live-selected-category');
    const selectedPair = document.getElementById('live-selected-pair');
    const totalCount = document.getElementById('live-total-count');
    const resolvedStoreName = response?.selectedStoreName || liveState.selectedStoreName || LIVE_ALL_STORES_LABEL;
    const resolvedCategoryLabel = response?.selectedCategory?.label || LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || '초이스톡';

    if (selectedStore) {
        selectedStore.textContent = resolvedStoreName;
    }

    if (selectedCategory) {
        selectedCategory.textContent = resolvedCategoryLabel;
    }

    if (selectedPair) {
        selectedPair.textContent = `${resolvedStoreName} ${resolvedCategoryLabel}`;
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
    const entries = Object.entries(row || {});
    const title = resolveEntryTitle(row, titleColumn, index);
    const detailItems = entries
        .filter(([key, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .slice(0, 6)
        .map(([key, value]) => `
            <li class="live-entry-card__detail-item">
                <span class="live-entry-card__detail-key">${sanitizeHTML(formatFieldLabel(key))}</span>
                <span class="live-entry-card__detail-value">${sanitizeHTML(formatFieldValue(value))}</span>
            </li>
        `)
        .join('');

    return `
        <article class="live-entry-card">
            <div class="live-entry-card__header">
                <span class="live-entry-card__badge">${sanitizeHTML(LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || 'LIVE')}</span>
                <h3 class="live-entry-card__title">${sanitizeHTML(title)}</h3>
            </div>
            <ul class="live-entry-card__details">
                ${detailItems}
            </ul>
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
    return `${LIVE_ENTRIES_CACHE_PREFIX}${liveState.selectedCategoryKey}:${liveState.selectedStoreName}`;
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
