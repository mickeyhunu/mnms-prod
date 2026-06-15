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
    const activationPanel = document.getElementById('ad-management-activation-panel');
    const activationToggle = document.getElementById('ad-purchase-activation-toggle');
    const activationToggleLabel = document.getElementById('ad-purchase-activation-toggle-label');
    const activationButton = document.getElementById('ad-purchase-submit');
    const statusTitle = document.getElementById('ad-management-status-title');
    const statusBadge = document.getElementById('ad-management-status-badge');
    const startDate = document.getElementById('ad-management-start-date');
    const expireDate = document.getElementById('ad-management-expire-date');
    const remainingTime = document.getElementById('ad-management-remaining-time');
    const stampBalanceSummary = document.getElementById('ad-summary-stamp-balance');
    const stampAfterUse = document.getElementById('ad-stamps-after-use');
    const estimatedRunDays = document.getElementById('ad-estimated-run-days');
    const estimatedRunUntil = document.getElementById('ad-estimated-run-until');
    const activationStampBalance = document.getElementById('ad-activation-stamp-balance');
    const activationBenefitTitle = document.getElementById('ad-activation-benefit-title');

    if (!tabs.length || !featureList || !selectedProduct || !stampCost || !durationText) {
        return;
    }

    const plans = {
        basic: {
            code: 'BASIC',
            name: '베이직 광고',
            headline: '지역 목록 일반 노출',
            durationDays: 3,
            durationUnit: 'minute',
            durationLabel: '3분',
            badgeImage: '/src/assets/ad-plan-badges/basic-badge.png',
            badgeAlt: 'BASIC',
            features: [
                { text: '스탬프 1개로 업체정보 3분 노출', enabled: true },
                { text: '점프 6개', enabled: true },
                { text: '수동 활성화 시 스탬프 1개 소모', enabled: true },
                { text: '자동연장 ON 시 기간 종료마다 스탬프 1개 자동 소모', enabled: true }
            ]
        },
        plus: {
            code: 'PLUS',
            name: '플러스 광고',
            headline: '지역 상단 우선 노출',
            durationDays: 2,
            durationUnit: 'minute',
            durationLabel: '2분',
            badgeImage: '/src/assets/ad-plan-badges/plus-badge.png',
            badgeAlt: 'PLUS',
            features: [
                { text: '스탬프 1개로 업체정보 2분 노출', enabled: true },
                { text: '점프 9개', enabled: true },
                { text: '베이직보다 높은 광고 등급으로 표시', enabled: true },
                { text: '자동연장 ON 시 기간 종료마다 스탬프 1개 자동 소모', enabled: true }
            ]
        },
        premium: {
            code: 'PREMIUM',
            name: '프리미엄 광고',
            headline: '지역 상단 최우선 노출',
            durationDays: 1,
            durationUnit: 'minute',
            durationLabel: '1분',
            badgeImage: '/src/assets/ad-plan-badges/premium-badge.png',
            badgeAlt: 'PREMIUM',
            features: [
                { text: '스탬프 1개로 업체정보 1분 노출', enabled: true },
                { text: '점프 9개', enabled: true },
                { text: '활성화 기간동안 1일 1회 홍보게시글 작성 가능', enabled: true },
                { text: '지역 상단 우선 노출 대상', enabled: true },
                { text: '자동연장 ON 시 기간 종료마다 스탬프 1개 자동 소모', enabled: true }
            ]
        }
    };

    const noneBadgeImage = '/src/assets/ad-plan-badges/none-badge.png';

    const state = {
        plan: 'premium',
        ad: null,
        businessProfile: null,
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

    const isRegisteredAd = () => String(state.ad?.registrationStatus || '').toUpperCase() === 'REGISTERED';
    const isRegisteredBusinessProfile = () => {
        const registrationStatus = String(state.businessProfile?.registrationStatus || '').toUpperCase();
        const approvalStatus = String(state.businessProfile?.approvalStatus || '').toUpperCase();
        return registrationStatus === 'REGISTERED' && approvalStatus === 'APPROVED';
    };
    const isSwitchOn = () => Boolean(Number(state.ad?.isActive || 0));
    const isVisible = () => Boolean(Number(state.ad?.isCurrentlyVisible || 0));
    const activePlanKey = () => (isSwitchOn() ? normalizePlanKey(state.ad?.planType) : null);
    const exposedPlanKey = () => (isVisible() ? normalizePlanKey(state.ad?.planType) : null);
    const lockedPlanKey = () => activePlanKey() || exposedPlanKey();

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

    const formatDateOnly = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const formatProjectedExposureUntil = (minutes) => {
        const date = new Date(Date.now() + Number(minutes || 0) * 60 * 1000);
        return `${date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })}까지`;
    };

    const formatProjectedUntil = (minutes) => formatProjectedExposureUntil(minutes);
    const formatProjectedUntilWithDuration = (minutes, durationText) => {
        const untilText = formatProjectedUntil(minutes);
        return durationText ? `${untilText} (${durationText})` : untilText;
    };
    const formatProjectedUntilNote = (minutes) => `(최대 자동연장 기간: ${formatProjectedUntil(minutes)})`;

    const getActivationStartValue = (ad, plan) => {
        if (!ad) return null;
        if (ad.activatedAt) return ad.activatedAt;
        if (!ad.activatedUntil) return null;
        const until = new Date(ad.activatedUntil);
        if (Number.isNaN(until.getTime())) return null;
        return new Date(until.getTime() - Number(plan?.durationDays || 0) * 60 * 1000);
    };

    const render = () => {
        const lockedPlan = lockedPlanKey();
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
                <div><strong>스탬프 1개 / ${currentPlan.durationLabel || `${currentPlan.durationDays}일`}</strong></div>
                <span class="ad-price-check is-selected" aria-hidden="true">●</span>
            </button>`;
        }

        const registered = isRegisteredAd();
        const checked = isSwitchOn();
        const visible = isVisible();
        const businessProfileRegistered = isRegisteredBusinessProfile();
        const canToggle = Boolean(state.ad?.id) && registered && businessProfileRegistered && !state.isSubmitting;

        selectedProduct.textContent = currentPlan.name;
        stampCost.textContent = '스탬프 1개';
        durationText.textContent = currentPlan.durationLabel || `${currentPlan.durationDays}일`;
        const totalStamps = Number(state.totalStamps || 0);
        const remainingStamps = Math.max(totalStamps - 1, 0);
        const exposureMinutes = Number(currentPlan.durationDays || 0);
        const estimatedDays = totalStamps * exposureMinutes;
        if (stampBalanceSummary) stampBalanceSummary.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        const remainingStampsText = `${remainingStamps.toLocaleString('ko-KR')}개`;
        const estimatedContinuousRunText = `${estimatedDays.toLocaleString('ko-KR')}${currentPlan.durationUnit === 'minute' ? '분' : '일'}`;
        const estimatedRunText = formatProjectedUntilWithDuration(exposureMinutes, currentPlan.durationLabel || `${exposureMinutes}${currentPlan.durationUnit === 'minute' ? '분' : '일'}`);
        const estimatedUntilText = totalStamps ? formatProjectedUntilWithDuration(estimatedDays, estimatedContinuousRunText) : '-';
        const estimatedUntilNoteText = totalStamps ? formatProjectedUntilNote(estimatedDays) : '';
        if (stampAfterUse) stampAfterUse.textContent = remainingStampsText;
        if (estimatedRunDays) estimatedRunDays.textContent = estimatedRunText;
        if (estimatedRunUntil) estimatedRunUntil.textContent = estimatedUntilText;
        if (activationStampBalance) activationStampBalance.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        if (activationBenefitTitle) activationBenefitTitle.textContent = `${currentPlan.name}를 활성화하면`;
        if (activationButton) activationButton.textContent = visible ? (checked ? '자동연장 끄기' : '기간 만료 후 중지 예정') : `⚡ 1 스탬프 사용하고 광고 시작하기`;

        const visiblePlan = plans[exposedPlanKey()] || currentPlan;
        if (statusBadge) {
            statusBadge.src = visible ? visiblePlan.badgeImage : noneBadgeImage;
            statusBadge.alt = visible ? visiblePlan.badgeAlt : '미광고';
        }
        if (statusTitle) statusTitle.textContent = visible ? `${visiblePlan.name}가 노출 중입니다` : '노출 중인 광고가 없습니다';
        if (startDate) startDate.textContent = visible ? formatDateOnly(getActivationStartValue(state.ad, visiblePlan)) : '-';
        if (expireDate) expireDate.textContent = visible ? formatDateOnly(state.ad?.activatedUntil) : '-';
        if (remainingTime) remainingTime.textContent = visible ? formatRemainingTime(state.ad?.activatedUntil, state.ad?.remainingSeconds) : '활성화 대기 중';
        if (activationPanel) {
            activationPanel.classList.toggle('hidden', !visible);
        }
        if (activationToggle) {
            activationToggle.disabled = !canToggle;
            activationToggle.checked = checked;
        }
        if (activationToggleLabel) {
            activationToggleLabel.textContent = `자동연장 ${checked ? 'ON' : 'OFF'}`;
        }


        if (activationButton) {
            activationButton.disabled = !canToggle || (visible && !checked);
            activationButton.textContent = visible ? (checked ? '자동연장 끄기' : '기간 만료 후 중지 예정') : '⚡ 1 스탬프 사용하고 광고 시작하기';
        }
    };

    const loadActivationData = async () => {
        const [adsResponse, stampResponse, businessProfileResponse] = await Promise.all([
            APIClient.get('/users/me/business-ads'),
            APIClient.get('/users/me/stamps'),
            APIClient.get('/users/me/business-profile')
        ]);
        state.ad = Array.isArray(adsResponse?.content) ? adsResponse.content[0] : null;
        state.businessProfile = businessProfileResponse || null;
        state.totalStamps = Number(stampResponse?.totalStamps || 0);
        if (state.ad?.planType) {
            state.plan = normalizePlanKey(state.ad.planType);
        }
        render();
    };

    const updateActivation = async (nextActive, { autoRenew = nextActive } = {}) => {
        if (!state.ad?.id || state.isSubmitting) return;
        const currentPlan = plans[state.plan];
        try {
            state.isSubmitting = true;
            render();
            const response = await APIClient.patch(`/users/me/business-ads/${state.ad.id}/activation`, {
                isActive: nextActive,
                planType: currentPlan.code,
                autoRenew
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
            const lockedPlan = lockedPlanKey();
            if (lockedPlan && nextPlan !== lockedPlan) return;
            state.plan = nextPlan;
            render();
        });
    });

    activationToggle?.addEventListener('change', (event) => {
        updateActivation(Boolean(event.target.checked), { autoRenew: Boolean(event.target.checked) });
    });

    activationButton?.addEventListener('click', () => {
        updateActivation(!isVisible(), { autoRenew: false });
    });


    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    loadActivationData().catch((error) => {
        alert(error.message || '광고 활성화 정보를 불러오지 못했습니다.');
        render();
    });
})();
