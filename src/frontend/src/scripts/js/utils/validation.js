/**
 * 파일 역할: validation에서 사용하는 공통 보조 함수/상수를 제공하는 유틸리티 파일.
 */
function validateRegisterForm(data) {
    const errors = {};

    if (!data.loginId || data.loginId.trim().length < 3) {
        errors.loginId = '아이디는 3글자 이상 입력해주세요.';
    }

    if (!data.password || data.password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
        errors.password = `비밀번호는 ${VALIDATION.MIN_PASSWORD_LENGTH}글자 이상이어야 합니다.`;
    }

    if (data.password !== data.confirmPassword) {
        errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (!data.phone || !/^01[016789]\d{7,8}$/.test(data.phone)) {
        errors.phone = '유효한 휴대폰 번호를 입력해주세요.';
    }

    if (data.phoneVerified !== 'true') {
        errors.verificationCode = '휴대폰 인증을 완료해주세요.';
    }

    if (!data.genderDigit || !/^\d$/.test(data.genderDigit)) {
        errors.genderDigit = '성별 식별 번호를 입력해주세요.';
    } else if (Number(data.genderDigit) % 2 === 0) {
        errors.genderDigit = '남성만 가입 가능합니다. 홀수 번호를 입력해주세요.';
    }
    const nicknameLength = Array.from(String(data.nickname || '').trim()).length;
    if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
        errors.nickname = `닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`;
    }

    if (data.nicknameChecked !== 'true') {
        errors.nickname = '닉네임 중복 확인을 완료해주세요.';
    }

    if (!data.termsConsent) {
        errors.termsConsent = '약관 및 정책 동의가 필요합니다.';
    }

    return errors;
}

function validateLoginForm(data) {
    const errors = {};

    if (!data.loginId || data.loginId.trim().length < 1) {
        errors.loginId = '아이디를 입력해주세요.';
    }

    if (!data.password || data.password.length < 1) {
        errors.password = '비밀번호를 입력해주세요.';
    }

    return errors;
}

function validatePostForm(data) {
    const errors = {};

    if (!data.title || data.title.trim().length < 2) {
        errors.title = '제목은 2글자 이상 입력해주세요.';
    }

    if (data.title && data.title.length > 255) {
        errors.title = '제목은 255글자 이하로 입력해주세요.';
    }

    if (!data.content || data.content.trim().length < 10) {
        errors.content = '내용은 10글자 이상 입력해주세요.';
    }

    if (data.content && data.content.length > 5000) {
        errors.content = '내용은 5000글자 이하로 입력해주세요.';
    }

    return errors;
}

function validateCommentForm(data) {
    const errors = {};

    if (!data.content || data.content.trim().length < 1) {
        errors.content = '댓글 내용을 입력해주세요.';
    }

    if (data.content && data.content.length > 1000) {
        errors.content = '댓글은 1000글자 이하로 입력해주세요.';
    }

    return errors;
}

function validateMessageForm(data) {
    const errors = {};

    if (!data.receiverId) {
        errors.receiverId = '받는 사람을 선택해주세요.';
    }

    if (!data.title || data.title.trim().length < 1) {
        errors.title = '제목을 입력해주세요.';
    }

    if (data.title && data.title.length > 100) {
        errors.title = '제목은 100글자 이하로 입력해주세요.';
    }

    if (!data.content || data.content.trim().length < 1) {
        errors.content = '내용을 입력해주세요.';
    }

    if (data.content && data.content.length > 2000) {
        errors.content = '내용은 2000글자 이하로 입력해주세요.';
    }

    return errors;
}

function hasValidationErrors(errors) {
    return Object.keys(errors).length > 0;
}

function showValidationErrors(errors, form) {
    clearValidationErrors(form);

    Object.keys(errors).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        const errorElement = form.querySelector(`#${fieldName}-error`);

        if (field) {
            field.classList.add('error');
        }

        if (errorElement) {
            errorElement.textContent = errors[fieldName];
            errorElement.classList.remove('hidden');
        }
    });
}

function clearValidationErrors(form) {
    const errorFields = form.querySelectorAll('.error');
    const errorMessages = form.querySelectorAll('.error-message');

    errorFields.forEach(field => {
        field.classList.remove('error');
    });

    errorMessages.forEach(message => {
        message.textContent = '';
        message.classList.add('hidden');
    });
}

function validateFormField(field) {
    const form = field.closest('form');
    const fieldName = field.name;
    const errorElement = form.querySelector(`#${fieldName}-error`);

    let errors = {};

    if (form.id === 'register-form') {
        const formData = getFormData(form);
        errors = validateRegisterForm(formData);
    } else if (form.id === 'login-form') {
        const formData = getFormData(form);
        errors = validateLoginForm(formData);
    } else if (form.id === 'post-form') {
        const formData = getFormData(form);
        errors = validatePostForm(formData);
    } else if (form.id === 'comment-form') {
        const formData = getFormData(form);
        errors = validateCommentForm(formData);
    }

    if (errors[fieldName]) {
        field.classList.add('error');
        if (errorElement) {
            errorElement.textContent = errors[fieldName];
            errorElement.classList.remove('hidden');
        }
        return false;
    }

    field.classList.remove('error');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }
    return true;
}

function getFormData(form) {
    const formData = {};
    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else {
            formData[input.name] = input.value;
        }
    });

    return formData;
}
