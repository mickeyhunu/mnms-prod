/**
 * 파일 역할: 점프 관리 페이지에서 업체 광고 점프 잔여 횟수 조회와 수동/자동 점프 사용을 처리하는 스크립트 파일.
 */
(() => {
    const statusBadge = document.getElementById('jump-management-status-badge');
    const statusTitle = document.getElementById('jump-management-status-title');
    const startDate = document.getElementById('jump-management-start-date');
    const expireDate = document.getElementById('jump-management-expire-date');
    const remainingTime = document.getElementById('jump-management-remaining-time');
    const dailyRemaining = document.getElementById('jump-management-daily-remaining');
    const lastJumpedAt = document.getElementById('jump-management-last-jumped-at');
    const manualJumpButton = document.getElementById('jump-management-manual-submit');
    const autoJumpButton = document.getElementById('jump-management-auto-submit');
    const scheduler = document.getElementById('jump-management-scheduler');
    const scheduleTimeInput = document.getElementById('jump-management-schedule-time');
    const addScheduleButton = document.getElementById('jump-management-add-schedule');
    const clearScheduleButton = document.getElementById('jump-management-clear-schedule');
    const schedulerHelp = document.getElementById('jump-management-scheduler-help');
    const scheduleList = document.getElementById('jump-management-schedule-list');

    if (!manualJumpButton || !autoJumpButton) return;

    const COOLDOWN_SECONDS = 10 * 60;
    const STORAGE_KEY = 'mnms.jumpManagement.autoSchedules';
    const planBadges = {
        BASIC: { image: '/src/assets/ad-plan-badges/basic-badge.png', alt: 'BASIC', name: '베이직 광고' },
        PLUS: { image: '/src/assets/ad-plan-badges/plus-badge.png', alt: 'PLUS', name: '플러스 광고' },
        PREMIUM: { image: '/src/assets/ad-plan-badges/premium-badge.png', alt: 'PREMIUM', name: '프리미엄 광고' }
    };
    const noneBadge = { image: '/src/assets/ad-plan-badges/none-badge.png', alt: '미광고', name: '미광고' };

    const state = { ad: null, isSubmitting: false, schedules: [], autoOpen: false, ticker: null };
    const isVisible = () => Boolean(Number(state.ad?.isCurrentlyVisible || 0));
    const getRemainingCount = () => Number(state.ad?.dailyJumpRemaining || 0);

    const readSchedules = () => {
        try {
            const schedules = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(schedules) ? schedules.filter((time) => /^\d{2}:\d{2}$/.test(time)).sort() : [];
        } catch (_) {
            return [];
        }
    };
    const saveSchedules = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.schedules));

    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    };
    const formatClock = (seconds) => {
        const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const restSeconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
    };
    const getCooldownSeconds = () => {
        const serverCooldown = Number(state.ad?.jumpCooldownSeconds);
        if (Number.isFinite(serverCooldown) && serverCooldown > 0 && state.ad?.cooldownLoadedAt) {
            return Math.max(0, serverCooldown - Math.floor((Date.now() - state.ad.cooldownLoadedAt) / 1000));
        }
        if (!state.ad?.jumpedAt) return 0;
        const jumpedAt = new Date(state.ad.jumpedAt).getTime();
        if (Number.isNaN(jumpedAt)) return 0;
        return Math.max(0, COOLDOWN_SECONDS - Math.floor((Date.now() - jumpedAt) / 1000));
    };
    const formatRemainingTime = (value, remainingSeconds) => {
        const serverRemainingSeconds = Number(remainingSeconds);
        const diff = Number.isFinite(serverRemainingSeconds) ? serverRemainingSeconds * 1000 : (value ? new Date(value).getTime() - Date.now() : 0);
        if (diff <= 0) return '종료됨';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${minutes}분 남음`;
    };

    const renderScheduleList = () => {
        if (!scheduleList) return;
        scheduleList.innerHTML = '';
        state.schedules.forEach((time) => {
            const item = document.createElement('li');
            item.innerHTML = `<span>${time}</span><button type="button" class="btn btn-outline btn-sm" data-schedule-time="${time}">삭제</button>`;
            scheduleList.appendChild(item);
        });
    };

    const render = () => {
        const visible = isVisible();
        const dailyJumpRemaining = getRemainingCount();
        const cooldownSeconds = getCooldownSeconds();
        const canJump = visible && !state.isSubmitting && dailyJumpRemaining > 0 && cooldownSeconds <= 0;
        const badge = visible ? (planBadges[String(state.ad?.planType || '').toUpperCase()] || noneBadge) : noneBadge;

        if (statusBadge) { statusBadge.src = badge.image; statusBadge.alt = badge.alt; }
        if (statusTitle) statusTitle.textContent = visible ? `${badge.name} 점프를 사용할 수 있습니다` : '노출 중인 광고가 없습니다';
        if (startDate) startDate.textContent = visible ? formatDateTime(state.ad?.activatedAt) : '-';
        if (expireDate) expireDate.textContent = visible ? formatDateTime(state.ad?.activatedUntil) : '-';
        if (remainingTime) remainingTime.textContent = visible ? formatRemainingTime(state.ad?.activatedUntil, state.ad?.remainingSeconds) : '활성화 대기 중';
        if (dailyRemaining) dailyRemaining.textContent = visible ? `${dailyJumpRemaining.toLocaleString('ko-KR')}개` : '-';
        if (lastJumpedAt) lastJumpedAt.textContent = visible && state.ad?.jumpedAt ? formatDateTime(state.ad.jumpedAt) : '-';
        manualJumpButton.disabled = !canJump;
        manualJumpButton.textContent = !visible
            ? '수동 점프'
            : (cooldownSeconds > 0 ? `수동 점프 (${formatClock(cooldownSeconds)})` : `수동 점프 (${dailyJumpRemaining.toLocaleString('ko-KR')}개 남음)`);
        autoJumpButton.disabled = !visible || state.isSubmitting || dailyJumpRemaining <= 0;
        autoJumpButton.textContent = !visible ? '자동 점프' : (state.schedules.length ? `자동 점프 관리 (${state.schedules.length}개)` : '자동 점프');
        if (scheduler) scheduler.hidden = !state.autoOpen;
        if (addScheduleButton) addScheduleButton.disabled = !visible || state.schedules.length >= dailyJumpRemaining;
        if (schedulerHelp) schedulerHelp.textContent = `오늘 남은 점프 ${dailyJumpRemaining.toLocaleString('ko-KR')}개 기준으로 최대 ${dailyJumpRemaining.toLocaleString('ko-KR')}개까지 등록할 수 있습니다. 점프 후 10분 동안은 자동 실행도 대기합니다.`;
        renderScheduleList();
    };

    const loadJumpData = async () => {
        const response = await APIClient.get('/users/me/business-ads');
        state.ad = Array.isArray(response?.content) ? response.content[0] : null;
        if (state.ad) state.ad.cooldownLoadedAt = Date.now();
        render();
    };

    const useJump = async (mode = 'manual') => {
        if (!state.ad?.id || state.isSubmitting || getCooldownSeconds() > 0) return;
        try {
            state.isSubmitting = true;
            if (mode === 'manual' && state.schedules.length) {
                state.schedules = [];
                saveSchedules();
            }
            render();
            const jumpedAt = new Date().toISOString();
            const previousRemaining = getRemainingCount();
            const response = await APIClient.post(`/users/me/business-ads/${state.ad.id}/jump`);
            state.ad = {
                ...state.ad,
                ...(response?.content || {}),
                jumpedAt: response?.content?.jumpedAt || jumpedAt,
                jumpCooldownSeconds: COOLDOWN_SECONDS,
                dailyJumpRemaining: response?.content?.dailyJumpRemaining ?? Math.max(0, previousRemaining - 1)
            };
            state.ad.cooldownLoadedAt = Date.now();
            render();
            if (mode === 'manual') alert(response?.message || '수동으로 점프를 사용했습니다.');
        } catch (error) {
            if (mode === 'manual') alert(error.message || '점프 사용에 실패했습니다.');
        } finally {
            state.isSubmitting = false;
            render();
        }
    };

    const runDueAutoJump = () => {
        const now = new Date();
        const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (state.schedules.includes(current) && getCooldownSeconds() <= 0 && getRemainingCount() > 0) {
            state.schedules = state.schedules.filter((time) => time !== current);
            saveSchedules();
            useJump('auto');
        }
        render();
    };

    manualJumpButton.addEventListener('click', () => useJump('manual'));
    autoJumpButton.addEventListener('click', () => { state.autoOpen = !state.autoOpen; render(); });
    addScheduleButton?.addEventListener('click', () => {
        const time = scheduleTimeInput?.value;
        if (!/^\d{2}:\d{2}$/.test(time || '')) return alert('자동 점프 시간을 선택해주세요.');
        if (state.schedules.length >= getRemainingCount()) return alert('오늘 남은 점프 개수만큼만 스케줄을 등록할 수 있습니다.');
        if (state.schedules.includes(time)) return alert('이미 등록된 시간입니다.');
        state.schedules = [...state.schedules, time].sort();
        saveSchedules();
        render();
    });
    clearScheduleButton?.addEventListener('click', () => { state.schedules = []; saveSchedules(); render(); });
    scheduleList?.addEventListener('click', (event) => {
        const time = event.target?.dataset?.scheduleTime;
        if (!time) return;
        state.schedules = state.schedules.filter((item) => item !== time);
        saveSchedules();
        render();
    });

    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    state.schedules = readSchedules();
    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    loadJumpData().catch((error) => {
        alert(error.message || '점프 정보를 불러오지 못했습니다.');
        render();
    });
    state.ticker = setInterval(runDueAutoJump, 1000);
})();
