/**
 * 파일 역할: 공지사항/FAQ 공개 목록을 불러와 렌더링하는 페이지 스크립트 파일.
 */
let activeTab = 'notice';
let latestLoadRequestId = 0;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportBoardPage, { once: true });
} else {
    initSupportBoardPage();
}

function withTimeout(promise, ms = 8000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')), ms);
        })
    ]);
}

async function initSupportBoardPage() {
    const list = document.getElementById('support-public-list');
    if (!list || list.dataset.initialized === 'true') return;
    list.dataset.initialized = 'true';

    Auth.bindLogoutButton();

    const params = new URLSearchParams(window.location.search);
    const articleId = String(params.get('articleId') || '').trim();
    const sourceType = String(params.get('sourceType') || '').toUpperCase();

    if (articleId) {
        await loadArticleDetail(articleId, sourceType);
        return;
    }

    const rawTab = String(params.get('tab') || '').toLowerCase();
    const normalizedTab = rawTab === 'fqa' ? 'faq' : rawTab;
    if (normalizedTab === 'faq' || normalizedTab === 'notice') {
        activeTab = normalizedTab;
    }

    bindTabEvents();
    await loadArticles();
}

function bindTabEvents() {
    const tabs = document.querySelectorAll('.board-tab');
    tabs.forEach((tabButton) => {
        tabButton.classList.toggle('active', tabButton.dataset.tab === activeTab);
        tabButton.addEventListener('click', async () => {
            if (activeTab === tabButton.dataset.tab) return;
            activeTab = tabButton.dataset.tab;
            tabs.forEach((item) => item.classList.toggle('active', item.dataset.tab === activeTab));
            syncBoardTitle();
            await loadArticles();
        });
    });

    syncBoardTitle();
}

function syncBoardTitle() {
    const boardName = document.querySelector('.community-board-name');
    if (boardName) {
        boardName.textContent = activeTab === 'faq' ? 'FAQ' : '공지사항';
    }
}

async function loadArticles() {
    const requestId = ++latestLoadRequestId;
    const loading = document.getElementById('support-public-loading');
    const errorBox = document.getElementById('support-public-error');
    const list = document.getElementById('support-public-list');

    loading?.classList.remove('hidden');
    errorBox?.classList.add('hidden');
    list?.classList.add('hidden');

    try {
        const response = await withTimeout(APIClient.get(`/support/${activeTab}`));
        if (requestId !== latestLoadRequestId) return;
        const rows = response.content || [];

        if (!rows.length) {
            if (list) {
                list.innerHTML = '<div class="card">등록된 글이 없습니다.</div>';
                list.classList.remove('hidden');
            }
            return;
        }

        if (list) {
            list.innerHTML = rows.map((item) => {
                if (activeTab === 'notice') {
                    return createSupportNoticeCard(item);
                }

                return createSupportFaqCard(item);
            }).join('');
            list.classList.remove('hidden');
        }
    } catch (error) {
        if (requestId !== latestLoadRequestId) return;
        if (errorBox) {
            errorBox.classList.remove('hidden');
            const message = document.getElementById('support-public-error-message');
            if (message) message.textContent = error.message || '목록을 불러오지 못했습니다.';
        }
    } finally {
        if (requestId === latestLoadRequestId) {
            loading?.classList.add('hidden');
        }
    }
}

function createSupportNoticeCard(item) {
    const createdAt = formatDateOnly(item.createdAt || item.created_at);
    const authorName = sanitizeHTML(item.createdByNickname || item.updatedByNickname || '운영팀');
    const title = sanitizeHTML(item.title || '제목 없음');
    const articleId = encodeURIComponent(item.id || '');
    const sourceType = encodeURIComponent(String(item.sourceType || 'SUPPORT').toUpperCase());

    return `
        <a class="post-card admin-notice" href="/support?articleId=${articleId}&sourceType=${sourceType}" style="display:block;text-decoration:none;color:inherit;">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">[공지] ${title}</h3>
                    <div class="post-meta support-notice-meta">
                        <span class="post-author">${authorName}</span>
                        <span class="post-date support-notice-date">${createdAt}</span>
                    </div>
                </div>
            </div>
        </a>
    `;
}

function createSupportFaqCard(item) {
    const createdAt = formatDateOnly(item.createdAt || item.created_at);
    const title = sanitizeHTML(item.title || '제목 없음');
    const content = sanitizeHTML(item.content || '').replace(/\n/g, '<br>');

    return `
        <article class="post-card" style="cursor:default;">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">[FAQ] ${title}</h3>
                    <div class="post-meta support-notice-meta">
                        <span class="post-author">운영팀</span>
                        <span class="post-date support-notice-date">${createdAt}</span>
                    </div>
                </div>
            </div>
            <div class="post-content" style="white-space:normal;line-height:1.7;">${content}</div>
        </article>
    `;
}

function applyDetailModeHeader() {
    const tabs = document.getElementById('board-tabs-panel');
    if (tabs) {
        tabs.classList.add('hidden');
    }

    const toggleButton = document.getElementById('board-menu-toggle');
    if (toggleButton) {
        toggleButton.classList.add('hidden');
    }

    const boardName = document.querySelector('.community-board-name');
    if (boardName) {
        boardName.textContent = '공지사항';
    }
}

async function loadArticleDetail(articleId, sourceType) {
    const loading = document.getElementById('support-public-loading');
    const errorBox = document.getElementById('support-public-error');
    const list = document.getElementById('support-public-list');

    applyDetailModeHeader();

    loading?.classList.remove('hidden');
    errorBox?.classList.add('hidden');
    list?.classList.add('hidden');

    try {
        const query = sourceType ? { sourceType } : {};
        const article = await withTimeout(APIClient.get(`/support/article/${encodeURIComponent(articleId)}`, query));

        if (!list) return;

        const detailCreatedAt = formatDateOnly(article.createdAt || article.created_at) || '';
        const detailAuthor = sanitizeHTML(article.createdByNickname || article.updatedByNickname || '운영팀');
        const detailTitle = sanitizeHTML(article.title || '제목 없음');
        const detailContent = sanitizeHTML(article.content || '').replace(/\n/g, '<br>');

        list.innerHTML = `
            <article class="post-card admin-notice" style="cursor:default;">
                <div class="post-header">
                    <div class="post-header-left">
                        <h3 class="post-title">[공지] ${detailTitle}</h3>
                        <div class="post-meta support-notice-meta">
                            <span class="post-author">${detailAuthor}</span>
                            <span class="post-date support-notice-date">${detailCreatedAt}</span>
                        </div>
                    </div>
                </div>
                <div class="post-content" style="white-space:normal;line-height:1.7;">${detailContent}</div>
            </article>
            <div style="margin-top:12px;">
                <a class="btn btn-outline btn-sm" href="/support?tab=notice">목록으로</a>
            </div>
        `;

        list.classList.remove('hidden');
    } catch (error) {
        if (errorBox) {
            errorBox.classList.remove('hidden');
            const message = document.getElementById('support-public-error-message');
            if (message) message.textContent = error.message || '글을 불러오지 못했습니다.';
        }
    } finally {
        loading?.classList.add('hidden');
    }
}

function formatDateOnly(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}.${month}.${day}`;
}
