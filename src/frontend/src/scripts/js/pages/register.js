/**
 * 파일 역할: register 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
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

function handleIdentityVerification() {
    const popupName = 'kcpIdentityPopup';
    const popup = window.open('', popupName, 'width=460,height=640,scrollbars=yes,resizable=yes');
    if (!popup) {
        showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
        return;
    }

    const authForm = document.getElementById('kcp-auth-form');
    if (authForm instanceof HTMLFormElement) {
        authForm.target = popupName;
        authForm.submit();
    }

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

    setTimeout(() => {
        const mockKcpResponse = {
            success: true,
            phone: '01012345678',
            genderDigit: '1',
            ci: `CI_${Date.now()}`
        };

        if (mockKcpResponse.success) {
            applyIdentityResponse(mockKcpResponse);
            popup.close();
            showNotification('본인인증이 완료되었습니다.', 'success');
            showStep('detail');
        }
    }, 1200);
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
