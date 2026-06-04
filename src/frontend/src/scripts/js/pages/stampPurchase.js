/**
 * 파일 역할: stamp-purchase 페이지의 스탬프 상품 선택/결제정보 UI를 담당하는 스크립트 파일.
 */
(() => {
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
    const state = { plan: null, isSubmitting: false };
    const formatPrice = (value) => `${value.toLocaleString('ko-KR')}원`;

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
                purchaseButton.textContent = '스탬프 구매하기';
                purchaseButton.removeAttribute('aria-label');
            }

            return;
        }

        const vat = Math.round(currentPlan.price * 0.1);
        const purchaseButtonText = `${formatPrice(currentPlan.price)} 결제하기`;

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
            purchaseButton.disabled = state.isSubmitting;
            purchaseButton.textContent = state.isSubmitting ? '스탬프 지급 처리 중...' : purchaseButtonText;
            purchaseButton.setAttribute('aria-label', `${currentPlan.name} ${purchaseButtonText}`);
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
        purchaseButton.addEventListener('click', async () => {
            if (state.isSubmitting) return;

            const currentPlan = plans[state.plan];

            if (!currentPlan) {
                alert('구매할 스탬프 상품을 선택해주세요.');
                return;
            }

            if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
                alert('로그인 후 스탬프를 구매할 수 있습니다.');
                window.location.href = '/login';
                return;
            }

            state.isSubmitting = true;
            renderPaymentSummary();

            try {
                const response = await APIClient.post('/users/me/stamps/purchases', { planCode: state.plan });
                const totalStamps = Number(response.totalStamps || 0).toLocaleString('ko-KR');
                alert(`스탬프 구매가 완료되었습니다. 현재 보유 스탬프는 ${totalStamps}개입니다.`);
                window.location.href = '/ad-order-history';
            } catch (error) {
                alert(error.message || '스탬프 구매 처리 중 오류가 발생했습니다.');
            } finally {
                state.isSubmitting = false;
                renderPaymentSummary();
            }
        });
    }

    render();
})();
