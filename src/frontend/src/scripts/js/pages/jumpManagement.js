/**
 * 파일 역할: 점프 관리 페이지에서 업체 광고 점프 잔여 횟수 조회와 점프 사용을 처리하는 스크립트 파일.
 */
(() => {
    const statusBadge = document.getElementById('jump-management-status-badge');
    const statusTitle = document.getElementById('jump-management-status-title');
    const startDate = document.getElementById('jump-management-start-date');
    const expireDate = document.getElementById('jump-management-expire-date');
    const remainingTime = document.getElementById('jump-management-remaining-time');
    const dailyRemaining = document.getElementById('jump-management-daily-remaining');
    const lastJumpedAt = document.getElementById('jump-management-last-jumped-at');
    const planType = document.getElementById('jump-management-plan-type');
    const registrationStatus = document.getElementById('jump-management-registration-status');
    const jumpButton = document.getElementById('jump-management-submit');

    if (!jumpButton) return;

    const planBadges = {
        BASIC: { image: '/src/assets/ad-plan-badges/basic-badge.png', alt: 'BASIC', name: '베이직 광고' },
        PLUS: { image: '/src/assets/ad-plan-badges/plus-badge.png', alt: 'PLUS', name: '플러스 광고' },
        PREMIUM: { image: '/src/assets/ad-plan-badges/premium-badge.png', alt: 'PREMIUM', name: '프리미엄 광고' }
    };
    const noneBadge = { image: '/src/assets/ad-plan-badges/none-badge.png', alt: '미광고', name: '미광고' };

    const state = { ad: null, isSubmitting: false };
    const isVisible = () => Boolean(Number(state.ad?.isCurrentlyVisible || 0));

    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const formatRemainingTime = (value, remainingSeconds) => {
        const serverRemainingSeconds = Number(remainingSeconds);
        const diff = Number.isFinite(serverRemainingSeconds)
            ? serverRemainingSeconds * 1000
            : (() => {
                if (!value) return 0;
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return 0;
                return date.getTime() - Date.now();
            })();
        if (diff <= 0) return '종료됨';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${minutes}분 남음`;
    };

    const render = () => {
        const visible = isVisible();
        const dailyJumpRemaining = Number(state.ad?.dailyJumpRemaining || 0);
        const badge = visible ? (planBadges[String(state.ad?.planType || '').toUpperCase()] || noneBadge) : noneBadge;

        if (statusBadge) {
            statusBadge.src = badge.image;
            statusBadge.alt = badge.alt;
        }
        if (statusTitle) statusTitle.textContent = visible ? `${badge.name} 점프를 사용할 수 있습니다` : '노출 중인 광고가 없습니다';
        if (startDate) startDate.textContent = visible ? formatDateTime(state.ad?.activatedAt) : '-';
        if (expireDate) expireDate.textContent = visible ? formatDateTime(state.ad?.activatedUntil) : '-';
        if (remainingTime) remainingTime.textContent = visible ? formatRemainingTime(state.ad?.activatedUntil, state.ad?.remainingSeconds) : '활성화 대기 중';
        if (dailyRemaining) dailyRemaining.textContent = visible ? `${dailyJumpRemaining.toLocaleString('ko-KR')}개` : '-';
        if (lastJumpedAt) lastJumpedAt.textContent = visible && state.ad?.jumpedAt ? formatDateTime(state.ad.jumpedAt) : '-';
        if (planType) planType.textContent = state.ad?.planType || '-';
        if (registrationStatus) registrationStatus.textContent = state.ad?.registrationStatus || '-';
        jumpButton.disabled = !visible || state.isSubmitting || dailyJumpRemaining <= 0;
        jumpButton.textContent = visible
            ? `점프 사용하기 (오늘 ${dailyJumpRemaining.toLocaleString('ko-KR')}개 남음)`
            : '광고 활성화 후 점프 사용 가능';
    };

    const loadJumpData = async () => {
        const response = await APIClient.get('/users/me/business-ads');
        state.ad = Array.isArray(response?.content) ? response.content[0] : null;
        render();
    };

    const useJump = async () => {
        if (!state.ad?.id || state.isSubmitting) return;
        try {
            state.isSubmitting = true;
            render();
            const response = await APIClient.post(`/users/me/business-ads/${state.ad.id}/jump`);
            alert(response?.message || '점프를 사용했습니다.');
            state.ad = response?.content || state.ad;
        } catch (error) {
            alert(error.message || '점프 사용에 실패했습니다.');
        } finally {
            state.isSubmitting = false;
            render();
        }
    };

    jumpButton.addEventListener('click', useJump);

    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    loadJumpData().catch((error) => {
        alert(error.message || '점프 정보를 불러오지 못했습니다.');
        render();
    });
})();
