/**
 * 파일 역할: stamp-purchase 페이지의 스탬프 상품 선택/결제정보 UI를 담당하는 스크립트 파일.
 */
(() => {
    const ORDER_STORAGE_KEY = 'mnmsAdOrderHistory';
    const planList = document.getElementById('stamp-plan-list');
    const selectedProduct = document.getElementById('stamp-selected-product');
    const productPrice = document.getElementById('stamp-product-price');
    const vatPrice = document.getElementById('stamp-vat-price');
    const totalPrice = document.getElementById('stamp-total-price');
    const paymentCard = document.getElementById('stamp-payment-card');
    const purchaseButton = document.getElementById('stamp-purchase-submit');
    const purchaseSubmitBar = document.getElementById('stamp-purchase-submit-bar');

    if (!planList || !selectedProduct || !productPrice || !vatPrice || !totalPrice) {
        return;
    }

    const plans = {
        starter: {
            name: '🥉 스타터팩',
            composition: '스탬프 5개',
            stampCount: 5,
            price: 100000
        },
        basic: {
            name: '🥈 베이직팩',
            composition: '스탬프 10개 + 1개',
            stampCount: 11,
            price: 200000
        },
        premium: {
            name: '🥇 프리미엄팩',
            composition: '스탬프 20개 + 3개',
            stampCount: 23,
            price: 400000
        },
        vip: {
            name: '💎 VIP팩',
            composition: '스탬프 30개 + 5개',
            stampCount: 35,
            price: 600000
        }
    };

    const planCodes = Object.keys(plans);
    const state = { plan: null };
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

        if (!currentPlan) {
            return null;
        }

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

    const renderPlanList = () => {
        planList.innerHTML = planCodes
            .map((code) => {
                const plan = plans[code];
                const isSelected = code === state.plan;

                return `<tr class="stamp-plan-row${isSelected ? ' is-selected' : ''}" data-stamp-plan="${code}" aria-current="${isSelected ? 'true' : 'false'}">
                    <th scope="row">
                        <button type="button" class="stamp-plan-select" data-stamp-plan="${code}">
                            <span class="stamp-plan-select-dot" aria-hidden="true"></span>
                            <span>${plan.name}</span>
                        </button>
                    </th>
                    <td>${plan.composition}</td>
                    <td>${formatPrice(plan.price)}</td>
                </tr>`;
            })
            .join('');
    };

    const renderPaymentSummary = () => {
        const currentPlan = plans[state.plan];

        if (!currentPlan) {
            selectedProduct.textContent = '-';
            productPrice.textContent = '-';
            vatPrice.textContent = '-';
            totalPrice.textContent = '-';

            if (paymentCard) {
                paymentCard.classList.add('hidden');
            }

            if (purchaseSubmitBar) {
                purchaseSubmitBar.classList.add('hidden');
            }

            if (purchaseButton) {
                purchaseButton.disabled = true;
            }

            return;
        }

        const vat = Math.round(currentPlan.price * 0.1);

        selectedProduct.textContent = currentPlan.name;
        productPrice.textContent = formatPrice(currentPlan.price);
        vatPrice.textContent = formatPrice(vat);
        totalPrice.textContent = formatPrice(currentPlan.price + vat);

        if (paymentCard) {
            paymentCard.classList.remove('hidden');
        }

        if (purchaseSubmitBar) {
            purchaseSubmitBar.classList.remove('hidden');
        }

        if (purchaseButton) {
            purchaseButton.disabled = false;
        }
    };

    const render = () => {
        renderPlanList();
        renderPaymentSummary();
    };

    planList.addEventListener('click', (event) => {
        const planButton = event.target.closest('[data-stamp-plan]');

        if (!planButton) return;

        const selectedPlan = planButton.dataset.stampPlan;

        if (!plans[selectedPlan]) return;

        state.plan = selectedPlan;
        render();
    });

    if (purchaseButton) {
        purchaseButton.addEventListener('click', () => {
            const order = createOrder();

            if (!order) {
                alert('구매할 스탬프 상품을 선택해주세요.');
                return;
            }

            const existingOrders = readOrderHistory();
            saveOrderHistory([order, ...existingOrders]);
            alert('스탬프 구매가 완료되었습니다. 사용 내역에서 확인하실 수 있어요.');
            window.location.href = '/ad-order-history';
        });
    }

    render();
})();
