function initRegisterPage() {
    console.log('Register page 초기화');

    if (Auth.redirectIfAuthenticated()) {
        return;
    }

    setupRegisterForm();
    setupNicknameCheck();
    setupNiceIdentityBridge();
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

function setupNiceIdentityBridge() {
    // NICE 연동 완료 후 외부 스크립트에서 window.applyNiceVerificationData(payload) 호출 가능
    window.applyNiceVerificationData = applyNiceVerificationData;
}

function applyNiceVerificationData(identityData) {
    const mapping = {
        name: 'name',
        birthDate: 'birthDate',
        gender: 'gender',
        nationalInfo: 'nationalInfo',
        telecom: 'telecom',
        phone: 'phone',
        ci: 'ci',
        di: 'di'
    };

    Object.entries(mapping).forEach(([key, fieldId]) => {
        const field = document.getElementById(fieldId);
        if (field && identityData[key] !== undefined && identityData[key] !== null) {
            field.value = String(identityData[key]);
            validateFormField(field);
        }
    });
}

function setupNicknameCheck() {
    const checkNicknameBtn = document.getElementById('check-nickname-btn');

    if (checkNicknameBtn) {
        checkNicknameBtn.addEventListener('click', checkNicknameAvailability);
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

    if (nickname.length < 2) {
        showNotification('닉네임은 2글자 이상 입력해주세요.', 'warning');
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
    console.log('회원가입 시도');

    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');

    const formData = {
        loginId: form.loginId.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
        phone: form.phone.value.trim(),
        name: form.name.value.trim(),
        birthDate: form.birthDate.value,
        gender: form.gender.value,
        nationalInfo: form.nationalInfo.value,
        telecom: form.telecom.value,
        ci: form.ci.value,
        di: form.di.value,
        nickname: form.nickname.value.trim(),
        nicknameChecked: form.nicknameChecked.value
    };

    const errors = validateRegisterForm(formData);

    if (hasValidationErrors(errors)) {
        showValidationErrors(errors, form);
        return;
    }

    try {
        setLoading(submitBtn, true);
        hideElement(errorBanner);

        const response = await AuthAPI.register({
            loginId: formData.loginId,
            password: formData.password,
            phone: formData.phone,
            name: formData.name,
            birthDate: formData.birthDate,
            gender: formData.gender,
            nationalInfo: formData.nationalInfo,
            telecom: formData.telecom,
            ci: formData.ci,
            di: formData.di,
            nickname: formData.nickname
        });
        console.log('회원가입 응답:', response);

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

console.log('Register JS loaded');
