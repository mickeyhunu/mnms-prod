/**
 * 파일 역할: live 페이지에서 실시간 DB 피드를 조회하고 렌더링하는 페이지 스크립트 파일.
 */
const LivePage = {
    refreshTimer: null,
    refreshIntervalMs: 10000,
    state: {
        tables: [],
        selectedTable: '',
        limit: 20,
        rows: [],
        columns: [],
        fetchedAt: null
    },

    init() {
        Auth.updateHeaderUI();
        this.cacheElements();
        this.bindEvents();
        this.bootstrap();
    },

    cacheElements() {
        this.tableSelect = document.getElementById('live-table-select');
        this.limitSelect = document.getElementById('live-limit-select');
        this.refreshButton = document.getElementById('live-refresh-btn');
        this.loadingEl = document.getElementById('live-loading');
        this.errorEl = document.getElementById('live-error');
        this.errorMessageEl = document.getElementById('live-error-message');
        this.emptyEl = document.getElementById('live-empty');
        this.feedEl = document.getElementById('live-feed');
        this.tableCountEl = document.getElementById('live-table-count');
        this.rowCountEl = document.getElementById('live-row-count');
        this.lastUpdatedEl = document.getElementById('live-last-updated');
    },

    bindEvents() {
        this.tableSelect?.addEventListener('change', async (event) => {
            this.state.selectedTable = event.target.value;
            this.syncQueryString();
            await this.fetchRows();
        });

        this.limitSelect?.addEventListener('change', async (event) => {
            this.state.limit = Number(event.target.value || 20);
            this.syncQueryString();
            await this.fetchRows();
        });

        this.refreshButton?.addEventListener('click', async () => {
            await this.fetchRows({ showLoader: true, manual: true });
        });
    },

    async bootstrap() {
        const params = new URLSearchParams(window.location.search);
        const requestedTable = params.get('table') || '';
        const requestedLimit = Number(params.get('limit') || 20);
        if ([10, 20, 50, 100].includes(requestedLimit)) {
            this.state.limit = requestedLimit;
            if (this.limitSelect) this.limitSelect.value = String(requestedLimit);
        }

        try {
            await this.fetchTables(requestedTable);
            await this.fetchRows({ showLoader: true });
            this.startAutoRefresh();
        } catch (error) {
            this.renderError(error.message || '실시간 정보를 불러오지 못했습니다.');
        }
    },

    async fetchTables(requestedTable = '') {
        const response = await APIClient.get('/chatbot/live/tables');
        const tables = Array.isArray(response.content) ? response.content : [];
        this.state.tables = tables;
        this.renderTableOptions();

        const nextTable = tables.includes(requestedTable)
            ? requestedTable
            : (tables[0] || '');

        this.state.selectedTable = nextTable;
        if (this.tableSelect) {
            this.tableSelect.value = nextTable;
            this.tableSelect.disabled = tables.length === 0;
        }
        this.updateStats();
    },

    async fetchRows(options = {}) {
        const { showLoader = false, manual = false } = options;

        if (!this.state.selectedTable) {
            this.state.rows = [];
            this.state.columns = [];
            this.state.fetchedAt = null;
            this.renderEmpty('조회 가능한 테이블이 없습니다.');
            this.updateStats();
            return;
        }

        if (showLoader) {
            showElement(this.loadingEl);
            hideElement(this.errorEl);
            hideElement(this.emptyEl);
            hideElement(this.feedEl);
        }

        if (this.refreshButton) {
            setLoading(this.refreshButton, manual);
        }

        try {
            const response = await APIClient.get('/chatbot/live/table', {
                table: this.state.selectedTable,
                limit: this.state.limit
            });

            this.state.rows = Array.isArray(response.content) ? response.content : [];
            this.state.columns = Array.isArray(response.columns) ? response.columns : [];
            this.state.fetchedAt = response.fetchedAt || new Date().toISOString();

            this.renderFeed();
            this.updateStats();
        } catch (error) {
            this.renderError(error.message || '실시간 정보를 불러오지 못했습니다.');
        } finally {
            hideElement(this.loadingEl);
            if (this.refreshButton) {
                setLoading(this.refreshButton, false);
                this.refreshButton.textContent = '지금 새로고침';
            }
        }
    },

    renderTableOptions() {
        if (!this.tableSelect) return;

        if (!this.state.tables.length) {
            this.tableSelect.innerHTML = '<option value="">조회 가능한 테이블 없음</option>';
            return;
        }

        this.tableSelect.innerHTML = this.state.tables
            .map((table) => `<option value="${sanitizeHTML(table)}">${sanitizeHTML(table)}</option>`)
            .join('');
    },

    renderFeed() {
        hideElement(this.errorEl);

        if (!this.state.rows.length) {
            this.renderEmpty('선택한 테이블에 아직 표시할 데이터가 없습니다.');
            return;
        }

        hideElement(this.emptyEl);
        showElement(this.feedEl);

        this.feedEl.innerHTML = this.state.rows
            .map((row, index) => this.renderRowCard(row, index))
            .join('');
    },

    renderRowCard(row, index) {
        const entries = Object.entries(row || {}).filter(([, value]) => value !== null && value !== undefined && value !== '');
        const titleEntry = this.findTitleEntry(entries);
        const timeEntry = this.findTimeEntry(entries);
        const highlightEntries = entries.filter(([key]) => key !== titleEntry?.[0] && key !== timeEntry?.[0]).slice(0, 8);

        return `
            <article class="live-card">
                <div class="live-card-top">
                    <div>
                        <span class="live-card-index">#${index + 1}</span>
                        <h3 class="live-card-title">${sanitizeHTML(this.formatPrimaryValue(titleEntry?.[1], index))}</h3>
                    </div>
                    <div class="live-card-meta">
                        <span class="live-card-table">${sanitizeHTML(this.state.selectedTable)}</span>
                        <span class="live-card-time">${sanitizeHTML(this.formatMetaTime(timeEntry?.[1]))}</span>
                    </div>
                </div>
                <dl class="live-card-grid">
                    ${highlightEntries.map(([key, value]) => `
                        <div class="live-card-field">
                            <dt>${sanitizeHTML(this.humanizeKey(key))}</dt>
                            <dd>${sanitizeHTML(this.formatValue(value))}</dd>
                        </div>
                    `).join('')}
                </dl>
            </article>
        `;
    },

    renderEmpty(message) {
        hideElement(this.feedEl);
        hideElement(this.errorEl);
        showElement(this.emptyEl);
        const title = this.emptyEl.querySelector('h3');
        const body = this.emptyEl.querySelector('p');
        if (title) title.textContent = '표시할 데이터가 없습니다.';
        if (body) body.textContent = message;
    },

    renderError(message) {
        hideElement(this.loadingEl);
        hideElement(this.feedEl);
        hideElement(this.emptyEl);
        showElement(this.errorEl);
        if (this.errorMessageEl) {
            this.errorMessageEl.textContent = message;
        }
        this.updateStats();
    },

    updateStats() {
        if (this.tableCountEl) this.tableCountEl.textContent = String(this.state.tables.length || 0);
        if (this.rowCountEl) this.rowCountEl.textContent = String(this.state.rows.length || 0);
        if (this.lastUpdatedEl) {
            this.lastUpdatedEl.textContent = this.state.fetchedAt
                ? this.formatDateTime(this.state.fetchedAt)
                : '-';
        }
    },

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            this.fetchRows();
        }, this.refreshIntervalMs);
    },

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    },

    syncQueryString() {
        const params = new URLSearchParams(window.location.search);
        if (this.state.selectedTable) params.set('table', this.state.selectedTable);
        else params.delete('table');
        params.set('limit', String(this.state.limit));
        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', nextUrl);
    },

    findTitleEntry(entries) {
        const priorities = ['title', 'name', 'subject', 'nickname', 'message', 'content', 'text'];
        return this.findPreferredEntry(entries, priorities) || entries[0] || null;
    },

    findTimeEntry(entries) {
        const priorities = ['created_at', 'createdAt', 'updated_at', 'updatedAt', 'time', 'timestamp', 'datetime', 'date'];
        return this.findPreferredEntry(entries, priorities);
    },

    findPreferredEntry(entries, priorities) {
        return priorities
            .map((key) => entries.find(([entryKey]) => entryKey === key))
            .find(Boolean) || null;
    },

    formatPrimaryValue(value, index) {
        if (value === null || value === undefined || value === '') {
            return `항목 ${index + 1}`;
        }
        return this.formatValue(value, 72);
    },

    formatMetaTime(value) {
        if (!value) return '시간 정보 없음';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return this.formatValue(value, 32);
        return new Intl.DateTimeFormat('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value || '-');
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    },

    humanizeKey(key) {
        return String(key || '')
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, (char) => char.toUpperCase());
    },

    formatValue(value, maxLength = 120) {
        const normalized = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
        if (normalized.length <= maxLength) return normalized;
        return `${normalized.slice(0, maxLength)}…`;
    }
};

function initLivePage() {
    LivePage.init();
    window.addEventListener('beforeunload', () => LivePage.stopAutoRefresh(), { once: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePage);
} else {
    initLivePage();
}
