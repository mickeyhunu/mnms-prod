/**
 * 파일 역할: 내 문의함 상세 화면(문의내용/관리자 답변)을 담당하는 페이지 스크립트 파일.
 */
const MY_INQUIRIES_STORAGE_KEY = 'myCustomerServiceInquiries';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyInquiryDetailPage, { once: true });
} else {
    initMyInquiryDetailPage();
}

function initMyInquiryDetailPage() {
    Auth.bindLogoutButton();
    renderInquiryDetail();
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

function getInquiryIdFromPath() {
    const pathname = window.location.pathname || '';
    const segments = pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] || '');
}

function renderInquiryDetail() {
    const detailContainer = document.getElementById('my-inquiry-detail');
    if (!detailContainer) return;

    const inquiryId = getInquiryIdFromPath();
    const inquiry = getMyInquiries().find((item) => item.id === inquiryId);

    if (!inquiry) {
        detailContainer.innerHTML = '<p class="my-inquiries-empty">문의를 찾을 수 없습니다.</p>';
        return;
    }

    const statusText = inquiry.status === 'completed' ? '처리완료' : '대기';
    const answerText = inquiry.answer ? inquiry.answer : '답변 준비 중입니다.';
    const createdAt = inquiry.createdAt ? formatDateTime(inquiry.createdAt) : '-';
    const typeText = inquiry.typeLabel || inquiry.type || '기타';
    const titleText = inquiry.title || '제목 없음';

    detailContainer.innerHTML = `
      <div class="my-inquiry-meta">
        <span class="my-inquiry-type">${escapeHtml(typeText)}</span>
        <span class="my-inquiry-status ${inquiry.status === 'completed' ? 'is-completed' : ''}">${statusText}</span>
      </div>
      <h2 class="my-inquiry-detail-title">${escapeHtml(titleText)}</h2>
      <time class="my-inquiry-date">문의일시: ${escapeHtml(createdAt)}</time>
      <div class="my-inquiry-detail-block">
        <h3>문의 내용</h3>
        <p class="my-inquiry-content">${escapeHtml(inquiry.content || '').replace(/\n/g, '<br>')}</p>
      </div>
      <div class="my-inquiry-detail-block">
        <h3>관리자 답변</h3>
        <p class="my-inquiry-answer">${escapeHtml(answerText).replace(/\n/g, '<br>')}</p>
      </div>
    `;
}
