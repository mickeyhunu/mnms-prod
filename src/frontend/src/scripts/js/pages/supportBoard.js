/**
 * 파일 역할: 공지사항/FAQ 공개 목록을 불러와 렌더링하는 페이지 스크립트 파일.
 */
let activeTab = 'notice';

document.addEventListener('DOMContentLoaded', initSupportBoardPage);

async function initSupportBoardPage() {
    Auth.bindLogoutButton();

    const params = new URLSearchParams(window.location.search);
    const rawTab = String(params.get('tab') || '').toLowerCase();
    const normalizedTab = rawTab === 'fqa' ? 'faq' : rawTab;
    if (normalizedTab === 'faq' || normalizedTab === 'notice') {
        activeTab = normalizedTab;
    }

    bindTabEvents();
    await loadArticles();
}

function bindTabEvents() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach((tabButton) => {
        tabButton.classList.toggle('active', tabButton.dataset.tab === activeTab);
        tabButton.addEventListener('click', async () => {
            activeTab = tabButton.dataset.tab;
            tabs.forEach((item) => item.classList.toggle('active', item.dataset.tab === activeTab));
            await loadArticles();
        });
    });
}

async function loadArticles() {
    const loading = document.getElementById('support-public-loading');
    const errorBox = document.getElementById('support-public-error');
    const list = document.getElementById('support-public-list');

    loading?.classList.remove('hidden');
    errorBox?.classList.add('hidden');
    list?.classList.add('hidden');

    try {
        const response = await APIClient.get(`/support/${activeTab}`);
        const rows = response.content || [];

        if (!rows.length) {
            if (list) {
                list.innerHTML = '<div class="card">등록된 글이 없습니다.</div>';
                list.classList.remove('hidden');
            }
            return;
        }

        if (list) {
            list.innerHTML = rows.map((item) => `
                <article class="card" style="margin-bottom:12px;">
                    <h3 style="margin-bottom:8px;">${sanitizeHTML(item.title || '')}</h3>
                    <div class="text-muted text-sm" style="margin-bottom:12px;">${formatDate(item.createdAt || item.created_at)}</div>
                    <div style="white-space:pre-wrap; line-height:1.6;">${sanitizeHTML(item.content || '')}</div>
                </article>
            `).join('');
            list.classList.remove('hidden');
        }
    } catch (error) {
        if (errorBox) {
            errorBox.classList.remove('hidden');
            const message = document.getElementById('support-public-error-message');
            if (message) message.textContent = error.message || '목록을 불러오지 못했습니다.';
        }
    } finally {
        loading?.classList.add('hidden');
    }
}
