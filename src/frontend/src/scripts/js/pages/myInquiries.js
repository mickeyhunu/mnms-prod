/**
 * 파일 역할: 내 문의함 목록 화면 동작을 담당하는 페이지 스크립트 파일.
 */
const MY_INQUIRIES_STORAGE_KEY = 'myCustomerServiceInquiries';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyInquiriesPage, { once: true });
} else {
    initMyInquiriesPage();
}

function initMyInquiriesPage() {
    Auth.bindLogoutButton();
    renderMyInquiries();
}

function getMyInquiries() {
    try {
        const raw = localStorage.getItem(MY_INQUIRIES_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('문의함 데이터를 불러오지 못했습니다.', error);
        return [];
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderMyInquiries() {
    const listContainer = document.getElementById('my-inquiries-list');
    const emptyMessage = document.getElementById('my-inquiries-empty');

    if (!listContainer || !emptyMessage) return;

    const inquiries = getMyInquiries();

    if (!inquiries.length) {
        listContainer.innerHTML = '';
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');

    const rows = inquiries.map((inquiry) => {
        const statusText = inquiry.status === 'completed' ? '처리완료' : '대기';
        const statusClass = inquiry.status === 'completed' ? 'is-completed' : '';
        const createdAt = inquiry.createdAt ? formatDate(inquiry.createdAt) : '-';
        const type = escapeHtml(inquiry.typeLabel || inquiry.type || '기타');
        const title = escapeHtml(inquiry.title || (String(inquiry.content || '').slice(0, 40) || '제목 없음'));
        const href = `/my-inquiries/${encodeURIComponent(inquiry.id)}`;

        return `
            <tr class="my-inquiries-row" data-href="${href}" role="link" tabindex="0">
                <td class="my-inquiries-type-cell">${type}</td>
                <td class="my-inquiries-title-cell">${title}</td>
                <td class="my-inquiries-date-cell">${escapeHtml(createdAt)}</td>
                <td class="my-inquiries-status-cell"><span class="my-inquiry-status ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');

    listContainer.innerHTML = `
      <table class="my-inquiries-table" aria-label="내 문의 목록">
        <thead>
          <tr>
            <th class="my-inquiries-type-cell">분류</th>
            <th class="my-inquiries-title-cell">제목</th>
            <th class="my-inquiries-date-cell">날짜</th>
            <th class="my-inquiries-status-cell">처리상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    bindRowNavigation(listContainer);
}

function bindRowNavigation(root) {
    const rows = root.querySelectorAll('.my-inquiries-row[data-href]');
    rows.forEach((row) => {
        row.addEventListener('click', () => {
            window.location.href = row.dataset.href;
        });

        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.location.href = row.dataset.href;
            }
        });
    });
}
