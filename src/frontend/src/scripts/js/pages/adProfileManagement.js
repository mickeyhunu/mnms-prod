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
    isSaving: false,
    syncPreview: null,
    descriptionEditor: null,
    currentPlanType: 'BASIC'
};
const DEFAULT_AD_IMAGE_URL = '/src/assets/image/ad-profile-default.webp';
const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const MIN_STAMP_EVENT_COUNT = 5;
const AD_PLAN_LABELS = { BASIC: '베이직', PLUS: '플러스', PREMIUM: '프리미엄', NORMAL: '베이직' };
const AD_PLAN_DAYS = { BASIC: 3, PLUS: 2, PREMIUM: 1, NORMAL: 3 };

function normalizeAdPlanType(planType) {
    const normalized = String(planType || '').trim().toUpperCase();
    if (['BASIC', 'PLUS', 'PREMIUM'].includes(normalized)) return normalized;
    return normalized === 'NORMAL' ? 'BASIC' : 'BASIC';
}

function formatActivationDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function createHourOptions(hourSelect) {
    if (!hourSelect) return;
    const options = ['시간선택'];
    for (let hour = 0; hour <= 24; hour += 1) {
        options.push(`${String(hour).padStart(2, '0')}:00`);
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

async function readAdImageAsDataUrl(file) {
    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl.startsWith('data:image/')) {
        throw new Error('이미지 파일만 업로드할 수 있습니다.');
    }
    return dataUrl;
}

function resolveAdProfileImageUrl(imageUrl = '') {
    return String(imageUrl || '').trim() || DEFAULT_AD_IMAGE_URL;
}

function updateAdProfileImagePreviews(imageUrl = '') {
    const normalizedImageUrl = String(imageUrl || '').trim();
    const resolvedImageUrl = resolveAdProfileImageUrl(normalizedImageUrl);
    const hasUploadedImage = Boolean(normalizedImageUrl) && resolvedImageUrl !== DEFAULT_AD_IMAGE_URL;
    const previewImageUrl = hasUploadedImage ? resolvedImageUrl : DEFAULT_AD_IMAGE_URL;
    const uploadPreview = document.getElementById('ad-profile-image-preview');
    const uploadButton = document.getElementById('ad-profile-image-upload-btn');
    const addIcon = uploadButton?.querySelector('.ad-profile-image-add-icon');
    const clearButton = document.getElementById('ad-profile-image-clear-btn');
    const directoryPreview = document.getElementById('ad-profile-preview-image');
    const detailPreviewImage = document.getElementById('ad-profile-detail-preview-image');
    const detailPreviewImageBlur = document.getElementById('ad-profile-detail-preview-image-blur');

    if (uploadPreview) {
        uploadPreview.src = previewImageUrl;
        uploadPreview.alt = '대표이미지 미리보기';
        uploadPreview.classList.toggle('hidden', !hasUploadedImage);
    }

    uploadButton?.classList.toggle('has-image', hasUploadedImage);
    uploadButton?.setAttribute('aria-label', hasUploadedImage ? '대표이미지 변경' : '대표이미지 업로드');
    addIcon?.classList.toggle('hidden', hasUploadedImage);
    clearButton?.classList.toggle('hidden', !hasUploadedImage);

    if (directoryPreview) {
        directoryPreview.src = previewImageUrl;
        directoryPreview.alt = '대표이미지 미리보기';
    }
    if (detailPreviewImage) {
        detailPreviewImage.src = previewImageUrl;
        detailPreviewImage.alt = '대표이미지 미리보기';
    }
    if (detailPreviewImageBlur) {
        detailPreviewImageBlur.src = previewImageUrl;
    }
}

function setAdProfileImageUrl(imageUrl = '') {
    adProfileState.uploadedImageUrl = String(imageUrl || '').trim();
    updateAdProfileImagePreviews(adProfileState.uploadedImageUrl);
    updateAdProfileActionButtons();
}

function isAnimatedRepresentativeImage(file) {
    const fileType = String(file?.type || '').toLowerCase();
    const fileName = String(file?.name || '').toLowerCase();
    return fileType === 'image/gif'
        || fileType === 'image/apng'
        || /\.(gif|apng)$/u.test(fileName);
}

function clearRepresentativeImage() {
    const imageInput = document.getElementById('ad-profile-image-input');
    if (imageInput) imageInput.value = '';
    setAdProfileImageUrl('');
    saveDraftData();
}

async function handleRepresentativeImageSelection(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showSaveMessage('이미지 파일만 업로드할 수 있습니다.');
        return;
    }
    if (isAnimatedRepresentativeImage(file)) {
        showSaveMessage('움직이는 이미지는 등록할 수 없습니다.');
        return;
    }

    const uploadButton = document.getElementById('ad-profile-image-upload-btn');

    try {
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.classList.add('is-uploading');
            uploadButton.setAttribute('aria-busy', 'true');
            uploadButton.setAttribute('aria-label', '대표이미지 처리 중');
        }
        const imageUrl = await readAdImageAsDataUrl(file);
        setAdProfileImageUrl(imageUrl);
    } catch (error) {
        showSaveMessage(error.message || '대표이미지 처리에 실패했습니다.');
    } finally {
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.classList.remove('is-uploading');
            uploadButton.removeAttribute('aria-busy');
            uploadButton.setAttribute('aria-label', adProfileState.uploadedImageUrl ? '대표이미지 변경' : '대표이미지 업로드');
        }
    }
}

function getQuillPlainText(quill) {
    if (!quill) return '';
    return String(quill.getText() || '').replace(/\s+$/g, '').trim();
}

function getQuillHtml(quill) {
    if (!quill?.root) return '';
    return getQuillPlainText(quill) ? quill.root.innerHTML.trim() : '';
}

function syncDescriptionInputFromEditor() {
    const descriptionInput = document.getElementById('ad-profile-description');
    if (!descriptionInput || !adProfileState.descriptionEditor) return '';

    const html = getQuillHtml(adProfileState.descriptionEditor);
    descriptionInput.value = html;
    return getQuillPlainText(adProfileState.descriptionEditor);
}

function setDescriptionEditorHtml(html) {
    const normalizedHtml = String(html || '').trim();
    const descriptionInput = document.getElementById('ad-profile-description');
    if (descriptionInput) descriptionInput.value = normalizedHtml;

    const quill = adProfileState.descriptionEditor;
    if (!quill?.clipboard) return;

    quill.setContents([], 'silent');
    if (normalizedHtml) {
        quill.clipboard.dangerouslyPasteHTML(normalizedHtml, 'silent');
    }
    syncDescriptionInputFromEditor();
}

function bindDescriptionEditor({ syncPreview, saveDraftData: saveDraftDataCallback }) {
    const descriptionInput = document.getElementById('ad-profile-description');
    const descriptionEditor = document.getElementById('ad-profile-description-editor');
    const editorImageInput = document.getElementById('ad-profile-editor-image-input');

    if (!descriptionInput || !descriptionEditor) return;

    const notifyEditorChanged = () => {
        syncDescriptionInputFromEditor();
        syncPreview();
        saveDraftDataCallback();
    };

    if (!window.Quill) {
        descriptionInput.classList.remove('hidden');
        descriptionInput.addEventListener('input', () => {
            syncPreview();
            saveDraftDataCallback();
        });
        descriptionInput.addEventListener('blur', saveDraftDataCallback);
        descriptionEditor.closest('.ad-profile-editor')?.classList.add('hidden');
        syncPreview();
        return;
    }

    const quill = new window.Quill(descriptionEditor, {
        theme: 'snow',
        placeholder: '내용을 입력해주세요.',
        modules: {
            toolbar: {
                container: '#ad-profile-description-toolbar',
                handlers: {
                    image() {
                        editorImageInput?.click();
                    }
                }
            }
        }
    });

    adProfileState.descriptionEditor = quill;
    setDescriptionEditorHtml(descriptionInput.value);

    quill.on('text-change', notifyEditorChanged);
    quill.on('selection-change', (range) => {
        if (!range) saveDraftDataCallback();
    });

    editorImageInput?.addEventListener('change', async () => {
        const file = editorImageInput.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        try {
            const imageUrl = await readAdImageAsDataUrl(file);
            const selection = quill.getSelection(true);
            const insertIndex = selection ? selection.index : quill.getLength();
            quill.insertEmbed(insertIndex, 'image', imageUrl, 'user');
            quill.setSelection(insertIndex + 1, 0, 'silent');
            notifyEditorChanged();
        } catch (error) {
            showSaveMessage(error.message || '에디터 이미지 첨부에 실패했습니다.');
        } finally {
            editorImageInput.value = '';
        }
    });
}


function bindAdProfilePreviewToggle() {
    const toggleButton = document.getElementById('ad-profile-preview-toggle');
    const previewContent = document.getElementById('ad-profile-preview-content');
    if (!toggleButton || !previewContent) return;

    const setPreviewOpen = (isOpen) => {
        previewContent.classList.toggle('hidden', !isOpen);
        toggleButton.setAttribute('aria-expanded', String(isOpen));
        toggleButton.classList.toggle('is-open', isOpen);
    };

    setPreviewOpen(false);
    toggleButton.addEventListener('click', () => {
        setPreviewOpen(toggleButton.getAttribute('aria-expanded') !== 'true');
    });
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
    const imageInput = document.getElementById('ad-profile-image-input');
    const imageUploadButton = document.getElementById('ad-profile-image-upload-btn');
    const imageClearButton = document.getElementById('ad-profile-image-clear-btn');
    const kakaoTalkIdInput = document.getElementById('ad-profile-kakao-talk-id');
    const telegramIdInput = document.getElementById('ad-profile-telegram-id');
    const showBusinessAddressMapInput = document.getElementById('ad-profile-show-business-address-map');
    const useStampEventInput = document.getElementById('ad-profile-use-stamp-event');
    const stampEventDescriptionInput = document.getElementById('ad-profile-stamp-event-description');
    const stampEventCountInput = document.getElementById('ad-profile-stamp-event-count');

    const previewTitle = document.getElementById('ad-profile-preview-title');
    const previewManager = document.getElementById('ad-profile-preview-manager');
    const previewDetail = document.getElementById('ad-profile-preview-detail');

    createHourOptions(openHourSelect);
    createHourOptions(closeHourSelect);
    updateSelectOptions(regionSelect, Object.keys(REGION_DISTRICT_MAP));
    bindAdProfilePreviewToggle();

    const syncPreview = () => {
        const storeName = businessNameInput?.value?.trim() || '업소명';
        const title = titleInput?.value?.trim() || '제목을 입력해주세요.';
        syncDescriptionInputFromEditor();
        const region = regionSelect?.value?.trim() || '선택';
        const district = districtSelect?.value?.trim() || '선택';
        const category = categorySelect?.value?.trim() || '선택';
        const managerName = managerNameInput?.value?.trim() || '담당자';
        const managerContact = managerContactInput?.value?.trim() || '연락처';
        const kakaoTalkId = kakaoTalkIdInput?.value?.trim() || '';
        const telegramId = telegramIdInput?.value?.trim() || '';
        const showBusinessAddressMap = Boolean(showBusinessAddressMapInput?.checked);
        const useStampEvent = Boolean(useStampEventInput?.checked);
        const stampEventDescription = stampEventDescriptionInput?.value?.trim() || '';
        const stampEventCount = Number(stampEventCountInput?.value || 0);
        const description = String(document.getElementById('ad-profile-description')?.value || '').trim();
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
        syncAdProfileDetailPreview({
            storeName,
            title,
            region,
            district,
            category,
            managerName,
            managerContact,
            formattedTime,
            kakaoTalkId,
            telegramId,
            showBusinessAddressMap,
            useStampEvent,
            stampEventDescription,
            stampEventCount,
            description
        });
    };

    bindDescriptionEditor({ syncPreview, saveDraftData });

    imageUploadButton?.addEventListener('click', () => imageInput?.click());
    imageClearButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearRepresentativeImage();
    });
    imageInput?.addEventListener('change', async () => {
        await handleRepresentativeImageSelection(imageInput.files?.[0]);
        imageInput.value = '';
        saveDraftData();
    });

    managerContactInput?.addEventListener('input', () => {
        managerContactInput.value = formatPhoneNumber(managerContactInput.value);
        syncPreview();
        saveDraftData();
    });

    regionSelect?.addEventListener('change', () => {
        const selectedRegion = regionSelect.value;
        updateSelectOptions(districtSelect, REGION_DISTRICT_MAP[selectedRegion] || []);
        syncPreview();
        saveDraftData();
    });

    const syncStampEventFieldState = () => {
        const isEnabled = Boolean(useStampEventInput?.checked);
        [stampEventDescriptionInput, stampEventCountInput].forEach((input) => {
            if (!input) return;
            input.disabled = !isEnabled;
            input.required = isEnabled;
            if (!isEnabled) input.value = '';
        });
    };

    stampEventDescriptionInput?.addEventListener('input', () => {
        syncPreview();
        saveDraftData();
    });
    stampEventCountInput?.addEventListener('input', () => {
        stampEventCountInput.value = String(stampEventCountInput.value || '').replace(/\D/g, '').slice(0, 3);
        syncPreview();
        saveDraftData();
    });
    useStampEventInput?.addEventListener('change', () => {
        syncStampEventFieldState();
        syncPreview();
        saveDraftData();
    });

    [districtSelect, categorySelect, openHourSelect, closeHourSelect, titleInput, businessNameInput, managerNameInput, kakaoTalkIdInput, telegramIdInput, showBusinessAddressMapInput]
        .forEach((element) => {
            element?.addEventListener('input', syncPreview);
            element?.addEventListener('change', syncPreview);
            element?.addEventListener('input', saveDraftData);
            element?.addEventListener('change', saveDraftData);
        });

    syncStampEventFieldState();
    adProfileState.syncPreview = syncPreview;
    syncPreview();
}

function normalizeBooleanFlag(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    return ['1', 'true', 'y', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function sanitizeAdProfilePreviewRichText(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) return '';

    const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'IMG']);
    const allowedClasses = new Set(['ql-align-center', 'ql-align-right', 'ql-align-justify', 'ql-size-small', 'ql-size-large', 'ql-size-huge']);
    const allowedAttributes = new Set(['href', 'target', 'rel', 'src', 'alt', 'class', 'style']);
    const template = document.createElement('template');
    template.innerHTML = value;

    const sanitizeStyle = (styleValue = '') => String(styleValue || '')
        .split(';')
        .map((rule) => rule.trim())
        .filter((rule) => /^(color|background-color|text-align)\s*:/iu.test(rule))
        .join('; ');

    const sanitizeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
        if (node.nodeType !== Node.ELEMENT_NODE || !allowedTags.has(node.tagName)) return document.createTextNode('');

        const element = document.createElement(node.tagName.toLowerCase());
        Array.from(node.attributes || []).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const attrValue = String(attribute.value || '').trim();
            if (!allowedAttributes.has(name)) return;
            if (name === 'href') {
                if (/^(https?:|mailto:|tel:)/iu.test(attrValue)) element.setAttribute(name, attrValue);
                return;
            }
            if (name === 'src') {
                if (/^(https?:|data:image\/)/iu.test(attrValue)) element.setAttribute(name, attrValue);
                return;
            }
            if (name === 'target') {
                if (attrValue === '_blank') element.setAttribute(name, attrValue);
                return;
            }
            if (name === 'rel') {
                element.setAttribute(name, 'noopener noreferrer');
                return;
            }
            if (name === 'class') {
                const classes = attrValue.split(/\s+/u).filter((className) => allowedClasses.has(className));
                if (classes.length) element.className = classes.join(' ');
                return;
            }
            if (name === 'style') {
                const safeStyle = sanitizeStyle(attrValue);
                if (safeStyle) element.setAttribute(name, safeStyle);
                return;
            }
            element.setAttribute(name, attrValue);
        });
        node.childNodes.forEach((child) => element.appendChild(sanitizeNode(child)));
        return element;
    };

    const fragment = document.createDocumentFragment();
    template.content.childNodes.forEach((child) => fragment.appendChild(sanitizeNode(child)));

    const container = document.createElement('div');
    container.appendChild(fragment);
    return container.innerHTML.trim();
}

function setAdProfilePreviewText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function syncAdProfileDetailPreview({
    storeName,
    title,
    region,
    district,
    category,
    managerName,
    managerContact,
    formattedTime,
    kakaoTalkId,
    telegramId,
    showBusinessAddressMap,
    useStampEvent,
    stampEventDescription,
    stampEventCount,
    description
}) {
    setAdProfilePreviewText('ad-profile-detail-preview-eyebrow', `${region} ${district} · ${category}`);
    setAdProfilePreviewText('ad-profile-detail-preview-title', `[${region}-${storeName}] ${title}`);
    setAdProfilePreviewText('ad-profile-detail-preview-hours', `영업시간 ${formattedTime}`);
    setAdProfilePreviewText('ad-profile-detail-preview-business-name', storeName);
    setAdProfilePreviewText('ad-profile-detail-preview-manager-name', managerName);
    setAdProfilePreviewText('ad-profile-detail-preview-region', `${region} ${district}`);
    setAdProfilePreviewText('ad-profile-detail-preview-category', category);
    setAdProfilePreviewText('ad-profile-detail-preview-manager-contact', managerContact);

    const kakaoRow = document.getElementById('ad-profile-detail-preview-kakao-row');
    const telegramRow = document.getElementById('ad-profile-detail-preview-telegram-row');
    kakaoRow?.classList.toggle('hidden', !kakaoTalkId);
    telegramRow?.classList.toggle('hidden', !telegramId);
    setAdProfilePreviewText('ad-profile-detail-preview-kakao', kakaoTalkId || '-');
    setAdProfilePreviewText('ad-profile-detail-preview-telegram', telegramId || '-');

    const hasStampUseEvent = Boolean(useStampEvent && stampEventDescription && Number(stampEventCount) > 0);
    document.getElementById('ad-profile-detail-preview-stamp-row')?.classList.toggle('hidden', !useStampEvent);
    document.getElementById('ad-profile-detail-preview-stamp-use-row')?.classList.toggle('hidden', !hasStampUseEvent);
    setAdProfilePreviewText('ad-profile-detail-preview-stamp-count-label', `스탬프 ${Number(stampEventCount || MIN_STAMP_EVENT_COUNT).toLocaleString('ko-KR')}개 사용시`);
    setAdProfilePreviewText('ad-profile-detail-preview-stamp-description', stampEventDescription || '이벤트 설명');

    document.getElementById('ad-profile-detail-preview-map-section')?.classList.toggle('hidden', !showBusinessAddressMap);

    const descriptionPreview = document.getElementById('ad-profile-detail-preview-description');
    if (descriptionPreview) {
        const sanitizedDescription = sanitizeAdProfilePreviewRichText(description);
        descriptionPreview.innerHTML = sanitizedDescription || '<p>등록된 상세정보가 없습니다.</p>';
    }
}

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length === 10 ? 6 : 7)}-${digits.slice(digits.length === 10 ? 6 : 7)}`;
}

function showSaveMessage(message) {
    alert(message);
}

function getStampEventCountValue() {
    const count = Number.parseInt(String(document.getElementById('ad-profile-stamp-event-count')?.value || '').replace(/\D/g, ''), 10);
    return Number.isInteger(count) && count > 0 ? count : 0;
}

function getStampEventDescriptionValue() {
    return String(document.getElementById('ad-profile-stamp-event-description')?.value || '').trim();
}

function getStampEventFieldError({ useStampEvent, stampEventDescription, stampEventCount }) {
    if (!useStampEvent) return '';
    if (!String(stampEventDescription || '').trim()) {
        return '이벤트 설명.';
    }
    if (!Number.isInteger(Number(stampEventCount)) || Number(stampEventCount) < MIN_STAMP_EVENT_COUNT) {
        return `스탬프 이벤트는 스탬프 ${MIN_STAMP_EVENT_COUNT}개부터 설정할 수 있습니다.`;
    }
    return '';
}

function collectDraftData() {
    return {
        businessName: String(document.getElementById('ad-profile-name')?.value || '').trim(),
        managerName: String(document.getElementById('ad-profile-manager')?.value || '').trim(),
        managerContact: String(document.getElementById('ad-profile-manager-contact')?.value || '').trim(),
        title: String(document.getElementById('ad-profile-title')?.value || '').trim(),
        region: String(document.getElementById('ad-profile-region')?.value || '').trim(),
        district: String(document.getElementById('ad-profile-district')?.value || '').trim(),
        category: String(document.getElementById('ad-profile-category')?.value || '').trim(),
        openHour: String(document.getElementById('ad-profile-open-hour')?.value || '').trim(),
        closeHour: String(document.getElementById('ad-profile-close-hour')?.value || '').trim(),
        description: String(document.getElementById('ad-profile-description')?.value || '').trim(),
        imageUrl: adProfileState.uploadedImageUrl,
        kakaoTalkId: String(document.getElementById('ad-profile-kakao-talk-id')?.value || '').trim(),
        telegramId: String(document.getElementById('ad-profile-telegram-id')?.value || '').trim(),
        showBusinessAddressMap: Boolean(document.getElementById('ad-profile-show-business-address-map')?.checked),
        useStampEvent: Boolean(document.getElementById('ad-profile-use-stamp-event')?.checked),
        stampEventDescription: getStampEventDescriptionValue(),
        stampEventCount: getStampEventCountValue()
    };
}

function isAdProfileFormComplete() {
    const draft = collectDraftData();
    const requiredFieldError = getRequiredFieldError({
        storeName: draft.businessName,
        managerName: draft.managerName,
        managerContact: draft.managerContact,
        region: draft.region,
        district: draft.district,
        category: draft.category,
        openHour: draft.openHour,
        closeHour: draft.closeHour,
        title: draft.title,
        description: draft.description
    });
    const stampEventFieldError = getStampEventFieldError({
        useStampEvent: draft.useStampEvent,
        stampEventDescription: draft.stampEventDescription,
        stampEventCount: draft.stampEventCount
    });
    return !requiredFieldError && !stampEventFieldError;
}

function stripEmptyValues(payload) {
    return Object.entries(payload || {}).reduce((acc, [key, value]) => {
        if (value === null || value === undefined) return acc;
        const normalized = typeof value === 'string' ? value.trim() : value;
        if (normalized === '') return acc;
        acc[key] = normalized;
        return acc;
    }, {});
}

function hasAnyAdProfileValue(data) {
    if (!data || typeof data !== 'object') return false;

    const plainTextDescription = String(data.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .trim();

    const valuesToCheck = [
        data.businessName,
        data.managerName,
        data.managerContact,
        data.imageUrl,
        data.title,
        data.region,
        data.district,
        data.category,
        data.openHour,
        data.closeHour,
        plainTextDescription,
        data.kakaoTalkId,
        data.telegramId,
        data.showBusinessAddressMap ? 'Y' : '',
        data.useStampEvent ? 'Y' : '',
        data.useStampEvent ? data.stampEventDescription : '',
        data.useStampEvent ? data.stampEventCount : ''
    ];

    return valuesToCheck.some((value) => String(value || '').trim());
}

function updateAdProfileActionButtons() {
    const saveButton = document.getElementById('ad-profile-save-btn');
    const draftButton = document.getElementById('ad-profile-draft-btn');
    const hasAnyValue = hasAnyAdProfileValue(collectDraftData());
    const isComplete = isAdProfileFormComplete();

    saveButton?.classList.toggle('hidden', !isComplete);
    draftButton?.classList.toggle('hidden', isComplete);
    if (draftButton) draftButton.disabled = !hasAnyValue;
}

function saveDraftData() {
    updateAdProfileActionButtons();
}

function getRequiredFieldError({ storeName, managerName, managerContact, region, district, category, openHour, closeHour, title, description }) {
    if (!storeName) return '업소명을 입력해주세요.';
    if (!managerName) return '담당자명을 입력해주세요.';
    if (!managerContact) return '담당자 연락처를 입력해주세요.';
    if (!region) return '지역을 선택해주세요.';
    if (!district) return '세부 지역을 선택해주세요.';
    if (!category) return '업종을 선택해주세요.';
    if (!openHour) return '영업 시작 시간을 선택해주세요.';
    if (!closeHour) return '영업 종료 시간을 선택해주세요.';
    if (!title) return '제목을 입력해주세요.';
    if (!description) return '상세정보 내용을 입력해주세요.';
    return '';
}

async function loadMyAdProfile() {
    const response = await APIClient.get('/users/me/business-ads');
    const existingAd = Array.isArray(response?.content) ? response.content[0] : null;
    adProfileState.currentAdId = Number(existingAd?.id || 0) || null;
    if (existingAd) {
        applyAdProfileToForm(existingAd);
    } else {
        updateActivationPanel(null);
    }
}


function updateActivationPanel(ad) {
    const toggle = document.getElementById('ad-profile-activation-toggle');
    const label = document.getElementById('ad-profile-activation-toggle-label');
    const status = document.getElementById('ad-profile-activation-status');
    const isRegistered = String(ad?.registrationStatus || '').toUpperCase() === 'REGISTERED';
    const planType = normalizeAdPlanType(ad?.planType);
    const planLabel = AD_PLAN_LABELS[planType] || '베이직';
    const durationDays = AD_PLAN_DAYS[planType] || 3;
    const isSwitchOn = Boolean(Number(ad?.isActive || 0));
    const isVisible = Boolean(Number(ad?.isCurrentlyVisible || 0));
    const untilText = formatActivationDate(ad?.activatedUntil);

    if (toggle) {
        toggle.disabled = !adProfileState.currentAdId || !isRegistered || adProfileState.isSaving;
        toggle.checked = isSwitchOn;
    }
    if (label) label.textContent = `광고 활성화 ${isSwitchOn ? 'ON' : 'OFF'}`;
    if (status) {
        if (!adProfileState.currentAdId) {
            status.textContent = '광고프로필 저장 후 활성화할 수 있습니다.';
        } else if (!isRegistered) {
            status.textContent = '임시저장 상태에서는 광고를 활성화할 수 없습니다.';
        } else if (isVisible && untilText) {
            status.textContent = `${planLabel} 광고가 ${untilText}까지 노출됩니다. OFF해도 만료일까지 노출됩니다.`;
        } else {
            status.textContent = `${planLabel} 광고는 스탬프 1개로 ${durationDays}일간 노출됩니다.`;
        }
    }
}

async function updateAdActivation(nextActive) {
    if (!adProfileState.currentAdId || adProfileState.isSaving) return;
    const toggle = document.getElementById('ad-profile-activation-toggle');
    const previousChecked = !nextActive;
    try {
        adProfileState.isSaving = true;
        if (toggle) toggle.disabled = true;
        const response = await APIClient.patch(`/users/me/business-ads/${adProfileState.currentAdId}/activation`, { isActive: nextActive });
        showSaveMessage(response?.message || '광고 활성화 상태가 변경되었습니다.');
        if (response?.content) {
            applyAdProfileToForm(response.content);
        } else {
            await loadMyAdProfile();
        }
    } catch (error) {
        if (toggle) toggle.checked = previousChecked;
        showSaveMessage(error.message || '광고 활성화 상태 변경에 실패했습니다.');
    } finally {
        adProfileState.isSaving = false;
        if (toggle) toggle.disabled = false;
    }
}

async function saveAdProfile({ forceDraft = false } = {}) {
    if (adProfileState.isSaving) return;

    const storeName = String(document.getElementById('ad-profile-name')?.value || '').trim();
    const region = String(document.getElementById('ad-profile-region')?.value || '').trim();
    const district = String(document.getElementById('ad-profile-district')?.value || '').trim();
    const category = String(document.getElementById('ad-profile-category')?.value || '').trim();
    const openHour = String(document.getElementById('ad-profile-open-hour')?.value || '').trim();
    const closeHour = String(document.getElementById('ad-profile-close-hour')?.value || '').trim();
    const title = String(document.getElementById('ad-profile-title')?.value || '').trim();
    const businessName = storeName;
    const managerName = String(document.getElementById('ad-profile-manager')?.value || '').trim();
    const managerContact = String(document.getElementById('ad-profile-manager-contact')?.value || '').trim();
    const kakaoTalkId = String(document.getElementById('ad-profile-kakao-talk-id')?.value || '').trim();
    const telegramId = String(document.getElementById('ad-profile-telegram-id')?.value || '').trim();
    const showBusinessAddressMap = Boolean(document.getElementById('ad-profile-show-business-address-map')?.checked);
    const useStampEvent = Boolean(document.getElementById('ad-profile-use-stamp-event')?.checked);
    const useVisitVerification = useStampEvent;
    const stampEventDescription = getStampEventDescriptionValue();
    const stampEventCount = getStampEventCountValue();
    syncDescriptionInputFromEditor();
    const description = String(document.getElementById('ad-profile-description')?.value || '').trim();
    const saveButton = document.getElementById('ad-profile-save-btn');
    const draftButton = document.getElementById('ad-profile-draft-btn');
    const registrationStatus = forceDraft ? 'DRAFT' : 'REGISTERED';
    const hasAnyValue = hasAnyAdProfileValue({
        businessName,
        managerName,
        managerContact,
        imageUrl: adProfileState.uploadedImageUrl,
        title,
        region,
        district,
        category,
        openHour,
        closeHour,
        description,
        kakaoTalkId,
        telegramId,
        showBusinessAddressMap,
        useVisitVerification,
        useStampEvent,
        stampEventDescription,
        stampEventCount
    });

    if (forceDraft && !hasAnyValue) {
        showSaveMessage('입력한 항목이 없습니다.');
        updateAdProfileActionButtons();
        return;
    }

    if (!forceDraft) {
        const requiredFieldError = getRequiredFieldError({
            storeName,
            managerName,
            managerContact,
            region,
            district,
            category,
            openHour,
            closeHour,
            title,
            description
        });
        if (requiredFieldError) {
            showSaveMessage(requiredFieldError);
            return;
        }
    }

    const stampEventFieldError = getStampEventFieldError({ useStampEvent, stampEventDescription, stampEventCount });
    if (stampEventFieldError) {
        showSaveMessage(stampEventFieldError);
        return;
    }

    try {
        adProfileState.isSaving = true;
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '저장 중...';
        }
        if (draftButton) {
            draftButton.disabled = true;
            draftButton.textContent = '저장 중...';
        }

        if (managerContact && !PHONE_PATTERN.test(managerContact)) {
            showSaveMessage('담당자 연락처는 010-0000-0000 형식으로 입력해주세요.');
            return;
        }

        const imageUrl = adProfileState.uploadedImageUrl || (forceDraft ? '' : DEFAULT_AD_IMAGE_URL);

        let payload = {
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
            kakaoTalkId,
            telegramId,
            showBusinessAddressMap,
            useVisitVerification,
            useStampEvent,
            stampEventDescription: useStampEvent ? stampEventDescription : '',
            stampEventCount: useStampEvent ? stampEventCount : 0,
            planType: adProfileState.currentPlanType || 'BASIC',
            registrationStatus,
            isActive: !forceDraft,
            displayOrder: 0
        };
        if (forceDraft) {
            payload = {
                ...stripEmptyValues(payload),
                imageUrl,
                registrationStatus: 'DRAFT',
                isActive: false
            };
        }

        if (adProfileState.currentAdId) {
            await APIClient.put(`/users/me/business-ads/${adProfileState.currentAdId}`, payload);
        } else {
            const created = await APIClient.post('/users/me/business-ads', payload);
            adProfileState.currentAdId = Number(created?.id || 0) || adProfileState.currentAdId;
        }

        if (forceDraft) {
            showSaveMessage('입력한 항목만 임시저장되었습니다.');
            await loadMyAdProfile();
            updateAdProfileActionButtons();
            return;
        }

        showSaveMessage('광고프로필이 저장되었습니다. 광고 활성화 ON 후 업체정보에 노출됩니다.');
        await loadMyAdProfile();
        window.location.href = '/my-page';
    } catch (error) {
        showSaveMessage(error.message || '광고프로필 저장에 실패했습니다.');
    } finally {
        adProfileState.isSaving = false;
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '광고프로필 저장';
        }
        if (draftButton) {
            draftButton.disabled = false;
            draftButton.textContent = '임시저장';
        }
    }
}

function applyAdProfileToForm(ad) {
    if (!ad) return;
    adProfileState.currentPlanType = normalizeAdPlanType(ad.planType);

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
    const kakaoTalkIdInput = document.getElementById('ad-profile-kakao-talk-id');
    const telegramIdInput = document.getElementById('ad-profile-telegram-id');
    const showBusinessAddressMapInput = document.getElementById('ad-profile-show-business-address-map');
    const useStampEventInput = document.getElementById('ad-profile-use-stamp-event');
    const stampEventDescriptionInput = document.getElementById('ad-profile-stamp-event-description');
    const stampEventCountInput = document.getElementById('ad-profile-stamp-event-count');
    const descriptionInput = document.getElementById('ad-profile-description');

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
    if (kakaoTalkIdInput) kakaoTalkIdInput.value = ad.kakaoTalkId || '';
    if (telegramIdInput) telegramIdInput.value = ad.telegramId || '';
    if (showBusinessAddressMapInput) showBusinessAddressMapInput.checked = normalizeBooleanFlag(ad.showBusinessAddressMap);
    if (useStampEventInput) useStampEventInput.checked = normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification);
    if (stampEventDescriptionInput) {
        stampEventDescriptionInput.value = normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification) ? String(ad.stampEventDescription || '') : '';
        stampEventDescriptionInput.disabled = !normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification);
        stampEventDescriptionInput.required = normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification);
    }
    if (stampEventCountInput) {
        stampEventCountInput.value = normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification) ? String(Number(ad.stampEventCount || 0) || '') : '';
        stampEventCountInput.disabled = !normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification);
        stampEventCountInput.required = normalizeBooleanFlag(ad.useStampEvent || ad.useVisitVerification);
    }
    if (descriptionInput) descriptionInput.value = ad.description || '';
    setDescriptionEditorHtml(ad.description || '');
    setAdProfileImageUrl(ad.imageUrl || '');
    adProfileState.syncPreview?.();
    updateActivationPanel(ad);
    updateAdProfileActionButtons();
}

async function initAdProfileManagementPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    try {
        const me = await APIClient.get('/auth/me');
        adProfileState.me = me;

        const nickname = Auth.resolveNicknameDisplayElement();
        if (nickname) Auth.applyNicknameDisplay(nickname, me);
        const managerNameInput = document.getElementById('ad-profile-manager');
        if (managerNameInput) {
            managerNameInput.value = String(me?.name || me?.nickname || '').trim();
        }

        if (typeof initHeader === 'function') initHeader();
        Auth.bindLogoutButton();
        bindAdProfileInteractions();
        updateAdProfileImagePreviews(adProfileState.uploadedImageUrl);
        adProfileState.syncPreview?.();

        const saveButton = document.getElementById('ad-profile-save-btn');
        const draftButton = document.getElementById('ad-profile-draft-btn');
        saveButton?.addEventListener('click', () => saveAdProfile({ forceDraft: false }));
        draftButton?.addEventListener('click', () => saveAdProfile({ forceDraft: true }));
        document.getElementById('ad-profile-activation-toggle')?.addEventListener('change', (event) => updateAdActivation(Boolean(event.target.checked)));

        updateAdProfileActionButtons();
        await loadMyAdProfile();
        updateAdProfileActionButtons();
    } catch (error) {
        alert(error.message || '광고프로필 페이지를 불러오지 못했습니다.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdProfileManagementPage, { once: true });
} else {
    initAdProfileManagementPage();
}
