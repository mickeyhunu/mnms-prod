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



function renderAttachmentList(attachmentUrls = []) {
    if (!Array.isArray(attachmentUrls) || attachmentUrls.length === 0) return '';

    const items = attachmentUrls.map((url, index) => {
        const safeUrl = escapeHtml(url);
        const isPdf = safeUrl.startsWith('data:application/pdf');
        if (isPdf) {
            const label = `첨부파일 ${index + 1} (PDF)`;
            return `<li class="my-inquiry-attachment-item"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
        }

        return `
            <li class="my-inquiry-attachment-item">
                <img class="my-inquiry-attachment-image" src="${safeUrl}" alt="첨부 이미지 ${index + 1}" onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden');">
                <a class="hidden" href="${safeUrl}" target="_blank" rel="noopener noreferrer">첨부파일 ${index + 1} (열기)</a>
            </li>
        `;
    }).join('');

    return `
        <div class="my-inquiry-detail-block">
            <h3>첨부파일</h3>
            <ul class="my-inquiry-attachments">${items}</ul>
        </div>
    `;
}

function getInquiryTargetTypeLabel(targetType) {
    const normalized = String(targetType || '').toLowerCase();
    if (normalized === 'post') return '게시글';
    if (normalized === 'comment') return '댓글';
    return '대상';
}

function truncateText(value, maxLength = 120) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
}

function renderInquiryTargetBlock(inquiry) {
    const target = inquiry?.target;
    const targetType = target?.type || inquiry?.targetType;
    const targetId = target?.id || inquiry?.targetId;
    if (!targetType || !targetId) return '';

    const typeLabel = getInquiryTargetTypeLabel(targetType);
    const postTitle = target?.postTitle || target?.title || '';
    const content = target?.content || '';
    const href = target?.url || (target?.postId ? createPostDetailPath(target.postId, target.postTitle || target.title) : '');
    const statusText = target?.isDeleted ? '삭제됨' : (target?.isHidden ? '가려짐' : '');
    const statusBadge = statusText ? ` <span class="my-inquiry-info-value">(${escapeHtml(statusText)})</span>` : '';
    const titleLine = postTitle ? escapeHtml(truncateText(postTitle, 100)) : `${escapeHtml(typeLabel)} #${escapeHtml(targetId)}`;
    const linkedTitle = href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${titleLine}</a>`
        : titleLine;
    const contentLine = content ? `<p class="my-inquiry-content">${escapeHtml(truncateText(content, 160))}</p>` : '';

    return `
        <div class="my-inquiry-detail-block">
            <h3>신고 대상</h3>
            <p class="my-inquiry-content"><strong>${escapeHtml(typeLabel)} #${escapeHtml(targetId)}</strong>${statusBadge}<br>${linkedTitle}</p>
            ${contentLine}
        </div>
    `;
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
        <div class="my-inquiry-info-grid">
            <div class="my-inquiry-info-item">
                <span class="my-inquiry-info-label">문의 번호</span>
                <span class="my-inquiry-info-value">#${escapeHtml(inquiry.id)}</span>
            </div>
            <div class="my-inquiry-info-item">
                <span class="my-inquiry-info-label">문의 일시</span>
                <time class="my-inquiry-info-value">${escapeHtml(createdAt)}</time>
            </div>
        </div>
        ${renderInquiryTargetBlock(inquiry)}
        <div class="my-inquiry-detail-block">
            <h3>문의 내용</h3>
            <p class="my-inquiry-content">${renderLinkedText(inquiry.content || '')}</p>
        </div>
        ${renderAttachmentList(inquiry.attachmentUrls)}
        <div class="my-inquiry-detail-block my-inquiry-answer-block ${String(inquiry.status || '').toUpperCase() === 'ANSWERED' ? 'is-completed' : ''}">
            <h3>관리자 답변</h3>
            <p class="my-inquiry-answer">${renderLinkedText(answerText)}</p>
        </div>
        `;
    } catch (error) {
        detailContainer.innerHTML = `<p class="my-inquiries-empty">${escapeHtml(error.message || '문의를 불러오지 못했습니다.')}</p>`;
    }
}
