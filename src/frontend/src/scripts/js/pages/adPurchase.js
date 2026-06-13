/**
 * 파일 역할: ad-purchase 페이지에서 비즈니스 스탬프로 업체 광고 ON/OFF 활성화를 처리하는 스크립트 파일.
 */
(() => {
    const tabs = Array.from(document.querySelectorAll('.ad-plan-tab'));
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

    if (!tabs.length || !featureList || !priceOptions || !selectedProduct || !stampCost || !durationText || !stampBalance || !activationButton) {
        return;
    }

    const plans = {
        basic: {
            code: 'BASIC',
            name: '베이직 광고',
            durationDays: 3,
            features: [
                { text: '스탬프 1개로 업체정보 3일 노출', enabled: true },
                { text: '광고 등록만으로는 업체정보에 노출되지 않음', enabled: true },
                { text: '활성화 ON 시 즉시 노출 시작', enabled: true }
            ]
        },
        plus: {
            code: 'PLUS',
            name: '플러스 광고',
            durationDays: 2,
            features: [
                { text: '스탬프 1개로 업체정보 2일 노출', enabled: true },
                { text: '베이직보다 높은 광고 등급으로 표시', enabled: true },
                { text: '활성화 ON 시 즉시 노출 시작', enabled: true }
            ]
        },
        premium: {
            code: 'PREMIUM',
            name: '프리미엄 광고',
            durationDays: 1,
            features: [
                { text: '스탬프 1개로 업체정보 1일 노출', enabled: true },
                { text: '지역 상단 우선 노출 대상', enabled: true },
                { text: '활성화 ON 시 즉시 노출 시작', enabled: true }
            ]
        }
    };

    const state = {
        plan: 'basic',
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
        return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const isRegisteredAd = () => String(state.ad?.registrationStatus || '').toUpperCase() === 'REGISTERED';
    const isSwitchOn = () => Boolean(Number(state.ad?.isActive || 0));
    const isVisible = () => Boolean(Number(state.ad?.isCurrentlyVisible || 0));

    const render = () => {
        const currentPlan = plans[state.plan];
        if (!currentPlan) return;

        tabs.forEach((tab) => {
            const isActive = tab.dataset.plan === state.plan;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        featureList.innerHTML = currentPlan.features
            .map((item) => `<li class="${item.enabled ? 'is-enabled' : 'is-disabled'}">${item.text}</li>`)
            .join('');

        priceOptions.innerHTML = `<button type="button" class="ad-price-option is-selected" data-days="${currentPlan.durationDays}">
            <div><strong>스탬프 1개 / ${currentPlan.durationDays}일</strong></div>
            <span class="ad-price-check is-selected" aria-hidden="true">●</span>
        </button>`;

        selectedProduct.textContent = currentPlan.name;
        stampCost.textContent = '스탬프 1개';
        durationText.textContent = `${currentPlan.durationDays}일`;
        stampBalance.textContent = `${Number(state.totalStamps || 0).toLocaleString('ko-KR')}개`;

        const registered = isRegisteredAd();
        const checked = isSwitchOn();
        const visible = isVisible();
        const expiresAt = formatDate(state.ad?.activatedUntil);
        const canToggle = Boolean(state.ad?.id) && registered && !state.isSubmitting;

        if (activationToggle) {
            activationToggle.disabled = !canToggle;
            activationToggle.checked = checked;
        }
        if (activationToggleLabel) {
            activationToggleLabel.textContent = `광고 활성화 ${checked ? 'ON' : 'OFF'}`;
        }

        if (!state.ad) {
            activationStatus.textContent = '등록된 광고프로필이 없습니다. 광고프로필을 먼저 등록해주세요.';
        } else if (!registered) {
            activationStatus.textContent = '임시저장 상태입니다. 광고프로필을 등록 완료한 뒤 활성화할 수 있습니다.';
        } else if (visible && expiresAt) {
            activationStatus.textContent = checked
                ? `현재 업체정보에 노출 중입니다. 만료 예정: ${expiresAt}`
                : `활성화는 OFF 상태입니다. 진행 중인 광고는 ${expiresAt}까지 노출됩니다.`;
        } else {
            activationStatus.textContent = `${currentPlan.name}은 스탬프 1개를 사용해 ${currentPlan.durationDays}일간 업체정보에 노출됩니다.`;
        }

        activationButton.disabled = !canToggle || (checked && !visible);
        activationButton.textContent = checked ? '광고 활성화 OFF' : '광고 활성화 ON';
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
            state.plan = normalizePlanKey(tab.dataset.plan || 'basic');
            render();
        });
    });

    activationToggle?.addEventListener('change', (event) => {
        updateActivation(Boolean(event.target.checked));
    });

    activationButton.addEventListener('click', () => {
        updateActivation(!isSwitchOn());
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
