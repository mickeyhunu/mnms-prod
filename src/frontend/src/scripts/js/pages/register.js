/**
 * 파일 역할: register 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let generatedVerificationCode = null;
let verifiedPhoneNumber = null;

async function runPortOneIdentityVerification() {
    const precheckedIdentity = sessionStorage.getItem('identityVerificationPrechecked') === 'true';
    if (precheckedIdentity) {
        sessionStorage.removeItem('identityVerificationPrechecked');
        return true;
    }

    if (!window.PortOne || typeof window.PortOne.requestIdentityVerification !== 'function') {
        return true;
    }

    try {
        const result = await window.PortOne.requestIdentityVerification({
            // 고객사 storeId
            storeId: 'store-4ff4af41-85e3-4559-8eb8-0d08a2c6ceec',
            identityVerificationId: `identity-verification-${window.crypto.randomUUID()}`,
            // 연동 정보 메뉴의 채널 관리 탭에서 확인 가능한 channelKey
            channelKey: 'channel-key-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        });

        if (result?.code) {
            throw new Error(result.message || '본인인증이 취소되었거나 실패했습니다.');
        }

        return true;
    } catch (error) {
        const message = error?.message || '본인인증 중 오류가 발생했습니다.';
        showNotification(message, 'error');
        return false;
    }
}

function initRegisterPage() {

    if (Auth.redirectIfAuthenticated()) {
        return;
    }

    setupRegisterForm();
    setupPhoneVerification();
    setupNicknameCheck();
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
            if (input.name === 'phone') {
                markPhoneAsUnverified();
            }

            if (input.name === 'nickname') {
                markNicknameAsUnchecked();
            }

            if (input.classList.contains('error')) {
                validateFormField(input);
            }
        });
    });
}

function setupPhoneVerification() {
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');

    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', sendVerificationCode);
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', verifyPhoneCode);
    }
}

function setupNicknameCheck() {
    const checkNicknameBtn = document.getElementById('check-nickname-btn');

    if (checkNicknameBtn) {
        checkNicknameBtn.addEventListener('click', checkNicknameAvailability);
    }
}

function sendVerificationCode() {
    const phoneInput = document.getElementById('phone');
    const statusElement = document.getElementById('verification-status');

    const phone = phoneInput.value.trim();
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
        showNotification('유효한 휴대폰 번호를 입력해주세요.', 'error');
        return;
    }

    generatedVerificationCode = String(Math.floor(100000 + Math.random() * 900000));
    verifiedPhoneNumber = null;
    setPhoneVerified(false);

    if (statusElement) {
        statusElement.textContent = `인증번호가 발송되었습니다. (데모 코드: ${generatedVerificationCode})`;
    }

    showNotification('인증번호를 발송했습니다.', 'success');
}

function verifyPhoneCode() {
    const codeInput = document.getElementById('verificationCode');
    const phoneInput = document.getElementById('phone');
    const statusElement = document.getElementById('verification-status');

    if (!generatedVerificationCode) {
        showNotification('먼저 인증번호를 발송해주세요.', 'warning');
        return;
    }

    const code = codeInput.value.trim();
    if (code !== generatedVerificationCode) {
        setPhoneVerified(false);
        showNotification('인증번호가 일치하지 않습니다.', 'error');
        return;
    }

    verifiedPhoneNumber = phoneInput.value.trim();
    setPhoneVerified(true);

    if (statusElement) {
        statusElement.textContent = '휴대폰 인증이 완료되었습니다.';
    }

    showNotification('휴대폰 인증이 완료되었습니다.', 'success');
}

function setPhoneVerified(isVerified) {
    const phoneVerifiedInput = document.getElementById('phoneVerified');
    if (phoneVerifiedInput) {
        phoneVerifiedInput.value = isVerified ? 'true' : 'false';
    }
}

function markPhoneAsUnverified() {
    const currentPhone = document.getElementById('phone')?.value.trim();

    if (verifiedPhoneNumber && verifiedPhoneNumber !== currentPhone) {
        setPhoneVerified(false);
        const statusElement = document.getElementById('verification-status');
        if (statusElement) {
            statusElement.textContent = '휴대폰 번호가 변경되어 재인증이 필요합니다.';
        }
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
        verificationCode: form.verificationCode.value.trim(),
        phoneVerified: form.phoneVerified.value,
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

    const identityVerified = await runPortOneIdentityVerification();
    if (!identityVerified) {
        return;
    }

    try {
        setLoading(submitBtn, true);
        hideElement(errorBanner);

        const response = await AuthAPI.register({
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
