/**
 * 파일 역할: 광고주가 내 광고의 스탬프 이벤트 신청을 확인하고 승인/반려하는 페이지 스크립트 파일.
 */
(function initStampEventManagementPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const listElement = document.getElementById('stamp-event-management-list');
    const emptyElement = document.getElementById('stamp-event-management-empty');
    const summaryElement = document.getElementById('stamp-event-management-summary');
    const filterElement = document.getElementById('stamp-event-management-status');
    if (!listElement) return;

    const requestTypeLabels = {
        VISIT_VERIFICATION: '방문인증 신청',
        STAMP_USE: '스탬프사용 신청'
    };
    const statusLabels = {
        PENDING: '대기',
        APPROVED: '승인',
        REJECTED: '반려'
    };

    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
        return date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function setLoading() {
        listElement.innerHTML = '<div class="stamp-event-management-loading">신청 내역을 불러오는 중입니다...</div>';
        emptyElement?.classList.add('hidden');
    }

    function renderSummary(items) {
        if (!summaryElement) return;
        const pending = items.filter((item) => item.status === 'PENDING').length;
        summaryElement.textContent = `총 ${items.length.toLocaleString('ko-KR')}건 · 대기 ${pending.toLocaleString('ko-KR')}건`;
    }

    function renderRequests(items) {
        renderSummary(items);
        if (!items.length) {
            listElement.innerHTML = '';
            emptyElement?.classList.remove('hidden');
            return;
        }
        emptyElement?.classList.add('hidden');
        listElement.innerHTML = items.map((item) => {
            const isPending = item.status === 'PENDING';
            const requestType = requestTypeLabels[item.requestType] || item.requestType || '이벤트 신청';
            const status = statusLabels[item.status] || item.status || '대기';
            const applicant = item.applicantNickname || item.applicantLoginId || `회원 #${item.applicantUserId || '-'}`;
            const title = item.businessName || item.adTitle || '내 광고';
            const stampAmount = Number(item.stampAmount || 0).toLocaleString('ko-KR');
            return `
                <article class="stamp-event-management-item" data-request-id="${sanitizeHTML(item.id)}" data-request-type="${sanitizeHTML(item.requestType || '')}" data-stamp-amount="${sanitizeHTML(item.stampAmount || 0)}">
                    <div class="stamp-event-management-item-head">
                        <div>
                            <strong>${sanitizeHTML(requestType)}</strong>
                            <p>${sanitizeHTML(title)}</p>
                        </div>
                        <span class="stamp-event-management-status stamp-event-management-status--${sanitizeHTML(String(item.status || '').toLowerCase())}">${sanitizeHTML(status)}</span>
                    </div>
                    <dl class="stamp-event-management-meta">
                        <div><dt>신청자</dt><dd>${sanitizeHTML(applicant)}</dd></div>
                        <div><dt>스탬프</dt><dd>${stampAmount}개</dd></div>
                        <div><dt>신청일</dt><dd>${sanitizeHTML(formatDate(item.createdAt))}</dd></div>
                    </dl>
                    ${isPending ? `
                        <div class="stamp-event-management-actions">
                            <button type="button" class="btn btn-primary btn-sm" data-stamp-event-action="approve">승인</button>
                            <button type="button" class="btn btn-outline btn-sm" data-stamp-event-action="reject">반려</button>
                        </div>` : ''}
                </article>
            `;
        }).join('');
    }

    async function loadRequests() {
        setLoading();
        try {
            const status = filterElement?.value || 'PENDING';
            const response = await APIClient.get('/users/me/stamp-event-requests', { status, limit: 100 });
            renderRequests(Array.isArray(response?.content) ? response.content : []);
        } catch (error) {
            listElement.innerHTML = `<div class="stamp-event-management-error">${sanitizeHTML(error.message || '신청 내역을 불러오지 못했습니다.')}</div>`;
            emptyElement?.classList.add('hidden');
        }
    }

    function getStampUseOwnerDeductionAmount(stampAmount) {
        const amount = Math.max(0, Number(stampAmount || 0));
        return Math.floor(amount / 10) + 1;
    }

    function getStampUseOwnerRewardAmount(stampAmount) {
        const amount = Math.max(0, Number(stampAmount || 0));
        return Math.max(0, amount - getStampUseOwnerDeductionAmount(amount));
    }

    async function reviewRequest(requestId, status, itemElement) {
        const stampAmount = Number(itemElement?.dataset.stampAmount || 0);
        const ownerRewardAmount = getStampUseOwnerRewardAmount(stampAmount);
        const isVisitVerification = itemElement?.dataset.requestType === 'VISIT_VERIFICATION';
        const approveMessage = isVisitVerification
            ? '승인시 스탬프 1개가 차감됩니다. 승인하시겠습니까?'
            : `승인시 신청자에게서 스탬프 ${stampAmount.toLocaleString('ko-KR')}개가 차감되고 광고주에게 ${ownerRewardAmount.toLocaleString('ko-KR')}개가 지급됩니다. 승인하시겠습니까?`;
        const confirmMessage = status === 'APPROVED'
            ? approveMessage
            : '이 신청을 반려하시겠습니까?';
        if (!window.confirm(confirmMessage)) return;

        try {
            await APIClient.patch(`/users/me/stamp-event-requests/${encodeURIComponent(requestId)}`, {
                status
            });
            alert(status === 'APPROVED' ? '승인되었습니다.' : '반려되었습니다.');
            await loadRequests();
        } catch (error) {
            alert(error.message || '처리하지 못했습니다.');
        }
    }

    listElement.addEventListener('click', (event) => {
        const button = event.target.closest('[data-stamp-event-action]');
        if (!button) return;
        const item = button.closest('[data-request-id]');
        const requestId = item?.dataset.requestId;
        if (!requestId) return;
        const action = button.dataset.stampEventAction;
        reviewRequest(requestId, action === 'approve' ? 'APPROVED' : 'REJECTED', item);
    });

    filterElement?.addEventListener('change', loadRequests);
    loadRequests();
})();
