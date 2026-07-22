/**
 * 파일 역할: ad-purchase 페이지에서 비즈니스 스탬프로 업체 광고 ON/OFF 활성화를 처리하는 스크립트 파일.
 */
(() => {
    const tabs = Array.from(document.querySelectorAll('.ad-product-card, .ad-plan-tab'));
    const categoryTabs = Array.from(document.querySelectorAll('.ad-category-tab'));
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
            durationUnit: 'day',
            durationLabel: '3일',
            stampCount: 1,
            badgeImage: '/src/assets/ad-plan-badges/basic-badge.png',
            badgeAlt: 'BASIC',
            features: [
                { text: '스탬프 1개로 업체정보 3일 노출', enabled: true },
                { text: '1일 점프 6개', enabled: true },
                { text: '수동 활성화 시 스탬프 1개 소모', enabled: true },
            ]
        },
        plus: {
            code: 'PLUS',
            name: '플러스 광고',
            headline: '지역 상단 우선 노출',
            durationDays: 2,
            durationUnit: 'day',
            durationLabel: '2일',
            stampCount: 1,
            badgeImage: '/src/assets/ad-plan-badges/plus-badge.png',
            badgeAlt: 'PLUS',
            features: [
                { text: '스탬프 1개로 업체정보 2일 노출', enabled: true },
                { text: '1일 점프 9개', enabled: true },
                { text: '베이직보다 높은 광고 등급으로 표시', enabled: true },
            ]
        },
        premium: {
            code: 'PREMIUM',
            name: '프리미엄 광고',
            headline: '지역 상단 최우선 노출',
            durationDays: 1,
            durationUnit: 'day',
            durationLabel: '1일',
            stampCount: 1,
            badgeImage: '/src/assets/ad-plan-badges/premium-badge.png',
            badgeAlt: 'PREMIUM',
            features: [
                { text: '스탬프 1개로 업체정보 1일 노출', enabled: true },
                { text: '1일 점프 12개', enabled: true },
                { text: '활성화 기간동안 1일 1회 홍보게시글 작성 가능', enabled: true },
                { text: '지역 상단 우선 노출 대상', enabled: true },
            ]
        },
        piece: {
            code: 'PIECE',
            name: '조각제휴 광고',
            headline: '조각제휴 업체정보 노출',
            durationDays: 2,
            durationUnit: 'day',
            durationLabel: '2일',
            stampCount: 1,
            badgeImage: '/src/assets/ad-plan-badges/piece-badge.png',
            badgeAlt: 'PIECE',
            features: [
                { text: '스탬프 1개로 조각 제휴업체에 업체정보 2일 노출', enabled: true },
                { text: '조각제휴 자동연장을 광고별로 별도 관리', enabled: true },
                { text: '기간 만료 시 스탬프 1개로 자동연장 가능', enabled: true },
            ]
        },
        banner: {
            code: 'BANNER',
            name: '배너 광고',
            headline: '배너광고 노출',
            durationDays: 1,
            durationUnit: 'day',
            durationLabel: '1일',
            stampCount: 1,
            badgeImage: '/src/assets/ad-plan-badges/none-badge.png',
            badgeAlt: 'BANNER',
            features: [
                { text: '플랜별 스탬프 갯수로 배너광고 노출', enabled: true },
            ]
        }
    };

    const noneBadgeImage = '/src/assets/ad-plan-badges/none-badge.png';
    const ACTIVATION_REQUIREMENT_MESSAGE = '사업자정보 또는 광고프로필이 등록 상태여야 광고를 활성화할 수 있습니다.';

    const state = {
        category: 'business',
        plan: 'premium',
        ad: null,
        businessProfile: null,
        totalStamps: 0,
        isSubmitting: false
    };

    const DURATION_UNIT_TO_MS = { minute: 60 * 1000, day: 24 * 60 * 60 * 1000 };

    const getPlanDurationMs = (plan) => Number(plan?.durationDays || 0) * (DURATION_UNIT_TO_MS[plan?.durationUnit] || DURATION_UNIT_TO_MS.day);

    const getPlanDurationUnitLabel = (plan) => plan?.durationUnit === 'minute' ? '분' : '일';

    const updatePlanCostLabels = () => {
        tabs.forEach((tab) => {
            const plan = plans[normalizePlanKey(tab.dataset.plan || 'basic')];
            const costLabel = tab.querySelector('.ad-product-cost b');
            if (plan && costLabel) costLabel.textContent = `1개 / ${plan.durationLabel || `${plan.durationDays}${getPlanDurationUnitLabel(plan)}`}`;
        });
    };

    const applyPlanDurationConfig = (config) => {
        if (!config || typeof config !== 'object') return;
        Object.values(plans).forEach((plan) => {
            const planConfig = config[plan.code];
            if (!planConfig) return;
            const duration = Number(planConfig.duration || planConfig.durationDays || 0);
            if (Number.isFinite(duration) && duration > 0) plan.durationDays = duration;
            plan.durationUnit = planConfig.durationUnit === 'minute' ? 'minute' : 'day';
            plan.durationLabel = planConfig.durationLabel || `${plan.durationDays}${getPlanDurationUnitLabel(plan)}`;
            if (plan.features?.[0]) plan.features[0].text = plan.code === 'PIECE' ? `스탬프 1개로 조각 제휴업체에 업체정보 ${plan.durationLabel} 노출` : `스탬프 1개로 업체정보 ${plan.durationLabel} 노출`;
        });
        updatePlanCostLabels();
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
    const getPlanCategory = (planKey) => planKey === 'piece' || planKey === 'banner' ? planKey : 'business';
    const normalizeCategoryKey = (value) => ['business', 'piece', 'banner'].includes(value) ? value : 'business';
    const selectCategory = (category) => {
        state.category = normalizeCategoryKey(category);
        if (state.category === 'piece') {
            state.plan = 'piece';
        } else if (state.category === 'banner') {
            state.plan = 'banner';
        } else if (state.category === 'business' && getPlanCategory(state.plan) !== 'business') {
            state.plan = 'premium';
        }
    };
    const getPlanStampCount = (plan) => Math.max(1, Number(plan?.stampCount || 1));
    const getActivationProductName = () => {
        if (state.category === 'piece') return '조각제휴광고';
        if (state.category === 'banner') return '배너광고';
        return '업체광고';
    };
    const getActivationButtonLabel = (plan, { visible, checked }) => {
        if (visible) return checked ? '자동연장 끄기' : '기간 만료 후 중지 예정';
        return `⚡ ${getPlanStampCount(plan).toLocaleString('ko-KR')} 스탬프 사용하고 ${getActivationProductName()} 시작하기`;
    };
    const isPiecePlan = () => state.plan === 'piece';
    const isBusinessSwitchOn = () => Boolean(Number(state.ad?.isActive || 0));
    const isBusinessVisible = () => Boolean(Number(state.ad?.isCurrentlyVisible || 0));
    const isPieceSwitchOn = () => Boolean(Number(state.ad?.isPieceActive || 0));
    const isPieceVisible = () => Boolean(Number(state.ad?.isPieceCurrentlyVisible || 0));
    const isSwitchOn = () => isPiecePlan() ? isPieceSwitchOn() : isBusinessSwitchOn();
    const isVisible = () => isPiecePlan() ? isPieceVisible() : isBusinessVisible();
    const activeBusinessPlanKey = () => (isBusinessSwitchOn() ? normalizePlanKey(state.ad?.planType) : null);
    const exposedBusinessPlanKey = () => (isBusinessVisible() ? normalizePlanKey(state.ad?.planType) : null);
    const lockedBusinessPlanKey = () => activeBusinessPlanKey() || exposedBusinessPlanKey();
    const exposedPlanKey = () => (isVisible() ? (isPiecePlan() ? 'piece' : normalizePlanKey(state.ad?.planType)) : null);

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

    const formatProjectedExposureUntil = (durationMs) => {
        const date = new Date(Date.now() + Number(durationMs || 0));
        const now = new Date();
        const timeText = date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (date.toDateString() === now.toDateString()) {
            return `${timeText}까지`;
        }

        const dateText = date.toLocaleDateString('ko-KR', {
            month: 'numeric',
            day: 'numeric'
        });

        if (date.getFullYear() === now.getFullYear()) {
            return `${dateText} ${timeText}까지`;
        }

        const yearText = String(date.getFullYear()).slice(-2);
        return `${yearText}. ${dateText} ${timeText}까지`;
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
        return new Date(until.getTime() - getPlanDurationMs(plan));
    };

    const render = () => {
        const lockedBusinessPlan = lockedBusinessPlanKey();
        if (state.category === 'business' && lockedBusinessPlan) {
            state.plan = lockedBusinessPlan;
        }
        const currentPlan = plans[state.plan];
        if (!currentPlan) return;

        tabs.forEach((tab) => {
            const planKey = normalizePlanKey(tab.dataset.plan || 'basic');
            const tabCategory = normalizeCategoryKey(tab.dataset.category || getPlanCategory(planKey));
            const isInSelectedCategory = tabCategory === state.category;
            const isActive = isInSelectedCategory && planKey === state.plan;
            const isDisabled = tabCategory === 'business' && Boolean(lockedBusinessPlan && planKey !== lockedBusinessPlan);
            tab.classList.toggle('hidden', !isInSelectedCategory);
            tab.classList.toggle('is-active', isActive);
            tab.classList.toggle('is-disabled', isDisabled);
            tab.disabled = !isInSelectedCategory || isDisabled;
            tab.setAttribute('aria-selected', String(isActive));
            tab.setAttribute('aria-disabled', String(!isInSelectedCategory || isDisabled));
        });

        categoryTabs.forEach((tab) => {
            const tabCategory = normalizeCategoryKey(tab.dataset.category);
            const isActiveCategory = tabCategory === state.category;
            tab.classList.toggle('is-active', isActiveCategory);
            tab.setAttribute('aria-selected', String(isActiveCategory));
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
        const meetsActivationRequirements = registered && businessProfileRegistered;
        const canToggle = Boolean(state.ad?.id) && meetsActivationRequirements && !state.isSubmitting;
        const canClickActivationButton = state.category !== 'banner' && Boolean(state.ad?.id) && !state.isSubmitting && (!visible || checked);

        selectedProduct.textContent = currentPlan.name;
        stampCost.textContent = '스탬프 1개';
        durationText.textContent = currentPlan.durationLabel || `${currentPlan.durationDays}일`;
        const totalStamps = Number(state.totalStamps || 0);
        const remainingStamps = Math.max(totalStamps - 1, 0);
        const exposureDuration = Number(currentPlan.durationDays || 0);
        const estimatedDuration = totalStamps * exposureDuration;
        if (stampBalanceSummary) stampBalanceSummary.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        const remainingStampsText = `${remainingStamps.toLocaleString('ko-KR')}개`;
        const estimatedContinuousRunText = `${estimatedDuration.toLocaleString('ko-KR')}${getPlanDurationUnitLabel(currentPlan)}`;
        const durationMs = getPlanDurationMs(currentPlan);
        const continuousDurationMs = totalStamps * durationMs;
        const estimatedRunText = formatProjectedUntilWithDuration(durationMs, currentPlan.durationLabel || `${exposureDuration}${getPlanDurationUnitLabel(currentPlan)}`);
        const estimatedUntilText = totalStamps ? formatProjectedUntilWithDuration(continuousDurationMs, estimatedContinuousRunText) : '-';
        const estimatedUntilNoteText = totalStamps ? formatProjectedUntilNote(continuousDurationMs) : '';
        if (stampAfterUse) stampAfterUse.textContent = remainingStampsText;
        if (estimatedRunDays) estimatedRunDays.textContent = estimatedRunText;
        if (estimatedRunUntil) estimatedRunUntil.textContent = estimatedUntilText;
        if (activationStampBalance) activationStampBalance.textContent = `${totalStamps.toLocaleString('ko-KR')}개`;
        if (activationBenefitTitle) activationBenefitTitle.textContent = `${currentPlan.name}를 활성화하면`;
        if (activationButton) activationButton.textContent = getActivationButtonLabel(currentPlan, { visible, checked });

        const visiblePlan = plans[exposedPlanKey()] || currentPlan;
        if (statusBadge) {
            statusBadge.src = visible ? visiblePlan.badgeImage : noneBadgeImage;
            statusBadge.alt = visible ? visiblePlan.badgeAlt : '미광고';
        }
        if (statusTitle) statusTitle.textContent = visible ? `${visiblePlan.name}가 노출 중입니다` : '노출 중인 광고가 없습니다';
        const visibleActivatedUntil = isPiecePlan() ? state.ad?.pieceActivatedUntil : state.ad?.activatedUntil;
        const visibleRemainingSeconds = isPiecePlan() ? state.ad?.pieceRemainingSeconds : state.ad?.remainingSeconds;
        if (startDate) startDate.textContent = visible ? formatDateOnly(isPiecePlan() ? state.ad?.pieceActivatedAt : getActivationStartValue(state.ad, visiblePlan)) : '-';
        if (expireDate) expireDate.textContent = visible ? formatDateOnly(visibleActivatedUntil) : '-';
        if (remainingTime) remainingTime.textContent = visible ? formatRemainingTime(visibleActivatedUntil, visibleRemainingSeconds) : '활성화 대기 중';
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
            activationButton.disabled = !canClickActivationButton;
            activationButton.textContent = getActivationButtonLabel(currentPlan, { visible, checked });
        }
    };

    const loadActivationData = async () => {
        const [planResponse, adsResponse, stampResponse, businessProfileResponse] = await Promise.all([
            APIClient.get('/users/me/business-ad-plans'),
            APIClient.get('/users/me/business-ads'),
            APIClient.get('/users/me/stamps'),
            APIClient.get('/users/me/business-profile')
        ]);
        applyPlanDurationConfig(planResponse?.content);
        state.ad = Array.isArray(adsResponse?.content) ? adsResponse.content[0] : null;
        state.businessProfile = businessProfileResponse || null;
        state.totalStamps = Number(stampResponse?.totalStamps || 0);
        if (state.ad?.isPieceCurrentlyVisible || state.ad?.isPieceActive) {
            state.plan = 'piece';
            state.category = 'piece';
        } else if (state.ad?.planType) {
            state.plan = normalizePlanKey(state.ad.planType);
            state.category = getPlanCategory(state.plan);
        }
        render();
    };

    const updateActivation = async (nextActive, { autoRenew = nextActive } = {}) => {
        if (!state.ad?.id || state.isSubmitting) return;
        if (nextActive && (!isRegisteredAd() || !isRegisteredBusinessProfile())) {
            alert(ACTIVATION_REQUIREMENT_MESSAGE);
            render();
            return;
        }
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
            const lockedBusinessPlan = lockedBusinessPlanKey();
            if (getPlanCategory(nextPlan) === 'business' && lockedBusinessPlan && nextPlan !== lockedBusinessPlan) return;
            state.plan = nextPlan;
            state.category = getPlanCategory(nextPlan);
            render();
        });
    });

    categoryTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const nextCategory = normalizeCategoryKey(tab.dataset.category);
            selectCategory(nextCategory);
            render();
        });
    });

    activationToggle?.addEventListener('change', (event) => {
        updateActivation(Boolean(event.target.checked), { autoRenew: Boolean(event.target.checked) });
    });

    activationButton?.addEventListener('click', () => {
        if (isPiecePlan() && !isBusinessVisible()) {
            alert('업체광고가 활성화중인 경우에만 조각제휴 광고를 시작할 수 있습니다.');
            return;
        }
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
