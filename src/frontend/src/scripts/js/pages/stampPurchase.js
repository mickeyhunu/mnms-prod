/**
 * 파일 역할: stamp-purchase 페이지의 스탬프 상품 선택/결제정보 UI를 담당하는 스크립트 파일.
 */
(() => {
    const ORDER_STORAGE_KEY = 'mnmsAdOrderHistory';
    const tabs = Array.from(document.querySelectorAll('[data-stamp-plan]'));
    const featureList = document.getElementById('stamp-plan-features');
    const priceOptions = document.getElementById('stamp-price-options');
    const selectedProduct = document.getElementById('stamp-selected-product');
    const productPrice = document.getElementById('stamp-product-price');
    const vatPrice = document.getElementById('stamp-vat-price');
    const totalPrice = document.getElementById('stamp-total-price');
    const purchaseButton = document.getElementById('stamp-purchase-submit');

    if (!tabs.length || !featureList || !priceOptions || !selectedProduct || !productPrice || !vatPrice || !totalPrice) {
        return;
    }

    const plans = {
        single: {
            name: '스탬프 1개',
            stampCount: 1,
            features: [
                { text: '광고 활성화 및 점프 관리에 사용할 수 있는 스탬프 1개 충전', enabled: true },
                { text: '구매 후 스탬프 사용 내역에서 구매 기록 확인', enabled: true }
            ],
            price: 50000
        },
        three: {
            name: '스탬프 3개',
            stampCount: 3,
            features: [
                { text: '광고 활성화 및 점프 관리에 사용할 수 있는 스탬프 3개 충전', enabled: true },
                { text: '여러 광고 운영 시 필요한 수량을 한 번에 구매', enabled: true }
            ],
            price: 140000
        },
        five: {
            name: '스탬프 5개',
            stampCount: 5,
            features: [
                { text: '광고 활성화 및 점프 관리에 사용할 수 있는 스탬프 5개 충전', enabled: true },
                { text: '장기 운영을 위한 대량 스탬프 패키지', enabled: true }
            ],
            price: 220000
        }
    };

    const state = { plan: 'single' };
    const formatPrice = (value) => `${value.toLocaleString('ko-KR')}원`;

    const readOrderHistory = () => {
        try {
            const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const saveOrderHistory = (orders) => {
        window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders.slice(0, 100)));
    };

    const createOrder = () => {
        const currentPlan = plans[state.plan];
        const vat = Math.round(currentPlan.price * 0.1);

        return {
            id: `STAMP-${Date.now()}`,
            orderedAt: new Date().toISOString(),
            planCode: state.plan,
            planName: currentPlan.name,
            stampCount: currentPlan.stampCount,
            supplyPrice: currentPlan.price,
            vat,
            totalPrice: currentPlan.price + vat,
            status: '결제완료'
        };
    };

    const render = () => {
        const currentPlan = plans[state.plan] || plans.single;

        tabs.forEach((tab) => {
            const isActive = tab.dataset.stampPlan === state.plan;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        featureList.innerHTML = currentPlan.features
            .map((item) => `<li class="${item.enabled ? 'is-enabled' : 'is-disabled'}">${item.text}</li>`)
            .join('');

        priceOptions.innerHTML = `<button type="button" class="ad-price-option is-selected" data-stamp-plan="${state.plan}">
            <div><strong>${currentPlan.name} / ${formatPrice(currentPlan.price)}</strong></div>
            <span class="ad-price-check is-selected" aria-hidden="true">●</span>
        </button>`;

        const vat = Math.round(currentPlan.price * 0.1);
        selectedProduct.textContent = currentPlan.name;
        productPrice.textContent = formatPrice(currentPlan.price);
        vatPrice.textContent = formatPrice(vat);
        totalPrice.textContent = formatPrice(currentPlan.price + vat);
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            state.plan = tab.dataset.stampPlan || 'single';
            render();
        });
    });

    if (purchaseButton) {
        purchaseButton.addEventListener('click', () => {
            const order = createOrder();
            const existingOrders = readOrderHistory();
            saveOrderHistory([order, ...existingOrders]);
            alert('스탬프 구매가 완료되었습니다. 사용 내역에서 확인하실 수 있어요.');
            window.location.href = '/ad-order-history';
        });
    }

    render();
})();
