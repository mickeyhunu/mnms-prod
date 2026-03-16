/**
 * 파일 역할: 내 문의함 상세 화면(문의내용/관리자 답변)을 담당하는 페이지 스크립트 파일.
 */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyInquiryDetailPage, { once: true });
} else {
    initMyInquiryDetailPage();
}

async function initMyInquiryDetailPage() {
    Auth.bindLogoutButton();
    if (!Auth.requireAuth()) return;
    await renderInquiryDetail();
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
    return Number.parseInt(decodeURIComponent(segments[segments.length - 1] || ''), 10);
}

function getStatusText(status) {
    return String(status || '').toUpperCase() === 'ANSWERED' ? '처리완료' : '대기';
}


function getInquiryTypeLabel(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'post_report') return '게시글 신고';
    if (normalized === 'comment_report') return '댓글 신고';
    if (normalized === 'question') return '일반 문의';
    if (normalized === 'account') return '계정 문의';
    if (normalized === 'service_error') return '서비스 오류';
    if (normalized === 'ad_inquiry') return '광고 문의';
    if (normalized === 'etc' || normalized === 'other') return '기타';
    return '기타';
}

async function renderInquiryDetail() {
    const detailContainer = document.getElementById('my-inquiry-detail');
    if (!detailContainer) return;

    const inquiryId = getInquiryIdFromPath();
    if (!Number.isInteger(inquiryId) || inquiryId <= 0) {
        detailContainer.innerHTML = '<p class="my-inquiries-empty">문의를 찾을 수 없습니다.</p>';
        return;
    }

    try {
        const inquiry = await APIClient.get(`/support/inquiries/me/${inquiryId}`);

        const statusText = getStatusText(inquiry.status);
        const answerText = inquiry.answerContent ? inquiry.answerContent : '답변 준비 중입니다.';
        const createdAt = inquiry.createdAt ? formatDateTime(inquiry.createdAt) : '-';
        const typeText = getInquiryTypeLabel(inquiry.type);
        const titleText = inquiry.title || '제목 없음';

        detailContainer.innerHTML = `
        <div class="my-inquiry-meta">
            <span class="my-inquiry-type">${escapeHtml(typeText)}</span>
            <span class="my-inquiry-status ${String(inquiry.status || '').toUpperCase() === 'ANSWERED' ? 'is-completed' : ''}">${statusText}</span>
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
    } catch (error) {
        detailContainer.innerHTML = `<p class="my-inquiries-empty">${escapeHtml(error.message || '문의를 불러오지 못했습니다.')}</p>`;
    }
}
