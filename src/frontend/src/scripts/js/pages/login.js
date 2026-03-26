/**
 * 파일 역할: login 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
const KAKAO_JAVASCRIPT_KEY = '';

function initLoginPage() {
    if (Auth.redirectIfAuthenticated()) {
        return;
    }
    setupLoginForm();
    setupKakaoLogin();
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) {
        console.error('Login form not found');
        return;
    }
    form.addEventListener('submit', handleLogin);
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateFormField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                validateFormField(input);
            }
        });
    });
}

function setupKakaoLogin() {
    const kakaoLoginBtn = document.getElementById('kakao-login-btn');
    if (!kakaoLoginBtn) {
        return;
    }

    const isReady = initializeKakaoSdk();
    if (!isReady) {
        kakaoLoginBtn.disabled = true;
        kakaoLoginBtn.title = 'login.js의 KAKAO_JAVASCRIPT_KEY에 API 키를 입력하세요.';
        return;
    }

    kakaoLoginBtn.addEventListener('click', handleKakaoLogin);
}

function initializeKakaoSdk() {
    if (!window.Kakao) {
        console.error('Kakao SDK 로드에 실패했습니다.');
        return false;
    }

    if (!KAKAO_JAVASCRIPT_KEY) {
        console.warn('KAKAO_JAVASCRIPT_KEY가 비어있습니다.');
        return false;
    }

    if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
    }

    return true;
}

async function handleKakaoLogin() {
    try {
        const authObj = await new Promise((resolve, reject) => {
            window.Kakao.Auth.login({
                scope: 'profile_nickname,account_email',
                success: resolve,
                fail: reject
            });
        });

        const userInfo = await new Promise((resolve, reject) => {
            window.Kakao.API.request({
                url: '/v2/user/me',
                success: resolve,
                fail: reject
            });
        });

        localStorage.setItem('kakao_auth', JSON.stringify({
            accessToken: authObj.access_token,
            user: userInfo
        }));

        showNotification('카카오 로그인이 완료되었습니다.', 'success');
        window.location.href = 'http://localhost:8080/';
    } catch (error) {
        console.error('카카오 로그인 에러:', error);
        showNotification('카카오 로그인에 실패했습니다.', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const formData = {
        loginId: form.loginId.value.trim(),
        password: form.password.value
    };
    
    const errors = validateLoginForm(formData);
    if (hasValidationErrors(errors)) {
        showValidationErrors(errors, form);
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        hideElement(errorBanner);
        
        const response = await AuthAPI.login(formData);
        
        showNotification(MESSAGES.LOGIN_SUCCESS, 'success');

        
        setTimeout(() => {
            window.location.href = 'http://localhost:8080/';
        }, 2000);
        
    } catch (error) {
        console.error('로그인 에러:', error);
        if (errorMessage) {
            errorMessage.textContent = error.message || '로그인 중 오류가 발생했습니다.';
        }
        showElement(errorBanner);
    } finally {
        setLoading(submitBtn, false);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
