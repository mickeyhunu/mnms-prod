/**
 * 파일 역할: register 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let generatedVerificationCode = null;
let verifiedPhoneNumber = null;
let identityVerified = false;
let identityPopup = null;

function initRegisterPage() {

    if (Auth.redirectIfAuthenticated()) {
        return;
    }

    setupIdentityVerificationGate();
    setupRegisterForm();
    setupPhoneVerification();
    setupNicknameCheck();
}

function setupIdentityVerificationGate() {
    const registerFormContainer = document.getElementById('register-form-container');
    const identityGate = document.getElementById('identity-verification-gate');
    const openIdentityPopupBtn = document.getElementById('open-identity-popup-btn');
    const identityGateStatus = document.getElementById('identity-gate-status');

    if (!registerFormContainer || !identityGate) {
        return;
    }

    registerFormContainer.classList.add('hidden');
    identityGate.classList.remove('hidden');

    window.addEventListener('message', handleIdentityVerificationMessage);
    openIdentityPopupBtn?.addEventListener('click', () => openIdentityVerificationPopup(false));
    openIdentityVerificationPopup(true);

    if (identityGateStatus) {
        identityGateStatus.textContent = '본인인증 팝업을 진행해주세요.';
    }
}

function completeIdentityVerification(phone, code) {
    const registerFormContainer = document.getElementById('register-form-container');
    const identityGate = document.getElementById('identity-verification-gate');
    const identityGateStatus = document.getElementById('identity-gate-status');
    const registerPhoneInput = document.getElementById('phone');
    const registerCodeInput = document.getElementById('verificationCode');
    const registerStatusElement = document.getElementById('verification-status');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');

    if (registerPhoneInput) {
        registerPhoneInput.value = phone;
        registerPhoneInput.readOnly = true;
    }

    if (registerCodeInput) {
        registerCodeInput.value = code;
        registerCodeInput.readOnly = true;
    }

    if (registerStatusElement) {
        registerStatusElement.textContent = '본인인증이 완료되었습니다.';
    }

    if (sendCodeBtn) {
        sendCodeBtn.disabled = true;
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.disabled = true;
    }

    if (identityGateStatus) {
        identityGateStatus.textContent = '본인인증이 완료되었습니다.';
    }

    registerFormContainer?.classList.remove('hidden');
    identityGate?.classList.add('hidden');

    if (identityPopup && !identityPopup.closed) {
        identityPopup.close();
    }
}

function openIdentityVerificationPopup(isAutoOpen = false) {
    if (identityPopup && !identityPopup.closed) {
        identityPopup.focus();
        return;
    }

    const popupWidth = 460;
    const popupHeight = 680;
    const left = Math.max((window.screen.width - popupWidth) / 2, 0);
    const top = Math.max((window.screen.height - popupHeight) / 2, 0);
    const features = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=no,scrollbars=yes`;

    identityPopup = window.open('', 'identityVerificationPopup', features);
    const gateStatus = document.getElementById('identity-gate-status');

    if (!identityPopup) {
        if (!isAutoOpen) {
            showNotification('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.', 'warning');
        }
        if (gateStatus) {
            gateStatus.textContent = '팝업이 차단되었습니다. "본인인증 팝업 열기" 버튼을 다시 눌러주세요.';
        }
        return;
    }

    identityPopup.document.write(getIdentityPopupTemplate());
    identityPopup.document.close();

    if (gateStatus) {
        gateStatus.textContent = '본인인증 팝업이 열렸습니다. 인증 완료 후 자동으로 회원가입 화면이 열립니다.';
    }
}

function handleIdentityVerificationMessage(event) {
    if (event.origin !== window.location.origin) {
        return;
    }

    const { type, phone, verificationCode } = event.data || {};
    if (type !== 'IDENTITY_VERIFIED') {
        return;
    }

    verifiedPhoneNumber = phone;
    generatedVerificationCode = verificationCode;
    identityVerified = true;
    setPhoneVerified(true);
    completeIdentityVerification(phone, verificationCode);
    showNotification('본인인증이 완료되었습니다. 회원가입을 진행해주세요.', 'success');
}

function getIdentityPopupTemplate() {
    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>본인인증</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background:#f8fafc; color:#1f2937; }
    .wrap { max-width: 400px; margin: 0 auto; background:#fff; border-radius:12px; padding:20px; box-shadow:0 8px 20px rgba(15,23,42,.08);}
    h1 { font-size: 20px; margin:0 0 8px; }
    p { margin:0 0 16px; color:#475569; font-size:14px; }
    label { display:block; font-size:14px; margin-bottom:6px; font-weight:600; }
    input { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:10px; }
    button { width:100%; padding:11px 12px; border-radius:8px; border:0; cursor:pointer; font-weight:700; margin-bottom:8px; }
    .btn-outline { background:#fff; border:1px solid #0f172a; color:#0f172a; }
    .btn-primary { background:#0f172a; color:#fff; }
    .status { font-size:13px; color:#334155; margin-top:6px; min-height:20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>본인인증 확인</h1>
    <p>휴대폰 인증을 완료하면 회원가입 페이지가 열립니다.</p>
    <label for="popup-phone">휴대폰 번호</label>
    <input id="popup-phone" type="tel" placeholder="숫자만 입력 (예: 01012345678)" />
    <button id="popup-send-code-btn" type="button" class="btn-outline">인증번호 발송</button>
    <label for="popup-code">인증번호</label>
    <input id="popup-code" type="text" maxlength="6" placeholder="6자리 인증번호" />
    <button id="popup-verify-btn" type="button" class="btn-primary">인증 완료</button>
    <div class="status" id="popup-status">휴대폰 인증이 필요합니다.</div>
  </div>
  <script>
    let generatedCode = null;
    const phoneInput = document.getElementById('popup-phone');
    const codeInput = document.getElementById('popup-code');
    const status = document.getElementById('popup-status');
    document.getElementById('popup-send-code-btn').addEventListener('click', function () {
      const phone = (phoneInput.value || '').trim();
      if (!/^01[016789]\\d{7,8}$/.test(phone)) {
        status.textContent = '유효한 휴대폰 번호를 입력해주세요.';
        return;
      }
      generatedCode = String(Math.floor(100000 + Math.random() * 900000));
      status.textContent = '인증번호가 발송되었습니다. (데모 코드: ' + generatedCode + ')';
    });
    document.getElementById('popup-verify-btn').addEventListener('click', function () {
      const phone = (phoneInput.value || '').trim();
      const code = (codeInput.value || '').trim();
      if (!generatedCode) {
        status.textContent = '먼저 인증번호를 발송해주세요.';
        return;
      }
      if (code !== generatedCode) {
        status.textContent = '인증번호가 일치하지 않습니다.';
        return;
      }
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'IDENTITY_VERIFIED', phone: phone, verificationCode: code }, window.location.origin);
      }
      window.close();
    });
  <\/script>
</body>
</html>`;
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
    if (identityVerified) {
        return;
    }

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

    if (!identityVerified) {
        showNotification('먼저 본인인증을 완료해주세요.', 'warning');
        return;
    }

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
