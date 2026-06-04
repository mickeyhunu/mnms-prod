/**
 * 파일 역할: ad-order-history 페이지의 스탬프 결제 내역 목록 렌더링을 담당하는 스크립트 파일.
 */
(() => {
    const ORDER_STORAGE_KEY = 'mnmsAdOrderHistory';
    const listElement = document.getElementById('ad-order-history-list');
    const emptyElement = document.getElementById('ad-order-history-empty');

    if (!listElement || !emptyElement) return;

    const formatPrice = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;
    const formatDateTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';

        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const normalizePaymentStatus = (item = {}) => {
        const rawStatus = String(item.status || '').trim();
        const actionType = String(item.actionType || '').trim().toUpperCase();
        const amount = Number(item.amount || item.stampCount || 0);

        if (rawStatus.includes('취소') || actionType === 'STAMP_PURCHASE_CANCEL' || amount < 0) {
            return '결제취소';
        }

        return rawStatus || '결제완료';
    };

    const getPaymentStatusClass = (status) => String(status || '').includes('취소') ? 'cancel' : 'complete';

    const readOrderHistory = () => {
        try {
            const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const createStoredPaymentItems = () => readOrderHistory().map((order) => {
        const status = normalizePaymentStatus(order);
        const stampCount = Math.abs(Number(order.stampCount || order.durationDays || 0));

        return {
            id: order.id || `STAMP-PAYMENT-${order.orderedAt || Date.now()}`,
            type: getPaymentStatusClass(status),
            title: order.planName || '스탬프 구매',
            status,
            createdAt: order.orderedAt,
            meta: [
                ['구매상품', order.planName || '-'],
                ['스탬프', `${stampCount.toLocaleString('ko-KR')}개`],
                ['주문번호', order.id || '-'],
                ['주문일시', formatDateTime(order.orderedAt)],
                ['공급가액', formatPrice(order.supplyPrice)],
                ['부가세', formatPrice(order.vat)],
                ['결제금액', formatPrice(order.totalPrice)]
            ]
        };
    });

    const createPaymentItems = (paymentHistories = []) => paymentHistories.map((item) => {
        const amount = Math.abs(Number(item.amount || 0));
        const status = normalizePaymentStatus(item);
        const title = item.actionLabel || (status === '결제취소' ? '스탬프 결제취소' : '스탬프 구매');

        return {
            id: item.id || `STAMP-PAYMENT-${item.createdAt || Date.now()}`,
            type: getPaymentStatusClass(status),
            title,
            status,
            createdAt: item.createdAt,
            meta: [
                ['구매상품', item.reason || title],
                ['스탬프', `${amount.toLocaleString('ko-KR')}개`],
                ['주문번호', item.sourceLabel || '-'],
                ['결제일시', formatDateTime(item.createdAt)]
            ]
        };
    });

    const renderItems = (items) => {
        if (!items.length) {
            emptyElement.classList.remove('hidden');
            listElement.innerHTML = '';
            return;
        }

        emptyElement.classList.add('hidden');
        listElement.innerHTML = items
            .map((item) => `
                <article class="ad-order-history-item" aria-label="${sanitizeHTML(item.title)}">
                    <div class="ad-order-history-item-top">
                        <strong>${sanitizeHTML(item.title)}</strong>
                        <span class="ad-order-history-status ad-order-history-status--${item.type}">${sanitizeHTML(item.status)}</span>
                    </div>
                    <dl class="ad-order-history-meta">
                        ${item.meta.map(([label, value], index) => `
                            <div class="${index === item.meta.length - 1 ? 'ad-order-history-meta-total' : ''}">
                                <dt>${sanitizeHTML(label)}</dt>
                                <dd>${sanitizeHTML(value)}</dd>
                            </div>
                        `).join('')}
                    </dl>
                </article>
            `)
            .join('');
    };

    const loadStampPaymentHistory = async () => {
        if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await APIClient.get('/users/me/stamps/payments', { limit: 50 });
            const items = createPaymentItems(response.stampPaymentHistories || []);
            renderItems(items);
        } catch (error) {
            const items = createStoredPaymentItems()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            renderItems(items);
        }
    };

    loadStampPaymentHistory();
})();
