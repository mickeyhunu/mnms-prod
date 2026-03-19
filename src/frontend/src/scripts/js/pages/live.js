/**
 * 파일 역할: LIVE 페이지의 필터/목록 렌더링과 이벤트를 초기화하는 페이지 스크립트 파일.
 */
const LIVE_CATEGORIES = {
    choice: { key: 'choice', label: '초이스톡' },
    waiting: { key: 'waiting', label: '웨이팅' },
    entry: { key: 'entry', label: '엔트리' }
};

const liveState = {
    stores: [],
    categories: [],
    selectedStoreName: '전체',
    selectedCategoryKey: 'choice'
};

async function initLivePage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') {
        initHeader();
    }

    bindLiveEvents();
    renderStoreNameList();
    renderCategoryButtons([]);

    try {
        await loadLiveFilters();
        await loadLiveEntries();
    } catch (error) {
        showLiveError(error.message || 'LIVE 데이터를 불러오지 못했습니다.');
    }
}

function bindLiveEvents() {
    const storeFilter = document.getElementById('live-store-filter');
    const categoryFilter = document.getElementById('live-category-filter');

    storeFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-store-option]');
        if (!button) return;

        const nextStoreName = button.dataset.storeOption ? decodeURIComponent(button.dataset.storeOption) : '전체';
        if (liveState.selectedStoreName === nextStoreName) return;

        liveState.selectedStoreName = nextStoreName;
        renderStoreButtons();
        await loadLiveEntries();
    });

    categoryFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-category-option]');
        if (!button) return;

        const nextCategoryKey = button.dataset.categoryOption || 'choice';
        if (liveState.selectedCategoryKey === nextCategoryKey) return;

        liveState.selectedCategoryKey = nextCategoryKey;
        renderCategoryButtons(liveState.categories);
        await loadLiveEntries();
    });
}

async function loadLiveFilters() {
    const response = await APIClient.get('/live/filters');
    liveState.stores = Array.isArray(response?.stores) ? response.stores : [];
    liveState.categories = Array.isArray(response?.categories) ? response.categories : [];

    renderStoreNameList();
    renderStoreButtons();
    renderCategoryButtons(liveState.categories);
}

async function loadLiveEntries() {
    const loadingElement = document.getElementById('live-loading');
    const emptyElement = document.getElementById('live-empty');
    const errorElement = document.getElementById('live-error');
    const listElement = document.getElementById('live-entry-list');

    hideElement(emptyElement);
    hideElement(errorElement);
    showElement(loadingElement);

    try {
        const response = await APIClient.get('/live/entries', {
            category: liveState.selectedCategoryKey,
            storeName: liveState.selectedStoreName === '전체' ? '' : liveState.selectedStoreName,
            limit: 30
        });

        renderLiveSummary(response);
        renderLiveEntries(response?.rows || [], response?.titleColumn);

        if (!Array.isArray(response?.rows) || !response.rows.length) {
            showElement(emptyElement);
        }
    } catch (error) {
        listElement.innerHTML = '';
        showLiveError(error.message || 'LIVE 데이터를 불러오지 못했습니다.');
    } finally {
        hideElement(loadingElement);
    }
}

function renderStoreButtons() {
    const storeFilter = document.getElementById('live-store-filter');
    if (!storeFilter) return;

    const items = ['전체', ...liveState.stores];
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

function renderLiveSummary(response) {
    const selectedStore = document.getElementById('live-selected-store');
    const selectedCategory = document.getElementById('live-selected-category');
    const totalCount = document.getElementById('live-total-count');

    if (selectedStore) {
        selectedStore.textContent = response?.selectedStoreName || liveState.selectedStoreName;
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
