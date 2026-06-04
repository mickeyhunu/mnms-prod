/**
 * 파일 역할: ad-order-history 페이지의 스탬프 구매/사용 내역 목록 렌더링을 담당하는 스크립트 파일.
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

    const formatStampActionLabel = (actionType) => {
        const labels = {
            STAMP_PURCHASE: '스탬프 구매',
            VISIT_VERIFICATION: '업소 방문 인증',
            SERVICE_BOTTLE_USE: '서비스 주류 사용',
            BUSINESS_AD_BRONZE: '브론즈 광고 사용',
            BUSINESS_AD_SILVER: '실버 광고 사용',
            BUSINESS_AD_GOLD: '골드 광고 사용',
            ADMIN_ADJUST_ADD: '관리자 수동 적립',
            ADMIN_ADJUST_DEDUCT: '관리자 수동 차감',
            EXPIRED: '유효기간 만료'
        };

        return labels[actionType] || actionType || '스탬프 내역';
    };

    const readOrderHistory = () => {
        try {
            const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const createPurchaseItems = () => readOrderHistory().map((order) => ({
        id: order.id || `STAMP-PURCHASE-${order.orderedAt || Date.now()}`,
        type: 'purchase',
        title: '스탬프 구매',
        status: order.status || '결제완료',
        createdAt: order.orderedAt,
        meta: [
            ['구매상품', order.planName || '-'],
            ['스탬프', `${Number(order.stampCount || order.durationDays || 0).toLocaleString('ko-KR')}개`],
            ['주문번호', order.id || '-'],
            ['주문일시', formatDateTime(order.orderedAt)],
            ['공급가액', formatPrice(order.supplyPrice)],
            ['부가세', formatPrice(order.vat)],
            ['결제금액', formatPrice(order.totalPrice)]
        ]
    }));

    const createStampUseItems = (stampHistories = []) => stampHistories.map((item) => {
        const amount = Number(item.amount || 0);
        const amountText = `${amount >= 0 ? '+' : ''}${amount.toLocaleString('ko-KR')}개`;
        return {
            id: item.id || `STAMP-${item.createdAt || Date.now()}`,
            type: amount >= 0 ? 'earn' : 'use',
            title: item.actionLabel || formatStampActionLabel(item.actionType),
            status: amount >= 0 ? '적립/구매' : '사용(차감)',
            createdAt: item.createdAt,
            meta: [
                ['스탬프', amountText],
                ['일시', formatDateTime(item.createdAt)],
                ...(item.sourceLabel ? [['출처', item.sourceLabel]] : []),
                ...(item.reason ? [['사유', item.reason]] : [])
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

    const loadStampHistory = async () => {
        if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await APIClient.get('/users/me/stamps', { limit: 50 });
            const items = [
                ...createPurchaseItems(),
                ...createStampUseItems(response.stampHistories || [])
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            renderItems(items);
        } catch (error) {
            renderItems(createPurchaseItems());
        }
    };

    loadStampHistory();
})();
