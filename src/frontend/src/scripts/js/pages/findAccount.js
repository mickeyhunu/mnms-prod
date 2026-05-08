/**
 * 파일 역할: find-account 페이지의 본인인증 기반 계정 찾기/비밀번호 재설정 흐름을 처리하는 페이지 스크립트 파일.
 */

let verifiedIdentityVerificationId = '';

function logFindAccountIdentityStep(step, details = {}) {
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('[FindAccount Identity]', step, details);
    }
}

function maskFindAccountIdentityValue(value) {
    if (window.KcpIdentity && typeof window.KcpIdentity.maskValue === 'function') {
        return window.KcpIdentity.maskValue(value);
    }

    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
        return '';
    }

    return normalizedValue.length <= 8
        ? `${normalizedValue.slice(0, 2)}***`
        : `${normalizedValue.slice(0, 4)}***${normalizedValue.slice(-4)}`;
}


function setFindAccountStatus(message, tone = 'muted') {
    const statusElement = document.getElementById('find-account-status');
    if (!statusElement) return;

    statusElement.textContent = String(message || '').trim();
    statusElement.style.color = tone === 'error' ? '#dc3545' : tone === 'success' ? '#198754' : '#6c757d';
}

function showFindAccountMessage(message, tone = 'muted') {
    setFindAccountStatus(message, tone);
    if (typeof showNotification === 'function' && message) {
        showNotification(message, tone === 'error' ? 'error' : tone === 'success' ? 'success' : 'info');
    }
}

function showFoundAccountSection(loginId) {
    const foundSection = document.getElementById('found-account-section');
    const foundLoginIdDisplay = document.getElementById('found-login-id');
    const resetForm = document.getElementById('reset-password-form');

    if (foundSection) foundSection.classList.remove('hidden');
    if (resetForm) resetForm.classList.remove('hidden');
    if (foundLoginIdDisplay) foundLoginIdDisplay.textContent = String(loginId || '').trim();
}

function hideFoundAccountSection() {
    const foundSection = document.getElementById('found-account-section');
    const resetForm = document.getElementById('reset-password-form');
    const foundLoginIdDisplay = document.getElementById('found-login-id');

    if (foundSection) foundSection.classList.add('hidden');
    if (resetForm) resetForm.classList.add('hidden');
    if (foundLoginIdDisplay) foundLoginIdDisplay.textContent = '본인인증 후 자동 입력됩니다.';
}

async function handleFindAccount() {
    const findButton = document.getElementById('find-account-btn');
    logFindAccountIdentityStep('계정찾기 본인인증 시작');
    try {
        if (findButton) findButton.disabled = true;
        verifiedIdentityVerificationId = '';
        hideFoundAccountSection();
        setFindAccountStatus('본인인증을 진행합니다.');

        if (!window.KcpIdentity || typeof window.KcpIdentity.request !== 'function') {
            logFindAccountIdentityStep('KCP 모듈 확인 실패');
            throw new Error('KCP 본인인증 모듈을 찾을 수 없습니다.');
        }

        logFindAccountIdentityStep('KCP 모듈 확인 성공');
        const requestOptions = {
            ordr_idxx: generateIdentityVerificationId('findaccount'),
            kcpPageSubmitYn: 'N'
        };
        logFindAccountIdentityStep('KCP 본인인증 요청 호출', requestOptions);
        const response = await window.KcpIdentity.request(requestOptions);
        logFindAccountIdentityStep('KCP 본인인증 요청 응답', {
            success: Boolean(response?.success),
            identityVerificationId: maskFindAccountIdentityValue(response?.identityVerificationId || response?.regCertKey)
        });

        const identityVerificationId = String(response?.identityVerificationId || response?.regCertKey || '').trim();
        if (!identityVerificationId) {
            logFindAccountIdentityStep('인증 거래 ID 확인 실패');
            throw new Error('본인인증 거래 정보를 확인하지 못했습니다. 다시 시도해주세요.');
        }

        logFindAccountIdentityStep('본인인증 기반 계정 조회 시작', { identityVerificationId: maskFindAccountIdentityValue(identityVerificationId) });
        const result = await AuthAPI.findAccountByIdentity(identityVerificationId);
        logFindAccountIdentityStep('본인인증 기반 계정 조회 완료', { found: Boolean(result?.found), message: result?.message });
        if (!result?.found) {
            showFindAccountMessage(result?.message || '가입된 아이디가 없습니다.', 'error');
            return;
        }

        verifiedIdentityVerificationId = identityVerificationId;
        logFindAccountIdentityStep('계정찾기 본인인증 흐름 완료', { identityVerificationId: maskFindAccountIdentityValue(identityVerificationId) });
        showFoundAccountSection(result.loginId);
        showFindAccountMessage(`가입된 아이디: ${result.loginId}`, 'success');
    } catch (error) {
        logFindAccountIdentityStep('계정찾기 본인인증 흐름 오류', {
            errorName: error?.name || 'Error',
            errorMessage: error?.message || String(error || '')
        });
        showFindAccountMessage(error.message || '계정 찾기 중 오류가 발생했습니다.', 'error');
    } finally {
        if (findButton) findButton.disabled = false;
    }
}

async function handleResetPassword(event) {
    event.preventDefault();

    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');
    const submitButton = event?.target?.querySelector('button[type="submit"]');
    const newPassword = String(newPasswordInput?.value || '');
    const confirmNewPassword = String(confirmPasswordInput?.value || '');

    if (!verifiedIdentityVerificationId) {
        showFindAccountMessage('먼저 계정찾기 본인인증을 완료해주세요.', 'error');
        return;
    }

    if (!newPassword || !confirmNewPassword) {
        showFindAccountMessage('새 비밀번호와 비밀번호 확인을 모두 입력해주세요.', 'error');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showFindAccountMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'error');
        return;
    }

    try {
        if (submitButton) submitButton.disabled = true;
        const response = await AuthAPI.resetPasswordByIdentity(verifiedIdentityVerificationId, newPassword);
        showFindAccountMessage(response?.message || '비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.', 'success');
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        verifiedIdentityVerificationId = '';
        setTimeout(() => {
            window.location.href = '/login';
        }, 800);
    } catch (error) {
        showFindAccountMessage(error.message || '비밀번호 변경에 실패했습니다.', 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function initFindAccountPage() {
    if (Auth.redirectIfAuthenticated()) {
        return;
    }

    const findButton = document.getElementById('find-account-btn');
    const resetForm = document.getElementById('reset-password-form');

    findButton?.addEventListener('click', handleFindAccount);
    resetForm?.addEventListener('submit', handleResetPassword);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFindAccountPage);
} else {
    initFindAccountPage();
}
