/**
 * 파일 역할: 1:1 고객센터 문의/신고 작성 화면 동작을 담당하는 페이지 스크립트 파일.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MY_INQUIRIES_STORAGE_KEY = 'myCustomerServiceInquiries';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerServicePage, { once: true });
} else {
    initCustomerServicePage();
}

function initCustomerServicePage() {
    const form = document.getElementById('customer-service-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';

    Auth.bindLogoutButton();
    applyTargetContextFromQuery();
    bindFileValidation();
    renderMyInquiries();

    form.addEventListener('submit', handleCustomerServiceSubmit);
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

function saveMyInquiries(items) {
    localStorage.setItem(MY_INQUIRIES_STORAGE_KEY, JSON.stringify(items));
}

function renderMyInquiries() {
    const listContainer = document.getElementById('my-inquiries-list');
    const emptyMessage = document.getElementById('my-inquiries-empty');

    if (!listContainer || !emptyMessage) return;

    const inquiries = getMyInquiries();
    listContainer.innerHTML = '';

    if (!inquiries.length) {
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');

    inquiries.forEach((inquiry) => {
        const item = document.createElement('article');
        item.className = 'my-inquiry-item';

        const statusText = inquiry.status === 'completed' ? '처리 완료' : '접수/처리 중';
        const answerText = inquiry.answer ? inquiry.answer : '답변 준비 중입니다.';
        const createdAt = inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleString('ko-KR') : '-';

        item.innerHTML = `
            <div class="my-inquiry-meta">
                <span class="my-inquiry-type">${escapeHtml(inquiry.typeLabel || inquiry.type || '기타')}</span>
                <span class="my-inquiry-status ${inquiry.status === 'completed' ? 'is-completed' : ''}">${statusText}</span>
            </div>
            <p class="my-inquiry-content">${escapeHtml(inquiry.content || '')}</p>
            <p class="my-inquiry-answer"><strong>답변:</strong> ${escapeHtml(answerText)}</p>
            <time class="my-inquiry-date">문의일시: ${escapeHtml(createdAt)}</time>
        `;

        listContainer.appendChild(item);
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function applyTargetContextFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const type = String(params.get('type') || '').toLowerCase();
    const targetId = String(params.get('targetId') || '').trim();

    const targetTypeInput = document.getElementById('inquiry-target-type');
    const targetIdInput = document.getElementById('inquiry-target-id');
    const inquiryTypeSelect = document.getElementById('inquiry-type');

    const mappings = {
        post: { targetType: 'post', inquiryType: 'post_report' },
        comment: { targetType: 'comment', inquiryType: 'comment_report' },
        inquiry: { targetType: 'general', inquiryType: 'question' }
    };

    const selected = mappings[type] || { targetType: 'general', inquiryType: '' };

    if (targetTypeInput) targetTypeInput.value = selected.targetType;
    if (targetIdInput) targetIdInput.value = targetId;
    if (inquiryTypeSelect && selected.inquiryType) inquiryTypeSelect.value = selected.inquiryType;
}

function bindFileValidation() {
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach((input) => {
        input.addEventListener('change', () => validateFileUpload(input));
    });

    const cancelButtons = document.querySelectorAll('.cancel-button[data-target]');
    cancelButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                targetInput.value = '';
            }
        });
    });
}

function validateFileUpload(fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return true;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert('이미지(JPG, PNG, GIF, WEBP) 또는 PDF 파일만 업로드할 수 있습니다.');
        fileInput.value = '';
        return false;
    }

    if (file.size > MAX_FILE_SIZE) {
        alert('파일 크기가 50MB를 초과했습니다.');
        fileInput.value = '';
        return false;
    }

    return true;
}

function handleCustomerServiceSubmit(event) {
    event.preventDefault();

    if (!Auth.requireAuth()) return;

    const form = event.currentTarget;
    const typeSelect = document.getElementById('inquiry-type');
    const contentInput = document.getElementById('inquiry-reason');

    const inquiryType = String(typeSelect?.value || '').trim();
    const inquiryTypeLabel = typeSelect?.selectedOptions?.[0]?.textContent?.trim() || inquiryType;
    const content = String(contentInput?.value || '').trim();

    if (!inquiryType) {
        showNotification('문의 유형을 선택해주세요.', 'warning');
        typeSelect?.focus();
        return;
    }

    if (!content) {
        showNotification('신고/문의 사유를 입력해주세요.', 'warning');
        contentInput?.focus();
        return;
    }

    const invalidFile = Array.from(form.querySelectorAll('.file-input')).some((input) => !validateFileUpload(input));
    if (invalidFile) {
        return;
    }

    const inquiries = getMyInquiries();
    inquiries.unshift({
        id: `inq_${Date.now()}`,
        type: inquiryType,
        typeLabel: inquiryTypeLabel,
        content,
        status: 'pending',
        answer: '',
        createdAt: new Date().toISOString()
    });
    saveMyInquiries(inquiries.slice(0, 50));

    showNotification('문의가 접수되었습니다. 내 문의함에서 처리 상태를 확인할 수 있습니다.', 'success');
    form.reset();
    applyTargetContextFromQuery();
    renderMyInquiries();
}
