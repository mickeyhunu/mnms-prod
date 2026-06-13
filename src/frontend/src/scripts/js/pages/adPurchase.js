/**
 * 파일 역할: ad-purchase 페이지에서 비즈니스 스탬프로 업체 광고 ON/OFF 활성화를 처리하는 스크립트 파일.
 */
(() => {
    const tabs = Array.from(document.querySelectorAll('.ad-product-card, .ad-plan-tab'));
    const featureList = document.getElementById('ad-plan-features');
    const priceOptions = document.getElementById('ad-price-options');
    const selectedProduct = document.getElementById('ad-selected-product');
    const stampCost = document.getElementById('ad-product-price');
    const durationText = document.getElementById('ad-vat-price');
    const stampBalance = document.getElementById('ad-total-price');
    const activationStatus = document.getElementById('ad-activation-current-status');
    const activationToggle = document.getElementById('ad-purchase-activation-toggle');
    const activationToggleLabel = document.getElementById('ad-purchase-activation-toggle-label');
    const activationButton = document.getElementById('ad-purchase-submit');
    const statusPill = document.getElementById('ad-management-status-pill');
    const statusTitle = document.getElementById('ad-management-status-title');
    const expireDate = document.getElementById('ad-management-expire-date');
    const remainingTime = document.getElementById('ad-management-remaining-time');
    const stampBalanceSummary = document.getElementById('ad-summary-stamp-balance');
    const stampAfterUse = document.getElementById('ad-stamps-after-use');
    const stampProgressBar = document.getElementById('ad-stamp-progress-bar');
    const stampProgressText = document.getElementById('ad-stamp-progress-text');
    const estimatedRunDays = document.getElementById('ad-estimated-run-days');
    const estimatedRunUntil = document.getElementById('ad-estimated-run-until');
    const activationStampBalance = document.getElementById('ad-activation-stamp-balance');
    const activationBenefitTitle = document.getElementById('ad-activation-benefit-title');

    if (!tabs.length || !featureList || !selectedProduct || !stampCost || !durationText || !stampBalance) {
        return;
    }

    const plans = {
        basic: {
            code: 'BASIC',
            name: '베이직 광고',
            headline: '지역 목록 일반 노출',
            durationDays: 3,
            features: [
                { text: '스탬프 1개로 업체정보 3일 노출', enabled: true },
                { text: '수동 활성화 시 스탬프 1개 소모', enabled: true },
                { text: '자동연장 ON 시 기간 종료마다 스탬프 1개 자동 소모', enabled: true }
            ]
        },
        plus: {
            code: 'PLUS',
            name: '플러스 광고',
            headline: '지역 상단 우선 노출',
            durationDays: 2,
            features: [
                { text: '스탬프 1개로 업체정보 2일 노출', enabled: true },
                { text: '베이직보다 높은 광고 등급으로 표시', enabled: true },
                { text: '자동연장 ON 시 기간 종료마다 스탬프 1개 자동 소모', enabled: true }
            ]
        },
        premium: {
            code: 'PREMIUM',
            name: '프리미엄 광고',
            headline: '지역 상단 최우선 노출',
            durationDays: 1,
            features: [
                { text: '스탬프 1개로 업체정보 1일 노출', enabled: true },
                { text: '지역 상단 우선 노출 대상', enabled: true },
                { text: '자동연장 ON 시 기간 종료마다 스탬프 1개 자동 소모', enabled: true }
            ]
        }
    };

    const state = {
        plan: 'premium',
        ad: null,
        totalStamps: 0,
        isSubmitting: false
    };

    const planCodesByApiCode = Object.entries(plans).reduce((acc, [key, plan]) => {
        acc[plan.code] = key;
        return acc;
    }, {});

    const normalizePlanKey = (value) => {
        const normalized = String(value || '').trim().toUpperCase();
        return planCodesByApiCode[normalized] || (plans[value] ? value : 'basic');
    };

    const formatDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const isRegisteredAd = () => String(state.ad?.registrationStatus || '').toUpperCase() === 'REGISTERED';
    const isSwitchOn = () => Boolean(Number(state.ad?.isActive || 0));
    const isVisible = () => Boolean(Number(state.ad?.isCurrentlyVisible || 0));
    const activePlanKey = () => (isSwitchOn() ? normalizePlanKey(state.ad?.planType) : null);
    const exposedPlanKey = () => (isVisible() ? normalizePlanKey(state.ad?.planType) : null);

    const formatRemainingTime = (value) => {
        if (!value) return '활성화 대기 중';
        const date = new Date(value);
        const diff = date.getTime() - Date.now();
        if (Number.isNaN(date.getTime()) || diff <= 0) return '종료됨';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${minutes}분 남음`;
    };

    const formatDateOnly = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const formatProjectedUntil = (days) => {
        const date = new Date(Date.now() + Number(days || 0) * 24 * 60 * 60 * 1000);
        return `(${date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}까지)`;
    };

    const render = () => {
        const lockedPlan = activePlanKey();
        if (lockedPlan) {
            state.plan = lockedPlan;
        }
        const currentPlan = plans[state.plan];
        if (!currentPlan) return;

        tabs.forEach((tab) => {
            const planKey = normalizePlanKey(tab.dataset.plan || 'basic');
            const isActive = planKey === state.plan;
            const isDisabled = Boolean(lockedPlan && planKey !== lockedPlan);
            tab.classList.toggle('is-active', isActive);
            tab.classList.toggle('is-disabled', isDisabled);
            tab.disabled = isDisabled;
            tab.setAttribute('aria-selected', String(isActive));
            tab.setAttribute('aria-disabled', String(isDisabled));
        });

        featureList.innerHTML = currentPlan.features
            .map((item) => `<li class="${item.enabled ? 'is-enabled' : 'is-disabled'}">${item.text}</li>`)
            .join('');

        if (priceOptions) {
            priceOptions.innerHTML = `<button type="button" class="ad-price-option is-selected" data-days="${currentPlan.durationDays}">
                <div><strong>스탬프 1개 / ${currentPlan.durationDays}일</strong></div>
                <span class="ad-price-check is-selected" aria-hidden="true">●</span>
            </button>`;
        }

        const registered = isRegisteredAd();
        const checked = isSwitchOn();
        const visible = isVisible();
        const expiresAt = formatDate(state.ad?.activatedUntil);
        const canToggle = Boolean(state.ad?.id) && registered && !state.isSubmitting;

        selectedProduct.textContent = currentPlan.name;
        stampCost.textContent = '스탬프 1개';
        durationText.textContent = `${currentPlan.durationDays}일`;
        const totalStamps = Number(state.totalStamps || 0);
        const remainingStamps = Math.max(totalStamps - 1, 0);
        const estimatedDays = totalStamps * currentPlan.durationDays;
        stampBalance.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        if (stampBalanceSummary) stampBalanceSummary.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        if (stampAfterUse) stampAfterUse.textContent = `${remainingStamps.toLocaleString('ko-KR')}개`;
        if (stampProgressBar) stampProgressBar.style.width = `${Math.min(totalStamps, 100)}%`;
        if (stampProgressText) stampProgressText.textContent = totalStamps.toLocaleString('ko-KR');
        if (estimatedRunDays) estimatedRunDays.textContent = `${estimatedDays.toLocaleString('ko-KR')}일`;
        if (estimatedRunUntil) estimatedRunUntil.textContent = totalStamps ? formatProjectedUntil(estimatedDays) : '';
        if (activationStampBalance) activationStampBalance.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        if (activationBenefitTitle) activationBenefitTitle.textContent = `${currentPlan.name}를 활성화하면`;
        if (activationButton) activationButton.textContent = visible ? (checked ? '자동연장 끄기' : '현재 기간 후 중지 예정') : `⚡ 1 스탬프 사용하고 광고 시작하기`;

        const visiblePlan = plans[exposedPlanKey()] || currentPlan;
        if (statusPill) statusPill.textContent = visible ? '노출 중' : (checked ? '자동연장 ON' : '비활성');
        if (statusTitle) statusTitle.textContent = visible ? `${visiblePlan.name}가 노출 중입니다` : '노출 중인 광고가 없습니다';
        if (expireDate) expireDate.textContent = visible ? formatDateOnly(state.ad?.activatedUntil) : '-';
        if (remainingTime) remainingTime.textContent = visible ? formatRemainingTime(state.ad?.activatedUntil) : '활성화 대기 중';
        if (activationToggle) {
            activationToggle.disabled = !canToggle;
            activationToggle.checked = checked;
        }
        if (activationToggleLabel) {
            activationToggleLabel.textContent = `자동연장 ${checked ? 'ON' : 'OFF'}`;
        }

        if (!state.ad) {
            activationStatus.textContent = '등록된 광고프로필이 없습니다. 광고프로필을 먼저 등록해주세요.';
        } else if (!registered) {
            activationStatus.textContent = '임시저장 상태입니다. 광고프로필을 등록 완료한 뒤 활성화할 수 있습니다.';
        } else if (visible && expiresAt) {
            activationStatus.textContent = checked
                ? `현재 업체정보에 노출 중입니다. 자동연장 ON 상태이며 만료 예정: ${expiresAt}`
                : `자동연장은 OFF 상태입니다. 진행 중인 광고는 ${expiresAt}까지 노출됩니다.`;
        } else {
            activationStatus.textContent = `${currentPlan.name}은 수동 활성화 시 스탬프 1개를 사용해 ${currentPlan.durationDays}일간 업체정보에 노출됩니다.`;
        }

        if (activationButton) {
            activationButton.disabled = !canToggle || (visible && !checked);
            activationButton.textContent = visible ? (checked ? '자동연장 끄기' : '현재 기간 후 중지 예정') : '⚡ 1 스탬프 사용하고 광고 시작하기';
        }
    };

    const loadActivationData = async () => {
        const [adsResponse, stampResponse] = await Promise.all([
            APIClient.get('/users/me/business-ads'),
            APIClient.get('/users/me/stamps')
        ]);
        state.ad = Array.isArray(adsResponse?.content) ? adsResponse.content[0] : null;
        state.totalStamps = Number(stampResponse?.totalStamps || 0);
        if (state.ad?.planType) {
            state.plan = normalizePlanKey(state.ad.planType);
        }
        render();
    };

    const updateActivation = async (nextActive) => {
        if (!state.ad?.id || state.isSubmitting) return;
        const currentPlan = plans[state.plan];
        try {
            state.isSubmitting = true;
            render();
            const response = await APIClient.patch(`/users/me/business-ads/${state.ad.id}/activation`, {
                isActive: nextActive,
                planType: currentPlan.code
            });
            alert(response?.message || '광고 활성화 상태가 변경되었습니다.');
            state.ad = response?.content || state.ad;
            state.totalStamps = Number(response?.totalStamps ?? state.totalStamps);
        } catch (error) {
            alert(error.message || '광고 활성화 처리에 실패했습니다.');
        } finally {
            state.isSubmitting = false;
            render();
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            if (tab.disabled) return;
            const nextPlan = normalizePlanKey(tab.dataset.plan || 'basic');
            const lockedPlan = activePlanKey();
            if (lockedPlan && nextPlan !== lockedPlan) return;
            state.plan = nextPlan;
            render();
        });
    });

    activationToggle?.addEventListener('change', (event) => {
        updateActivation(Boolean(event.target.checked));
    });

    activationButton?.addEventListener('click', () => {
        updateActivation(!isVisible());
    });


    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    loadActivationData().catch((error) => {
        activationStatus.textContent = error.message || '광고 활성화 정보를 불러오지 못했습니다.';
        render();
    });
})();
