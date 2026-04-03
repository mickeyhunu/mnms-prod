/**
 * 파일 역할: ad-purchase 페이지 탭/요금제 상세/결제정보 UI를 담당하는 스크립트 파일.
 */
(() => {
    const tabs = Array.from(document.querySelectorAll('.ad-plan-tab'));
    const featureList = document.getElementById('ad-plan-features');
    const priceOptions = document.getElementById('ad-price-options');
    const selectedProduct = document.getElementById('ad-selected-product');
    const productPrice = document.getElementById('ad-product-price');
    const vatPrice = document.getElementById('ad-vat-price');
    const totalPrice = document.getElementById('ad-total-price');

    if (!tabs.length || !featureList || !priceOptions || !selectedProduct || !productPrice || !vatPrice || !totalPrice) {
        return;
    }

    const plans = {
        basic: {
            name: 'BASIC',
            features: [
                { text: '광고프로필 노출', enabled: true },
                { text: '점프 6개', enabled: true },
                { text: '자동점프 30일', enabled: true }
            ],
            options: [{ days: 30, price: 190000, originalPrice: null }]
        },
        plus: {
            name: 'PLUS',
            features: [
                { text: '광고프로필 노출', enabled: true },
                { text: '점프 9개', enabled: true },
                { text: '자동점프 30일', enabled: true },
                { text: '커뮤니티 홍보글 1일 1회', enabled: true }
            ],
            options: [{ days: 30, price: 390000, originalPrice: null }]
        },
        premium: {
            name: 'PREMIUM',
            features: [
                { text: '지역 상단 광고프로필 노출', enabled: true },
                { text: '점프 12개', enabled: true },
                { text: '자동점프 30일', enabled: true },
                { text: '커뮤니티 홍보글 1일 1회', enabled: true }
            ],
            options: [{ days: 30, price: 590000, originalPrice: null }]
        },
        banner: {
            name: 'BANNER',
            features: [
                { text: '배너광고 최대 20개 등록 가능', enabled: true },
                { text: '배너 영역 랜덤 노출', enabled: true }
            ],
            options: [{ days: 30, price: 500000, originalPrice: null }]
        }
    };

    const state = { plan: 'basic', duration: 30 };
    const formatPrice = (value) => `${value.toLocaleString('ko-KR')}원`;

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

        priceOptions.innerHTML = currentPlan.options
            .map((option) => {
                const checked = option.days === state.duration;
                const originalPrice = option.originalPrice
                    ? `<span class="ad-price-original">${formatPrice(option.originalPrice)}</span>`
                    : '';

                return `<button type="button" class="ad-price-option ${checked ? 'is-selected' : ''}" data-days="${option.days}">
                    <div>${originalPrice}<strong>${option.days}일 / ${formatPrice(option.price)}</strong></div>
                    <span class="ad-price-check ${checked ? 'is-selected' : ''}" aria-hidden="true">${checked ? '●' : '○'}</span>
                </button>`;
            })
            .join('');

        const selectedOption = currentPlan.options.find((option) => option.days === state.duration) || currentPlan.options[0];
        state.duration = selectedOption.days;

        const vat = Math.round(selectedOption.price * 0.1);
        const total = selectedOption.price + vat;
        selectedProduct.textContent = `${currentPlan.name} ${selectedOption.days}일`;
        productPrice.textContent = formatPrice(selectedOption.price);
        vatPrice.textContent = formatPrice(vat);
        totalPrice.textContent = formatPrice(total);
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            state.plan = tab.dataset.plan || 'basic';
            state.duration = 30;
            render();
        });
    });

    priceOptions.addEventListener('click', (event) => {
        const optionButton = event.target.closest('.ad-price-option');
        if (!optionButton) return;
        state.duration = Number(optionButton.dataset.days);
        render();
    });

    render();
})();
