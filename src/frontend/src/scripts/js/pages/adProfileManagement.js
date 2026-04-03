/**
 * 파일 역할: business-info(광고프로필 관리) 페이지의 입력/미리보기 상호작용을 담당하는 스크립트 파일.
 */
function createHourOptions(hourSelect) {
    if (!hourSelect) return;
    const options = ['선택'];
    for (let hour = 0; hour <= 24; hour += 1) {
        options.push(`${String(hour).padStart(2, '0')}시`);
    }

    hourSelect.innerHTML = options
        .map((label, index) => `<option value="${index === 0 ? '' : label}">${label}</option>`)
        .join('');
}

function sanitizePhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '').slice(0, 11);
}

function formatPhoneNumber(value) {
    const numbers = sanitizePhoneNumber(value);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
}

function bindAdProfileInteractions() {
    const nameInput = document.getElementById('ad-profile-name');
    const phoneInput = document.getElementById('ad-profile-phone');
    const regionSelect = document.getElementById('ad-profile-region');
    const categorySelect = document.getElementById('ad-profile-category');
    const meridiemSelect = document.getElementById('ad-profile-meridiem');
    const hourSelect = document.getElementById('ad-profile-hour');
    const titleInput = document.getElementById('ad-profile-title');
    const descriptionInput = document.getElementById('ad-profile-description');
    const imageInput = document.getElementById('ad-profile-image-input');
    const imageUploadButton = document.getElementById('ad-profile-image-upload-btn');
    const imagePreview = document.getElementById('ad-profile-image-preview');
    const previewThumb = document.getElementById('ad-profile-preview-thumb');

    const previewTitle = document.getElementById('ad-profile-preview-title');
    const previewSub = document.getElementById('ad-profile-preview-sub');
    const previewDesc = document.getElementById('ad-profile-preview-desc');

    createHourOptions(hourSelect);

    const syncPreview = () => {
        const title = titleInput?.value?.trim() || '제목을 입력해주세요.';
        const description = descriptionInput?.value?.trim() || '내용을 입력해주세요.';
        const region = regionSelect?.value?.trim() || '선택';
        const category = categorySelect?.value?.trim() || '선택';
        const meridiem = meridiemSelect?.value?.trim() || '오전';
        const hour = hourSelect?.value?.trim() || '선택';
        const formattedTime = hour === '선택' ? '선택' : `${meridiem} ${hour}`;

        if (previewTitle) previewTitle.textContent = title;
        if (previewDesc) previewDesc.textContent = description;
        if (previewSub) previewSub.textContent = `협의 · ${region} · ${category} · ${formattedTime}`;
    };

    phoneInput?.addEventListener('input', () => {
        phoneInput.value = formatPhoneNumber(phoneInput.value);
    });

    [nameInput, regionSelect, categorySelect, meridiemSelect, hourSelect, titleInput, descriptionInput]
        .forEach((element) => element?.addEventListener('input', syncPreview));

    imageUploadButton?.addEventListener('click', () => imageInput?.click());
    imageInput?.addEventListener('change', () => {
        const file = imageInput.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        const objectUrl = URL.createObjectURL(file);
        if (imagePreview) {
            imagePreview.src = objectUrl;
            imagePreview.classList.remove('hidden');
        }
        if (previewThumb) {
            previewThumb.src = objectUrl;
        }
    });

    syncPreview();
}

async function initAdProfileManagementPage() {
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
        bindAdProfileInteractions();
    } catch (error) {
        alert(error.message || '광고프로필 페이지를 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdProfileManagementPage, { once: true });
} else {
    initAdProfileManagementPage();
}
