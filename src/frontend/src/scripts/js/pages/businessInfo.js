/**
 * 파일 역할: business-info 페이지의 사업자정보 관리 UI 상호작용을 담당하는 스크립트 파일.
 */
function sanitizeBusinessNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '').slice(0, 12);
}

function updateVerifyButtonState() {
    const numberInput = document.getElementById('business-number');
    const verifyButton = document.getElementById('business-verify-btn');
    if (!numberInput || !verifyButton) return;

    const onlyDigits = sanitizeBusinessNumber(numberInput.value);
    numberInput.value = onlyDigits;
    verifyButton.disabled = onlyDigits.length !== 10;
}

function bindBusinessInfoFormEvents() {
    const fileInput = document.getElementById('business-license-input');
    const fileNameText = document.getElementById('business-license-file-name');
    const uploadButton = document.getElementById('business-license-upload-btn');
    const numberInput = document.getElementById('business-number');
    const verifyButton = document.getElementById('business-verify-btn');
    const addressInput = document.getElementById('business-address');
    const addressSearchButton = document.getElementById('business-address-search-btn');

    uploadButton?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', () => {
        const selectedFile = fileInput.files?.[0];
        if (!fileNameText) return;
        fileNameText.textContent = selectedFile ? `선택된 파일: ${selectedFile.name}` : '등록할 이미지를 선택해주세요.';
    });

    numberInput?.addEventListener('input', updateVerifyButtonState);

    verifyButton?.addEventListener('click', () => {
        verifyButton.textContent = '검증 완료';
        verifyButton.disabled = true;
    });

    addressSearchButton?.addEventListener('click', () => {
        const manualAddress = window.prompt('사업자 주소를 입력해주세요.', addressInput?.value || '');
        if (manualAddress === null) return;
        if (addressInput) addressInput.value = manualAddress.trim();
    });

    updateVerifyButtonState();
}

async function initBusinessInfoPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    try {
        const me = await APIClient.get('/auth/me');
        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);

        if (typeof initHeader === 'function') initHeader();
        Auth.bindLogoutButton();
        bindBusinessInfoFormEvents();
    } catch (error) {
        alert(error.message || '사업자 정보를 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBusinessInfoPage, { once: true });
} else {
    initBusinessInfoPage();
}
