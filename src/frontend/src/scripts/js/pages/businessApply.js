/**
 * 파일 역할: 기업회원 신청 안내 동의 화면의 인증 확인, 필수 동의, 사업자정보 제출 이동을 담당한다.
 */
const BUSINESS_APPLY_AGREEMENT_KEY = 'mnmsBusinessApplyAgreedAt';

function updateBusinessApplySubmitState() {
    const consentCheckboxes = Array.from(document.querySelectorAll('[data-business-apply-consent]'));
    const submitButton = document.getElementById('business-apply-submit-btn');
    const isAllChecked = consentCheckboxes.length > 0 && consentCheckboxes.every((checkbox) => checkbox.checked);

    if (submitButton) {
        submitButton.disabled = !isAllChecked;
    }
}

function bindBusinessApplyEvents() {
    const consentCheckboxes = Array.from(document.querySelectorAll('[data-business-apply-consent]'));
    const submitButton = document.getElementById('business-apply-submit-btn');

    consentCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', updateBusinessApplySubmitState);
    });

    submitButton?.addEventListener('click', () => {
        if (submitButton.disabled) return;
        window.sessionStorage?.setItem(BUSINESS_APPLY_AGREEMENT_KEY, new Date().toISOString());
        window.location.href = '/business-management?apply=1';
    });

    updateBusinessApplySubmitState();
}

async function initBusinessApplyPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const me = await APIClient.get('/auth/me');
    const nickname = Auth.resolveNicknameDisplayElement();
    if (nickname) Auth.applyNicknameDisplay(nickname, me);

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    bindBusinessApplyEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBusinessApplyPage, { once: true });
} else {
    initBusinessApplyPage();
}
