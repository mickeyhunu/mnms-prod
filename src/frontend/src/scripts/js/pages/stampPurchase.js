/**
 * 스탬프 상품 선택과 Toss Payments 결제위젯 결제/승인 흐름을 담당한다.
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
    const widgetStatus = document.getElementById('stamp-payment-widget-status');

    if (!planList || !selectedProduct || !productPrice || !vatPrice || !totalPrice) return;

    const plans = {
        starter: { name: '🥉 스타터팩', composition: '스탬프 5개', price: 100000 },
        basic: { name: '🥈 베이직팩', composition: '스탬프 10개 + 1개', price: 200000 },
        premium: { name: '🥇 프리미엄팩', composition: '스탬프 20개 + 3개', price: 400000 },
        vip: { name: '💎 VIP팩', composition: '스탬프 30개 + 5개', price: 600000 }
    };
    const state = { plan: null, isSubmitting: false, payment: null, order: null, setupError: '', setupSequence: 0 };
    const formatPrice = (value) => `${value.toLocaleString('ko-KR')}원`;

    const loadTossPayments = () => new Promise((resolve, reject) => {
        if (window.TossPayments) return resolve(window.TossPayments);
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.onload = () => resolve(window.TossPayments);
        script.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
        document.head.appendChild(script);
    });

    const renderPlanList = () => {
        planList.innerHTML = Object.entries(plans).map(([code, plan]) => {
            const selected = code === state.plan;
            return `<tr class="stamp-plan-row${selected ? ' is-selected' : ''}" data-stamp-plan="${code}" aria-current="${selected}">
                <th scope="row"><button type="button" class="stamp-plan-select" data-stamp-plan="${code}"><span class="stamp-plan-select-dot" aria-hidden="true"></span><span>${plan.name}</span></button></th>
                <td>${plan.composition}</td><td>${formatPrice(plan.price)}</td></tr>`;
        }).join('');
    };

    const renderPaymentSummary = () => {
        const plan = plans[state.plan];
        if (!plan) return;
        const vat = Math.round(plan.price * 0.1);
        selectedProduct.textContent = plan.name;
        productPrice.textContent = formatPrice(plan.price);
        vatPrice.textContent = formatPrice(vat);
        totalPrice.textContent = formatPrice(plan.price + vat);
        paymentCard?.classList.remove('hidden');
        purchaseSubmitBar?.classList.remove('hidden');
        if (purchaseButton) {
            purchaseButton.disabled = state.isSubmitting || !state.order;
            purchaseButton.textContent = state.isSubmitting
                ? '결제 처리 중...'
                : state.setupError
                    ? '결제 설정 확인 필요'
                    : state.order
                        ? `${formatPrice(plan.price + vat)} 결제하기`
                        : '결제수단 준비 중...';
            purchaseButton.setAttribute('aria-label', `${plan.name} ${purchaseButton.textContent}`);
            purchaseButton.title = state.setupError;
        }
    };

    const setupPayment = async (planCode) => {
        const sequence = ++state.setupSequence;
        state.order = null;
        state.payment = null;
        state.setupError = '';
        if (widgetStatus) widgetStatus.textContent = '결제수단을 준비하고 있습니다...';
        renderPaymentSummary();
        try {
            const [order, TossPayments] = await Promise.all([
                APIClient.post('/users/me/stamps/purchases', { planCode }),
                loadTossPayments()
            ]);
            if (sequence !== state.setupSequence) return;
            const payment = TossPayments(order.clientKey).payment({ customerKey: order.customerKey });
            document.getElementById('stamp-payment-methods').replaceChildren();
            document.getElementById('stamp-payment-agreement').replaceChildren();
            state.payment = payment;
            state.order = order;
            if (widgetStatus) widgetStatus.textContent = '결제하기 버튼을 누르면 카드·간편결제 결제창이 열립니다.';
        } catch (error) {
            if (sequence !== state.setupSequence) return;
            state.setupError = error.message || '결제수단을 준비하지 못했습니다.';
            if (widgetStatus) widgetStatus.textContent = `${state.setupError} 상품을 다시 선택해 재시도해주세요.`;
            console.error('Toss Payments setup failed:', error);
        } finally {
            renderPaymentSummary();
        }
    };

    const confirmReturnedPayment = async () => {
        const params = new URLSearchParams(window.location.search);
        const paymentKey = params.get('paymentKey');
        const orderId = params.get('orderId');
        const amount = Number(params.get('amount'));
        const failureCode = params.get('code');
        if (failureCode) {
            alert(params.get('message') || '결제가 취소되었거나 실패했습니다.');
            history.replaceState({}, '', '/stamp-purchase');
            return;
        }
        if (!paymentKey || !orderId || !Number.isInteger(amount)) return;
        state.isSubmitting = true;
        try {
            const response = await APIClient.post('/users/me/stamps/purchases/confirm', { paymentKey, orderId, amount });
            alert(`결제가 완료되었습니다. 현재 보유 스탬프는 ${Number(response.totalStamps || 0).toLocaleString('ko-KR')}개입니다.`);
            window.location.replace('/ad-order-history');
        } catch (error) {
            alert(error.message || '결제 승인 처리 중 오류가 발생했습니다. 고객센터로 문의해주세요.');
            history.replaceState({}, '', '/stamp-purchase');
        } finally {
            state.isSubmitting = false;
        }
    };

    planList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-stamp-plan]');
        const planCode = button?.dataset.stampPlan;
        if (!plans[planCode]) return;
        if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
            alert('로그인 후 스탬프를 구매할 수 있습니다.');
            window.location.href = '/login';
            return;
        }
        state.plan = planCode;
        renderPlanList();
        renderPaymentSummary();
        setupPayment(planCode);
    });

    purchaseButton?.addEventListener('click', async () => {
        if (state.isSubmitting || !state.payment || !state.order) return;
        state.isSubmitting = true;
        renderPaymentSummary();
        try {
            const origin = window.location.origin;
            await state.payment.requestPayment({
                method: 'CARD',
                amount: { currency: 'KRW', value: state.order.amount },
                orderId: state.order.orderId,
                orderName: state.order.orderName,
                successUrl: `${origin}/stamp-purchase`,
                failUrl: `${origin}/stamp-purchase`,
                customerName: state.order.customerName
            });
        } catch (error) {
            if (error.code !== 'USER_CANCEL') alert(error.message || '결제창을 열지 못했습니다.');
            state.isSubmitting = false;
            renderPaymentSummary();
        }
    });

    renderPlanList();
    confirmReturnedPayment();
})();
