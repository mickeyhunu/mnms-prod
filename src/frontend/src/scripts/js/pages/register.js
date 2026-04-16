/**
 * 파일 역할: register 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */

const PORTONE_BROWSER_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';
const PORTONE_STORE_ID = 'store-ef30fda0-ff53-48f6-aab5-9b82f4a70672';
const PORTONE_CHANNEL_KEY = 'channel-key-73e3732b-f4ef-4bac-ad22-9ca474348c76';

function initRegisterPage() {

    if (Auth.redirectIfAuthenticated()) {
        return;
    }

    setupRegisterForm();
    setupIdentityVerification();
    setupNicknameCheck();
    setupStepFlow();
}

function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) {
        console.error('Register form not found');
        return;
    }

    form.addEventListener('submit', handleRegister);

    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateFormField(input));
        input.addEventListener('input', () => {
            if (input.name === 'nickname') {
                markNicknameAsUnchecked();
            }

            if (input.classList.contains('error')) {
                validateFormField(input);
            }
        });
    });
}

function setupStepFlow() {
    const agreeTermsBtn = document.getElementById('agree-terms-btn');
    const termsConsent = document.getElementById('termsConsent');
    const privacyConsent = document.getElementById('privacyConsent');

    if (agreeTermsBtn) {
        agreeTermsBtn.addEventListener('click', () => {
            if (!termsConsent?.checked || !privacyConsent?.checked) {
                showNotification('이용약관 및 개인정보 보호정책에 모두 동의해주세요.', 'warning');
                return;
            }

            showStep('identity');
            showNotification('약관 동의가 완료되었습니다. 본인인증을 시작합니다.', 'success');
            handleIdentityVerification();
        });
    }
}

function showStep(stepName) {
    const steps = {
        terms: document.getElementById('register-step-terms'),
        identity: document.getElementById('register-step-identity'),
        detail: document.getElementById('register-step-detail')
    };

    Object.values(steps).forEach(step => {
        if (step) {
            step.classList.add('hidden');
        }
    });

    if (steps[stepName]) {
        steps[stepName].classList.remove('hidden');
    }
}

function setPhoneVerified(isVerified) {
    const phoneVerifiedInput = document.getElementById('phoneVerified');
    if (phoneVerifiedInput) {
        phoneVerifiedInput.value = isVerified ? 'true' : 'false';
    }
}

function setIdentityVerified(isVerified) {
    const identityVerifiedInput = document.getElementById('identityVerified');
    if (identityVerifiedInput) {
        identityVerifiedInput.value = isVerified ? 'true' : 'false';
    }
}

function setupIdentityVerification() {
    const startIdentityBtn = document.getElementById('start-kcp-btn');

    if (startIdentityBtn) {
        startIdentityBtn.addEventListener('click', handleIdentityVerification);
    }
}

async function requestIdentityVerification({ popupName, popup, authForm }) {
    if (!(authForm instanceof HTMLFormElement)) {
        throw new Error('KCP 인증 폼을 찾을 수 없습니다.');
    }

    const submitUrl = String(authForm.action || '').trim();
    if (!submitUrl || submitUrl === 'about:blank') {
        throw new Error('KCP 인증 요청 URL이 설정되지 않았습니다.');
    }

    authForm.target = popupName;
    authForm.submit();

    popup.document.write(`
        <html lang="ko">
        <head><title>KCP 본인인증</title></head>
        <body style="font-family:sans-serif;padding:24px;">
            <h2>KCP 본인인증</h2>
            <p>본인인증을 진행 중입니다...</p>
        </body>
        </html>
    `);
    popup.document.close();

    if (typeof window.requestIdentityVerification !== 'function') {
        return new Promise((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                reject(new Error('본인인증 응답 대기 시간이 초과되었습니다.'));
            }, 5 * 60 * 1000);

            const handleMessage = (event) => {
                const data = event?.data || {};
                if (data.type !== 'KCP_IDENTITY_VERIFICATION_RESULT') {
                    return;
                }

                window.clearTimeout(timeoutId);
                window.removeEventListener('message', handleMessage);
                resolve(data.payload || null);
            };

            window.addEventListener('message', handleMessage);
        });
    }

    const response = window.requestIdentityVerification({
        popupName,
        popup,
        form: authForm
    });

    if (response && typeof response.then === 'function') {
        return response;
    }

    return response;
}

function setupNicknameCheck() {
    const checkNicknameBtn = document.getElementById('check-nickname-btn');
    const nicknameInput = document.getElementById('nickname');

    if (checkNicknameBtn) {
        checkNicknameBtn.addEventListener('click', checkNicknameAvailability);
    }

    if (nicknameInput) {
        nicknameInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return;
            }

            event.preventDefault();
            checkNicknameAvailability();
        });
    }
}

async function loadPortOneSdk() {
    if (window.PortOne && typeof window.PortOne.requestIdentityVerification === 'function') {
        return window.PortOne;
    }

    const existingScript = document.querySelector(`script[src="${PORTONE_BROWSER_SDK_URL}"]`);
    if (existingScript) {
        await new Promise((resolve, reject) => {
            existingScript.addEventListener('load', resolve, { once: true });
            existingScript.addEventListener('error', () => reject(new Error('PortOne SDK 로드에 실패했습니다.')), { once: true });
        });
        return window.PortOne;
    }

    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PORTONE_BROWSER_SDK_URL;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('PortOne SDK 로드에 실패했습니다.'));
        document.head.appendChild(script);
    });

    return window.PortOne;
}

async function handleIdentityVerification() {
    try {
        const PortOne = await loadPortOneSdk();
        if (!PortOne || typeof PortOne.requestIdentityVerification !== 'function') {
            throw new Error('PortOne 본인인증 모듈을 찾을 수 없습니다.');
        }

        const response = await PortOne.requestIdentityVerification({
            storeId: PORTONE_STORE_ID,
            identityVerificationId: `test-${Date.now()}`,
            channelKey: PORTONE_CHANNEL_KEY
        });

        if (response?.code) {
            throw new Error(response.message || '본인인증에 실패했습니다.');
        }

        setIdentityVerified(true);
        const statusElement = document.getElementById('identity-status');
        if (statusElement) {
            statusElement.textContent = 'PortOne 본인인증 요청이 완료되었습니다.';
        }

        showNotification('본인인증이 완료되었습니다.', 'success');
        showStep('detail');
    } catch (error) {
        showNotification(error.message || '본인인증 중 오류가 발생했습니다.', 'error');
    }
}

function applyIdentityResponse(response) {
    const phoneInput = document.getElementById('phone');
    const genderDigitInput = document.getElementById('genderDigit');
    const identityCiInput = document.getElementById('identityCi');
    const statusElement = document.getElementById('identity-status');

    if (phoneInput) {
        phoneInput.value = response.phone;
    }
    if (genderDigitInput) {
        genderDigitInput.value = response.genderDigit;
    }
    if (identityCiInput) {
        identityCiInput.value = response.ci;
    }

    setPhoneVerified(true);
    setIdentityVerified(true);

    if (statusElement) {
        statusElement.textContent = `KCP 본인인증 완료 (${response.phone})`;
    }
}

function setNicknameChecked(isChecked, isAvailable = false) {
    const nicknameCheckedInput = document.getElementById('nicknameChecked');
    const statusElement = document.getElementById('nickname-status');

    if (nicknameCheckedInput) {
        nicknameCheckedInput.value = isChecked ? 'true' : 'false';
    }

    if (statusElement) {
        if (!isChecked) {
            statusElement.textContent = '닉네임 중복 확인이 필요합니다.';
        } else if (isAvailable) {
            statusElement.textContent = '사용 가능한 닉네임입니다.';
        } else {
            statusElement.textContent = '이미 사용 중인 닉네임입니다.';
        }
    }
}

function markNicknameAsUnchecked() {
    setNicknameChecked(false);
}

async function checkNicknameAvailability() {
    const nicknameInput = document.getElementById('nickname');
    const nickname = nicknameInput?.value.trim() || '';

    const nicknameLength = Array.from(nickname).length;
    if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
        showNotification(`닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`, 'warning');
        setNicknameChecked(false);
        return;
    }

    if (!validateNoBlockedExpression(nickname, '닉네임')) {
        setNicknameChecked(false);
        return;
    }

    try {
        const result = await AuthAPI.checkNickname(nickname);
        if (result.available) {
            setNicknameChecked(true, true);
            showNotification('사용 가능한 닉네임입니다.', 'success');
        } else {
            setNicknameChecked(false, false);
            showNotification('이미 사용 중인 닉네임입니다.', 'error');
        }
    } catch (error) {
        setNicknameChecked(false);
        showNotification(error.message || '닉네임 확인 중 오류가 발생했습니다.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');

    const formData = {
        loginId: form.loginId.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
        phone: form.phone.value.trim(),
        phoneVerified: form.phoneVerified.value,
        identityVerified: form.identityVerified.value,
        genderDigit: form.genderDigit.value.trim(),
        nickname: form.nickname.value.trim(),
        nicknameChecked: form.nicknameChecked.value,
        accountType: form.accountType?.value || 'MEMBER',
        termsConsent: form.termsConsent.checked
    };

    const errors = validateRegisterForm(formData);

    if (hasValidationErrors(errors)) {
        showValidationErrors(errors, form);
        return;
    }

    if (!validateNoBlockedExpression(formData.nickname, '닉네임')) {
        setNicknameChecked(false);
        return;
    }

    try {
        setLoading(submitBtn, true);
        hideElement(errorBanner);

        await AuthAPI.register({
            loginId: formData.loginId,
            password: formData.password,
            phone: formData.phone,
            genderDigit: formData.genderDigit,
            nickname: formData.nickname,
            accountType: formData.accountType
        });

        showNotification('회원가입이 완료되었습니다!', 'success');

        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);

    } catch (error) {
        console.error('회원가입 에러:', error);

        if (errorMessage) {
            errorMessage.textContent = error.message || '회원가입 중 오류가 발생했습니다.';
        }
        showElement(errorBanner);

    } finally {
        setLoading(submitBtn, false);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegisterPage);
} else {
    initRegisterPage();
}
