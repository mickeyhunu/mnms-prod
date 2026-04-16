/**
 * 파일 역할: business-info(광고프로필 관리) 페이지의 입력/미리보기/저장 상호작용을 담당하는 스크립트 파일.
 */
const REGION_DISTRICT_MAP = {
    서울: ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    경기: ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
    인천: ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
    부산: ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
    대구: ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
    광주: ['광산구', '남구', '동구', '북구', '서구'],
    대전: ['대덕구', '동구', '서구', '유성구', '중구'],
    울산: ['남구', '동구', '북구', '울주군', '중구'],
    강원: ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
    경남: ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
    경북: ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
    전남: ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    전북: ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
    충남: ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
    충북: ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청원군', '청주시', '충주시'],
    세종: ['세종시'],
    제주: ['서귀포시', '제주시']
};

const adProfileState = {
    currentAdId: null,
    uploadedImageUrl: '',
    me: null,
    isSaving: false
};
const DEFAULT_AD_IMAGE_URL = 'https://image.bubblealba.com/assets/advertiser/pending.webp';
const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;

function createHourOptions(hourSelect) {
    if (!hourSelect) return;
    const options = ['시간선택'];
    for (let hour = 0; hour <= 24; hour += 1) {
        options.push(`${String(hour).padStart(2, '0')}시`);
    }

    hourSelect.innerHTML = options
        .map((label, index) => `<option value="${index === 0 ? '' : label}">${label}</option>`)
        .join('');
}

function updateSelectOptions(selectElement, values, placeholder = '선택') {
    if (!selectElement) return;

    const options = [`<option value="" selected>${placeholder}</option>`]
        .concat(values.map((value) => `<option value="${value}">${value}</option>`));

    selectElement.innerHTML = options.join('');
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
        reader.readAsDataURL(file);
    });
}

async function uploadAdImage(file) {
    const dataUrl = await fileToDataUrl(file);
    const response = await APIClient.post('/uploads/ads/images', {
        files: [{
            dataUrl,
            fileName: file.name || 'ad-profile-image.png'
        }]
    });

    const uploaded = Array.isArray(response?.files) ? response.files[0] : null;
    if (!uploaded?.url) {
        throw new Error('대표이미지 업로드에 실패했습니다.');
    }

    return uploaded.url;
}

function bindAdProfileInteractions() {
    const regionSelect = document.getElementById('ad-profile-region');
    const districtSelect = document.getElementById('ad-profile-district');
    const categorySelect = document.getElementById('ad-profile-category');
    const openHourSelect = document.getElementById('ad-profile-open-hour');
    const closeHourSelect = document.getElementById('ad-profile-close-hour');
    const titleInput = document.getElementById('ad-profile-title');
    const businessNameInput = document.getElementById('ad-profile-name');
    const managerNameInput = document.getElementById('ad-profile-manager');
    const managerContactInput = document.getElementById('ad-profile-manager-contact');
    const descriptionInput = document.getElementById('ad-profile-description');
    const descriptionEditor = document.getElementById('ad-profile-description-editor');
    const editorToolbar = document.querySelector('.ad-profile-editor-toolbar');
    const editorImageButton = document.getElementById('ad-profile-editor-image-btn');
    const editorImageInput = document.getElementById('ad-profile-editor-image-input');

    const previewTitle = document.getElementById('ad-profile-preview-title');
    const previewManager = document.getElementById('ad-profile-preview-manager');
    const previewDetail = document.getElementById('ad-profile-preview-detail');

    const syncDescriptionValue = () => {
        if (!descriptionInput || !descriptionEditor) return '';
        const html = descriptionEditor.innerHTML.trim();
        descriptionInput.value = html;
        return descriptionEditor.textContent?.trim() || '';
    };

    createHourOptions(openHourSelect);
    createHourOptions(closeHourSelect);
    updateSelectOptions(regionSelect, Object.keys(REGION_DISTRICT_MAP));

    const syncPreview = () => {
        const storeName = businessNameInput?.value?.trim() || '업소명';
        const title = titleInput?.value?.trim() || '제목을 입력해주세요.';
        syncDescriptionValue();
        const region = regionSelect?.value?.trim() || '선택';
        const district = districtSelect?.value?.trim() || '선택';
        const category = categorySelect?.value?.trim() || '선택';
        const managerName = managerNameInput?.value?.trim() || '담당자';
        const managerContact = managerContactInput?.value?.trim() || '연락처';
        const openHour = openHourSelect?.value?.trim() || '시간선택';
        const closeHour = closeHourSelect?.value?.trim() || '시간선택';
        const isOpenHourSelected = openHour && openHour !== '시간선택';
        const isCloseHourSelected = closeHour && closeHour !== '시간선택';
        const formattedTime = (isOpenHourSelected && isCloseHourSelected)
            ? `${openHour} ~ ${closeHour}`
            : '시간선택 ~ 시간선택';

        if (previewTitle) previewTitle.textContent = `[${region}-${storeName}] ${title}`;
        if (previewManager) previewManager.textContent = `${managerName} · ${managerContact}`;
        if (previewDetail) previewDetail.textContent = `${region} ${district} · ${category} · ${formattedTime}`;
    };

    if (descriptionEditor && descriptionInput) {
        descriptionEditor.innerHTML = descriptionInput.value || '';
        descriptionEditor.addEventListener('input', syncPreview);
        descriptionEditor.addEventListener('blur', syncPreview);
    }

    editorToolbar?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-editor-command]');
        if (!button || !descriptionEditor) return;

        event.preventDefault();
        descriptionEditor.focus();
        document.execCommand(button.dataset.editorCommand, false, null);
        syncPreview();
    });

    managerContactInput?.addEventListener('input', () => {
        managerContactInput.value = formatPhoneNumber(managerContactInput.value);
        syncPreview();
    });

    editorImageButton?.addEventListener('click', () => editorImageInput?.click());
    editorImageInput?.addEventListener('change', async () => {
        const file = editorImageInput.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        try {
            const imageUrl = await uploadAdImage(file);
            if (!descriptionEditor) return;
            descriptionEditor.focus();
            document.execCommand('insertImage', false, imageUrl);
            syncPreview();
        } catch (error) {
            showSaveMessage(error.message || '에디터 이미지 첨부에 실패했습니다.', true);
        } finally {
            editorImageInput.value = '';
        }
    });

    regionSelect?.addEventListener('change', () => {
        const selectedRegion = regionSelect.value;
        updateSelectOptions(districtSelect, REGION_DISTRICT_MAP[selectedRegion] || []);
        syncPreview();
    });

    [districtSelect, categorySelect, openHourSelect, closeHourSelect, titleInput, businessNameInput, managerNameInput, managerContactInput]
        .forEach((element) => {
            element?.addEventListener('input', syncPreview);
            element?.addEventListener('change', syncPreview);
        });

    syncPreview();
}

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length === 10 ? 6 : 7)}-${digits.slice(digits.length === 10 ? 6 : 7)}`;
}

function showSaveMessage(message, isError = false) {
    const messageElement = document.getElementById('ad-profile-save-message');
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.style.color = isError ? '#dc2626' : '#15803d';
}

async function loadMyAdProfile() {
    const response = await APIClient.get('/users/me/business-ads');
    const existingAd = Array.isArray(response?.content) ? response.content[0] : null;
    adProfileState.currentAdId = Number(existingAd?.id || 0) || null;
    if (existingAd) applyAdProfileToForm(existingAd);
}

async function saveAdProfile() {
    if (adProfileState.isSaving) return;

    const storeName = String(document.getElementById('ad-profile-name')?.value || '').trim();
    const region = String(document.getElementById('ad-profile-region')?.value || '').trim();
    const district = String(document.getElementById('ad-profile-district')?.value || '').trim();
    const category = String(document.getElementById('ad-profile-category')?.value || '').trim();
    const openHour = String(document.getElementById('ad-profile-open-hour')?.value || '').trim();
    const closeHour = String(document.getElementById('ad-profile-close-hour')?.value || '').trim();
    const title = String(document.getElementById('ad-profile-title')?.value || '').trim();
    const businessName = String(document.getElementById('ad-profile-name')?.value || '').trim();
    const managerName = String(document.getElementById('ad-profile-manager')?.value || '').trim();
    const managerContact = String(document.getElementById('ad-profile-manager-contact')?.value || '').trim();
    const description = String(document.getElementById('ad-profile-description')?.value || '').trim();
    const saveButton = document.getElementById('ad-profile-save-btn');

    if (!region || !district || !title) {
        showSaveMessage('지역/세부 지역/제목은 필수입니다.', true);
        return;
    }

    try {
        adProfileState.isSaving = true;
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '저장 중...';
        }

        if (managerContact && !PHONE_PATTERN.test(managerContact)) {
            showSaveMessage('담당자 연락처는 010-0000-0000 형식으로 입력해주세요.', true);
            return;
        }

        const imageUrl = adProfileState.uploadedImageUrl || DEFAULT_AD_IMAGE_URL;

        const payload = {
            businessName,
            managerName,
            managerContact,
            title,
            imageUrl,
            linkUrl: '#',
            region,
            district,
            category,
            openHour,
            closeHour,
            description,
            planType: adProfileState.me?.isBusiness ? 'PREMIUM' : 'NORMAL',
            isActive: true,
            displayOrder: 0
        };

        if (adProfileState.currentAdId) {
            await APIClient.put(`/users/me/business-ads/${adProfileState.currentAdId}`, payload);
        } else {
            const created = await APIClient.post('/users/me/business-ads', payload);
            adProfileState.currentAdId = Number(created?.id || 0) || adProfileState.currentAdId;
        }

        showSaveMessage('광고프로필이 저장되었습니다. 업체정보 메뉴에서 확인할 수 있습니다.');
        await loadMyAdProfile();
    } catch (error) {
        showSaveMessage(error.message || '광고프로필 저장에 실패했습니다.', true);
    } finally {
        adProfileState.isSaving = false;
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '광고프로필 저장';
        }
    }
}

function applyAdProfileToForm(ad) {
    if (!ad) return;

    const storeNameInput = document.getElementById('ad-profile-name');
    const regionSelect = document.getElementById('ad-profile-region');
    const districtSelect = document.getElementById('ad-profile-district');
    const categorySelect = document.getElementById('ad-profile-category');
    const openHourSelect = document.getElementById('ad-profile-open-hour');
    const closeHourSelect = document.getElementById('ad-profile-close-hour');
    const titleInput = document.getElementById('ad-profile-title');
    const businessNameInput = document.getElementById('ad-profile-name');
    const managerNameInput = document.getElementById('ad-profile-manager');
    const managerContactInput = document.getElementById('ad-profile-manager-contact');
    const descriptionInput = document.getElementById('ad-profile-description');
    const descriptionEditor = document.getElementById('ad-profile-description-editor');

    if (storeNameInput) storeNameInput.value = ad.businessName || ad.storeName || '';
    if (managerNameInput) managerNameInput.value = ad.managerName || '';
    if (regionSelect) {
        regionSelect.value = ad.region || '';
        updateSelectOptions(districtSelect, REGION_DISTRICT_MAP[ad.region] || []);
    }
    if (districtSelect) districtSelect.value = ad.district || '';
    if (categorySelect) categorySelect.value = ad.category || '';
    if (openHourSelect) openHourSelect.value = ad.openHour || '';
    if (closeHourSelect) closeHourSelect.value = ad.closeHour || '';
    if (titleInput) titleInput.value = ad.title || '';
    if (businessNameInput) businessNameInput.value = ad.businessName || '';
    if (managerNameInput) managerNameInput.value = ad.managerName || '';
    if (managerContactInput) managerContactInput.value = formatPhoneNumber(ad.managerContact || '');
    if (descriptionInput) descriptionInput.value = ad.description || '';
    if (descriptionEditor) descriptionEditor.innerHTML = ad.description || '';
    adProfileState.uploadedImageUrl = ad.imageUrl || DEFAULT_AD_IMAGE_URL;
}

async function initAdProfileManagementPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    try {
        const me = await APIClient.get('/auth/me');
        adProfileState.me = me;

        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);
        const managerNameInput = document.getElementById('ad-profile-manager');
        if (managerNameInput) {
            managerNameInput.value = String(me?.name || me?.nickname || '').trim();
        }

        if (typeof initHeader === 'function') initHeader();
        Auth.bindLogoutButton();
        bindAdProfileInteractions();

        const saveButton = document.getElementById('ad-profile-save-btn');
        saveButton?.addEventListener('click', saveAdProfile);

        await loadMyAdProfile();
    } catch (error) {
        alert(error.message || '광고프로필 페이지를 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdProfileManagementPage, { once: true });
} else {
    initAdProfileManagementPage();
}
