/**
 * 파일 역할: business-info 페이지의 업체 광고 프로필 목록/지역 필터 렌더링을 담당하는 스크립트 파일.
 */
const BUSINESS_IMAGE_PLACEHOLDER = '등록할 이미지를 선택해주세요.';

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

const BUSINESS_CATEGORIES = ['룸', '바', '클럽', '기타'];
const KAKAO_POSTCODE_SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
const BUSINESS_APPLY_AGREEMENT_KEY = 'mnmsBusinessApplyAgreedAt';
const BUSINESS_OCR_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const BUSINESS_OCR_LANGUAGE = 'kor+eng';
const BUSINESS_OCR_LOG_PREFIX = '[MNMS Business OCR]';
let kakaoPostcodeLoader = null;
let businessOcrLoader = null;
let businessOcrRequestId = 0;

function isBusinessApplicationMode() {
    const searchParams = new URLSearchParams(window.location.search || '');
    return searchParams.get('apply') === '1' || Boolean(window.sessionStorage?.getItem(BUSINESS_APPLY_AGREEMENT_KEY));
}

function syncBusinessManagementModeLabels() {
    const isApplyMode = isBusinessApplicationMode();
    const pageTitle = document.getElementById('business-management-page-title');
    const formSection = document.getElementById('business-management-form');
    const saveButton = document.getElementById('business-info-save-btn');

    if (pageTitle) pageTitle.textContent = isApplyMode ? '기업회원 신청' : '사업자정보 관리';
    if (formSection) {
        formSection.setAttribute('aria-label', isApplyMode ? '기업회원 신청용 사업자 정보 제출 폼' : '사업자 정보 관리 폼');
    }
    if (saveButton) saveButton.textContent = isApplyMode ? '기업회원 신청' : '사업자정보 저장';
}

function normalizeAreaLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if ([...raw].length <= 2) return raw;

    return raw.replace(/(특별시|광역시|자치시|자치도|도|시|군|구)$/u, '').trim() || raw;
}

function loadKakaoPostcodeScript() {
    if (window.daum?.Postcode) {
        return Promise.resolve();
    }

    if (kakaoPostcodeLoader) {
        return kakaoPostcodeLoader;
    }

    kakaoPostcodeLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = KAKAO_POSTCODE_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'));
        document.head.appendChild(script);
    });

    return kakaoPostcodeLoader;
}

function buildBusinessAddress(postcodeResult) {
    const roadAddress = String(postcodeResult?.roadAddress || '').trim();
    const jibunAddress = String(postcodeResult?.jibunAddress || '').trim();
    const extraAddress = [
        String(postcodeResult?.bname || '').trim(),
        String(postcodeResult?.buildingName || '').trim()
    ].filter(Boolean).join(', ');

    if (roadAddress) {
        return extraAddress ? `${roadAddress} (${extraAddress})` : roadAddress;
    }

    return jibunAddress;
}

async function openBusinessAddressSearch() {
    await loadKakaoPostcodeScript();

    const addressInput = document.getElementById('business-address');
    const addressDetailInput = document.getElementById('business-address-detail');
    if (!addressInput) return;

    new window.daum.Postcode({
        oncomplete(data) {
            const selectedAddress = buildBusinessAddress(data);
            if (!selectedAddress) return;
            addressInput.value = selectedAddress;
            addressDetailInput?.focus();
            updateBusinessActionButtons();
        }
    }).open();
}

function renderBusinessAds(ads) {
    const list = document.getElementById('business-directory-list');
    const empty = document.getElementById('business-directory-empty');
    if (!list || !empty) return;

    if (!Array.isArray(ads) || !ads.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = ads.map((ad) => {
        const regionLabel = sanitizeHTML(ad.region || '지역미지정');
        const businessName = sanitizeHTML(ad.businessName || ad.companyName || ad.ownerNickname || '업소');
        const managerName = sanitizeHTML(ad.managerName || ad.profileManagerName || ad.ownerNickname || '담당자');
        const managerContact = sanitizeHTML(ad.managerContact || '연락처');
        const district = sanitizeHTML(ad.district || '선택');
        const category = sanitizeHTML(ad.category || '선택');
        const openHour = sanitizeHTML(ad.openHour || '시간선택');
        const closeHour = sanitizeHTML(ad.closeHour || '시간선택');
        const baseTitle = sanitizeHTML(ad.title || '업체정보');
        const title = `[${regionLabel}-${businessName}] ${baseTitle}`;
        const viewCount = Number(ad.viewCount || 0).toLocaleString('ko-KR');
        const formattedTime = (openHour !== '시간선택' && closeHour !== '시간선택')
            ? `${openHour} ~ ${closeHour}`
            : '시간선택 ~ 시간선택';
        const detail = `${regionLabel} ${district} · ${category} · ${formattedTime}`;
        return `
            <li class="business-directory-item">
                <div class="business-directory-main">
                    <h4>${title}</h4>
                    <p class="business-directory-region-detail">${detail}</p>
                    <div class="business-directory-meta">
                        <span class="business-directory-manager">${managerName} · ${managerContact}</span>
                        <span class="business-directory-views">조회수 ${viewCount}</span>
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

function readBusinessFilters() {
    return {
        region: String(document.getElementById('business-region-filter')?.value || '').trim(),
        district: String(document.getElementById('business-district-filter')?.value || '').trim(),
        category: String(document.getElementById('business-category-filter')?.value || '').trim(),
        keyword: String(document.getElementById('business-keyword-filter')?.value || '').trim()
    };
}

function syncBadgeLabels() {
    const { region, district, category } = readBusinessFilters();
    const regionBadge = document.getElementById('business-region-badge-label');
    const districtBadge = document.getElementById('business-district-badge-label');
    const districtTrigger = document.getElementById('business-district-trigger');
    const categoryBadge = document.getElementById('business-category-badge-label');

    if (regionBadge) regionBadge.textContent = region ? normalizeAreaLabel(region) : '지역 전체';
    if (districtBadge) districtBadge.textContent = district ? normalizeAreaLabel(district) : '세부 지역';
    if (districtTrigger) districtTrigger.classList.toggle('hidden', !region);
    if (categoryBadge) categoryBadge.textContent = category || '업종 전체';
}

async function loadBusinessAds() {
    const { region, district, category, keyword } = readBusinessFilters();

    try {
        const response = await APIClient.get('/live/business-ads', { region, district, category, keyword });
        renderBusinessAds(Array.isArray(response?.content) ? response.content : []);
    } catch (error) {
        renderBusinessAds([]);
    }
}

function openFilterPanel(target) {
    document.querySelectorAll('.business-filter-menu').forEach((menu) => {
        menu.classList.toggle('is-open', menu.id === `business-menu-${target}`);
    });
}

function closeFilterPanels() {
    document.querySelectorAll('.business-filter-menu').forEach((menu) => menu.classList.remove('is-open'));
}

function renderFilterButtonList(container, options, selectedValue, onSelect, allLabel = '전체') {
    if (!container) return;
    container.innerHTML = [
        `<button type="button" class="business-filter-option ${selectedValue ? '' : 'is-active'}" data-value="">${allLabel}</button>`,
        ...options.map((option) => {
            const isActive = String(selectedValue) === String(option.value);
            return `<button type="button" class="business-filter-option ${isActive ? 'is-active' : ''}" data-value="${sanitizeHTML(option.value)}">${sanitizeHTML(option.label)}</button>`;
        })
    ].join('');

    container.querySelectorAll('.business-filter-option').forEach((button) => {
        button.addEventListener('click', () => onSelect(button.dataset.value || ''));
    });
}

function bindBusinessFilterEvents() {
    const regionSelect = document.getElementById('business-region-filter');
    const districtSelect = document.getElementById('business-district-filter');
    const categorySelect = document.getElementById('business-category-filter');
    const sortSelect = document.getElementById('business-sort-filter');
    const keywordInput = document.getElementById('business-keyword-filter');
    const searchButton = document.getElementById('business-search-btn');

    const regionMenu = document.getElementById('business-menu-region-items');
    const districtMenu = document.getElementById('business-menu-district-items');
    const categoryMenu = document.getElementById('business-menu-category-items');

    let keywordDebounceTimer = null;

    const requestBusinessAds = () => {
        if (keywordDebounceTimer) {
            window.clearTimeout(keywordDebounceTimer);
            keywordDebounceTimer = null;
        }
        syncBadgeLabels();
        loadBusinessAds();
    };

    const rerenderRegionMenu = () => {
        renderFilterButtonList(
            regionMenu,
            Object.keys(REGION_DISTRICT_MAP).map((region) => ({ value: region, label: normalizeAreaLabel(region) })),
            regionSelect?.value || '',
            (selected) => {
                if (!regionSelect) return;
                regionSelect.value = selected;
                districtSelect.value = '';
                rerenderDistrictMenu();
                closeFilterPanels();
                requestBusinessAds();
            }
        );
    };

    const rerenderDistrictMenu = () => {
        const districts = REGION_DISTRICT_MAP[regionSelect?.value || ''] || [];
        renderFilterButtonList(
            districtMenu,
            districts.map((district) => ({ value: district, label: normalizeAreaLabel(district) })),
            districtSelect?.value || '',
            (selected) => {
                if (!districtSelect) return;
                districtSelect.value = selected;
                closeFilterPanels();
                requestBusinessAds();
            }
        );
    };

    const rerenderCategoryMenu = () => {
        renderFilterButtonList(
            categoryMenu,
            BUSINESS_CATEGORIES.map((category) => ({ value: category, label: category })),
            categorySelect?.value || '',
            (selected) => {
                if (!categorySelect) return;
                categorySelect.value = selected;
                closeFilterPanels();
                requestBusinessAds();
            },
            '업종 전체'
        );
    };

    document.querySelectorAll('[data-filter-toggle]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const target = button.getAttribute('data-filter-toggle');
            if (target === 'district' && !String(regionSelect?.value || '').trim()) return;
            const menu = document.getElementById(`business-menu-${target}`);
            if (!menu) return;
            const willOpen = !menu.classList.contains('is-open');
            closeFilterPanels();
            if (willOpen) openFilterPanel(target);
        });
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.business-directory-filter-v2')) {
            closeFilterPanels();
        }
    });

    sortSelect?.addEventListener('change', requestBusinessAds);

    keywordInput?.addEventListener('input', () => {
        if (keywordDebounceTimer) {
            window.clearTimeout(keywordDebounceTimer);
        }
        keywordDebounceTimer = window.setTimeout(() => {
            syncBadgeLabels();
            loadBusinessAds();
            keywordDebounceTimer = null;
        }, 300);
    });

    keywordInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            requestBusinessAds();
        }
    });

    searchButton?.addEventListener('click', requestBusinessAds);

    rerenderRegionMenu();
    rerenderDistrictMenu();
    rerenderCategoryMenu();
    syncBadgeLabels();
}

function collectBusinessManagementFormData() {
    const selectedBilling = document.querySelector('input[name="billing-type"]:checked');
    const licenseButton = document.getElementById('business-license-upload-btn');
    const permitButton = document.getElementById('business-permit-upload-btn');
    const licensePreview = document.getElementById('business-license-preview');
    const permitPreview = document.getElementById('business-permit-preview');

    return {
        licenseImageName: String(licenseButton?.dataset.fileName || '').trim(),
        licenseImageDataUrl: String(licensePreview?.getAttribute('src') || '').trim(),
        permitImageName: String(permitButton?.dataset.fileName || '').trim(),
        permitImageDataUrl: String(permitPreview?.getAttribute('src') || '').trim(),
        businessNumber: String(document.getElementById('business-number')?.value || '').trim(),
        businessName: String(document.getElementById('business-name')?.value || '').trim(),
        businessOwner: String(document.getElementById('business-owner')?.value || '').trim(),
        businessAddress: String(document.getElementById('business-address')?.value || '').trim(),
        businessAddressDetail: String(document.getElementById('business-address-detail')?.value || '').trim(),
        billingType: String(selectedBilling?.value || '').trim()
    };
}

function isBusinessPreviewImageUrl(value) {
    return /^data:image\//u.test(String(value || '').trim());
}

function getBusinessUploadConfig(button) {
    const isPermit = button?.id === 'business-permit-upload-btn';
    return {
        inputId: isPermit ? 'business-permit-input' : 'business-license-input',
        previewId: isPermit ? 'business-permit-preview' : 'business-license-preview',
        clearLabel: isPermit ? '영업허가증 첨부 이미지 삭제' : '사업자등록증 첨부 이미지 삭제'
    };
}

function ensureBusinessUploadClearButton(button) {
    if (!button) return null;

    const { clearLabel } = getBusinessUploadConfig(button);
    let clearButton = button.parentElement?.querySelector(`[data-business-upload-clear-for="${button.id}"]`);

    if (!clearButton) {
        clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'business-license-clear-btn hidden';
        clearButton.dataset.businessUploadClearFor = button.id;
        clearButton.setAttribute('aria-label', clearLabel);
        clearButton.innerHTML = '<span aria-hidden="true">×</span>';
        button.insertAdjacentElement('afterend', clearButton);

        clearButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            clearBusinessUpload(button);
        });
    }

    return clearButton;
}

function clearBusinessUpload(button) {
    if (!button) return;

    const { inputId } = getBusinessUploadConfig(button);
    const input = document.getElementById(inputId);
    if (input) input.value = '';

    updateBusinessUploadPreview(button);
    updateBusinessActionButtons();
}

function updateBusinessUploadPreview(button, { fileName = '', imageUrl = '' } = {}) {
    if (!button) return;

    const normalizedFileName = String(fileName || '').trim();
    const normalizedImageUrl = String(imageUrl || '').trim();
    const { previewId } = getBusinessUploadConfig(button);
    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.getAttribute('aria-label') || '이미지 업로드';
    }
    const defaultLabel = button.dataset.defaultLabel;
    const clearButton = ensureBusinessUploadClearButton(button);
    let preview = button.querySelector('.business-license-preview');

    if (!preview) {
        preview = document.createElement('img');
        preview.id = previewId;
        preview.className = 'business-license-preview hidden';
        preview.alt = '';
        button.appendChild(preview);
    }

    button.dataset.fileName = normalizedFileName;
    if (isBusinessPreviewImageUrl(normalizedImageUrl)) {
        preview.src = normalizedImageUrl;
        preview.alt = normalizedFileName || defaultLabel;
        preview.classList.remove('hidden');
        button.classList.add('has-preview');
        button.setAttribute('aria-label', normalizedFileName ? `${normalizedFileName} 변경` : defaultLabel);
        clearButton?.classList.remove('hidden');
        return;
    }

    preview.removeAttribute('src');
    preview.alt = '';
    preview.classList.add('hidden');
    button.classList.remove('has-preview');
    button.setAttribute('aria-label', defaultLabel);
    clearButton?.classList.add('hidden');
}

function readBusinessImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve('');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
        reader.readAsDataURL(file);
    });
}

function loadBusinessOcrScript() {
    if (window.Tesseract?.recognize) {
        return Promise.resolve(window.Tesseract);
    }

    if (businessOcrLoader) {
        return businessOcrLoader;
    }

    businessOcrLoader = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${BUSINESS_OCR_SCRIPT_URL}"]`);
        const script = existingScript || document.createElement('script');

        script.src = BUSINESS_OCR_SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            if (window.Tesseract?.recognize) {
                resolve(window.Tesseract);
                return;
            }
            reject(new Error('OCR 라이브러리를 초기화하지 못했습니다.'));
        };
        script.onerror = () => reject(new Error('OCR 라이브러리를 불러오지 못했습니다.'));

        if (!existingScript) {
            document.head.appendChild(script);
        }
    }).catch((error) => {
        businessOcrLoader = null;
        throw error;
    });

    return businessOcrLoader;
}

function normalizeBusinessOcrText(value) {
    return String(value || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

function normalizeBusinessNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10) return String(value || '').trim();
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function findBusinessOcrLine(lines, patterns) {
    return lines.find((line) => patterns.some((pattern) => pattern.test(line))) || '';
}

function extractBusinessOcrValueFromLine(line, patterns) {
    const matchedPattern = patterns.find((pattern) => pattern.test(line));
    if (!matchedPattern) return '';

    return line
        .replace(matchedPattern, '')
        .replace(/^[\s:：|\-]+/u, '')
        .trim();
}

function extractBusinessOcrValue(lines, patterns) {
    const matchedIndex = lines.findIndex((line) => patterns.some((pattern) => pattern.test(line)));
    if (matchedIndex < 0) return '';

    const inlineValue = extractBusinessOcrValueFromLine(lines[matchedIndex], patterns);
    if (inlineValue) return inlineValue;

    const nextLine = lines.slice(matchedIndex + 1).find((line) => line && !patterns.some((pattern) => pattern.test(line)));
    return String(nextLine || '').trim();
}

function parseBusinessOcrText(text, { documentLabel = '', fileName = '', confidence = 0 } = {}) {
    const normalizedText = normalizeBusinessOcrText(text);
    const lines = normalizedText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    const compactText = normalizedText.replace(/\s/g, '');
    const businessNumberMatch = compactText.match(/(?:\d{3}-?\d{2}-?\d{5})/u);
    const businessNamePatterns = [/^(상\s*호|법\s*인\s*명|단\s*체\s*명|업\s*체\s*명)/u];
    const ownerPatterns = [/^(대표자\s*성명|대표\s*자|대표자?|성\s*명)/u];
    const addressPatterns = [/^(사업장\s*소재지|소\s*재\s*지|사업장\s*주소|주소)/u];
    const permitNumberPatterns = [/^(허가\s*번호|신고\s*번호|등록\s*번호)/u];
    const issueDatePatterns = [/^(발급\s*일|교부\s*일|신고\s*일|허가\s*일|등록\s*일)/u];

    const businessName = extractBusinessOcrValue(lines, businessNamePatterns);
    const owner = extractBusinessOcrValue(lines, ownerPatterns);
    const address = extractBusinessOcrValue(lines, addressPatterns);
    const permitNumber = extractBusinessOcrValue(lines, permitNumberPatterns);
    const issueDate = extractBusinessOcrValue(lines, issueDatePatterns);

    let detectedDocumentType = 'unknown';
    if (/사업자등록증|사업자등록번호/u.test(normalizedText)) {
        detectedDocumentType = 'business_registration_certificate';
    } else if (/영업\s*(허가|신고)|허가증|신고증|등록증/u.test(normalizedText)) {
        detectedDocumentType = 'business_permit_certificate';
    }

    return {
        documentLabel,
        fileName,
        detectedDocumentType,
        businessNumber: businessNumberMatch ? normalizeBusinessNumber(businessNumberMatch[0]) : '',
        businessName,
        owner,
        address,
        permitNumber,
        issueDate,
        confidence: Number.isFinite(Number(confidence)) ? Math.round(Number(confidence) * 100) / 100 : 0,
        matchedTitleLine: findBusinessOcrLine(lines, [/사업자등록증/u, /영업\s*(허가|신고)/u, /허가증|신고증/u]),
        rawText: normalizedText
    };
}

function logBusinessOcrResult(result) {
    const { rawText, ...summary } = result;

    console.groupCollapsed(`${BUSINESS_OCR_LOG_PREFIX} ${summary.documentLabel || '첨부 이미지'} 판별 결과`);
    console.table(summary);
    console.log('rawText:', rawText || '(OCR 텍스트 없음)');
    console.groupEnd();
}

async function recognizeBusinessImageFile({ file, imageUrl, documentLabel, uploadButton }) {
    const requestId = String(++businessOcrRequestId);
    const fileName = String(file?.name || '').trim();
    if (uploadButton) uploadButton.dataset.ocrRequestId = requestId;

    try {
        console.info(`${BUSINESS_OCR_LOG_PREFIX} ${documentLabel} OCR 판별 시작`, { fileName });
        const Tesseract = await loadBusinessOcrScript();
        const recognized = await Tesseract.recognize(imageUrl, BUSINESS_OCR_LANGUAGE, {
            logger: (progress) => {
                if (progress?.status) {
                    console.debug(`${BUSINESS_OCR_LOG_PREFIX} ${documentLabel} 진행 상태`, progress);
                }
            }
        });

        if (uploadButton?.dataset.ocrRequestId !== requestId) {
            return null;
        }

        const result = parseBusinessOcrText(recognized?.data?.text || '', {
            documentLabel,
            fileName,
            confidence: recognized?.data?.confidence
        });
        logBusinessOcrResult(result);
        return result;
    } catch (error) {
        console.error(`${BUSINESS_OCR_LOG_PREFIX} ${documentLabel} OCR 판별 실패`, {
            fileName,
            message: error.message || String(error)
        });
        return null;
    }
}

async function handleBusinessImageSelection({ file, uploadButton, documentLabel }) {
    if (!file) return;

    try {
        const imageUrl = await readBusinessImageFile(file);
        updateBusinessUploadPreview(uploadButton, {
            fileName: file.name,
            imageUrl
        });
        recognizeBusinessImageFile({ file, imageUrl, documentLabel, uploadButton });
    } catch (error) {
        alert(error.message || '이미지를 불러오지 못했습니다.');
    }
}

function hasAnyBusinessValue(data) {
    const candidate = { ...data };
    delete candidate.licenseImageName;
    delete candidate.licenseImageDataUrl;
    delete candidate.permitImageName;
    delete candidate.permitImageDataUrl;
    delete candidate.billingType;
    const hasText = Object.values(candidate).some((value) => String(value || '').trim());
    const hasLicenseImage = data?.licenseImageName && data.licenseImageName !== BUSINESS_IMAGE_PLACEHOLDER;
    const hasPermitImage = data?.permitImageName && data.permitImageName !== BUSINESS_IMAGE_PLACEHOLDER;
    const hasImage = hasLicenseImage || hasPermitImage;
    return Boolean(hasText || hasImage);
}

function stripEmptyBusinessValues(data) {
    const trimmed = Object.entries(data || {}).reduce((acc, [key, value]) => {
        const normalized = String(value || '').trim();
        if (!normalized) return acc;
        if ((key === 'licenseImageName' || key === 'permitImageName') && normalized === BUSINESS_IMAGE_PLACEHOLDER) return acc;
        acc[key] = normalized;
        return acc;
    }, {});
    return trimmed;
}

function isBusinessInfoComplete(data) {
    if (!data) return false;
    const hasLicenseImage = data.licenseImageName && data.licenseImageName !== BUSINESS_IMAGE_PLACEHOLDER;
    return Boolean(
        hasLicenseImage
        && data.businessNumber
        && data.businessName
        && data.businessOwner
        && data.businessAddress
        && data.billingType
    );
}

function updateBusinessActionButtons() {
    const saveButton = document.getElementById('business-info-save-btn');
    const draftButton = document.getElementById('business-info-draft-btn');
    const formData = collectBusinessManagementFormData();
    const isComplete = isBusinessInfoComplete(formData);
    const hasAnyValue = hasAnyBusinessValue(formData);

    saveButton?.classList.toggle('hidden', !isComplete);
    draftButton?.classList.toggle('hidden', isComplete);
    if (draftButton) draftButton.disabled = !hasAnyValue;
}

function applyBusinessFormData(savedData) {
    if (!savedData || typeof savedData !== 'object') return;

    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element && value) element.value = value;
    };

    setValue('business-number', savedData.businessNumber);
    setValue('business-name', savedData.businessName);
    setValue('business-owner', savedData.businessOwner);
    setValue('business-address', savedData.businessAddress);
    setValue('business-address-detail', savedData.businessAddressDetail);

    updateBusinessUploadPreview(document.getElementById('business-license-upload-btn'), {
        fileName: savedData.licenseImageName,
        imageUrl: savedData.licenseImageDataUrl
    });

    updateBusinessUploadPreview(document.getElementById('business-permit-upload-btn'), {
        fileName: savedData.permitImageName,
        imageUrl: savedData.permitImageDataUrl
    });

    const billingType = String(savedData.billingType || '').trim();
    if (billingType) {
        const target = document.querySelector(`input[name="billing-type"][value="${billingType}"]`);
        if (target) target.checked = true;
    }

    updateBusinessActionButtons();
}

function bindBusinessManagementEvents() {
    const licenseInput = document.getElementById('business-license-input');
    const permitInput = document.getElementById('business-permit-input');
    const uploadButton = document.getElementById('business-license-upload-btn');
    const permitUploadButton = document.getElementById('business-permit-upload-btn');
    const saveButton = document.getElementById('business-info-save-btn');
    const draftButton = document.getElementById('business-info-draft-btn');
    const addressSearchButton = document.getElementById('business-address-search-btn');
    const addressInput = document.getElementById('business-address');
    const fields = ['business-number', 'business-name', 'business-owner', 'business-address', 'business-address-detail'];

    uploadButton?.addEventListener('click', () => licenseInput?.click());
    licenseInput?.addEventListener('change', async () => {
        await handleBusinessImageSelection({
            file: licenseInput.files?.[0],
            uploadButton,
            documentLabel: '사업자등록증'
        });
        updateBusinessActionButtons();
    });

    permitUploadButton?.addEventListener('click', () => permitInput?.click());
    permitInput?.addEventListener('change', async () => {
        await handleBusinessImageSelection({
            file: permitInput.files?.[0],
            uploadButton: permitUploadButton,
            documentLabel: '영업허가증'
        });
        updateBusinessActionButtons();
    });

    fields.forEach((id) => {
        const input = document.getElementById(id);
        input?.addEventListener('input', updateBusinessActionButtons);
        input?.addEventListener('change', updateBusinessActionButtons);
    });

    document.querySelectorAll('input[name="billing-type"]').forEach((radio) => {
        radio.addEventListener('change', updateBusinessActionButtons);
    });

    const handleAddressSearch = async () => {
        try {
            await openBusinessAddressSearch();
        } catch (error) {
            alert(error.message || '주소 검색을 실행할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    };
    addressSearchButton?.addEventListener('click', handleAddressSearch);
    addressInput?.addEventListener('click', handleAddressSearch);

    draftButton?.addEventListener('click', async () => {
        try {
            const collectedFormData = collectBusinessManagementFormData();
            if (!hasAnyBusinessValue(collectedFormData)) {
                alert('입력한 항목이 없습니다.');
                updateBusinessActionButtons();
                return;
            }
            const formData = stripEmptyBusinessValues(collectedFormData);

            await APIClient.put('/users/me/business-profile', {
                registrationStatus: 'DRAFT',
                businessInfo: formData
            });
            alert('입력한 항목만 임시저장되었습니다.');
            updateBusinessActionButtons();
        } catch (error) {
            alert(error.message || '사업자정보 임시저장에 실패했습니다.');
        }
    });

    saveButton?.addEventListener('click', async () => {
        try {
            const formData = collectBusinessManagementFormData();
            if (!isBusinessInfoComplete(formData)) {
                alert('사업자정보 필수 항목을 모두 입력해주세요.');
                updateBusinessActionButtons();
                return;
            }

            await APIClient.put('/users/me/business-profile', {
                registrationStatus: 'REGISTERED',
                businessInfo: formData
            });
            const isApplyMode = isBusinessApplicationMode();
            if (isApplyMode) {
                window.sessionStorage?.removeItem(BUSINESS_APPLY_AGREEMENT_KEY);
            }
            alert(isApplyMode ? '기업회원 신청이 접수되었습니다.' : '사업자정보가 저장되었습니다.');
            window.location.href = '/my-page';
        } catch (error) {
            alert(error.message || '사업자정보 저장에 실패했습니다.');
        }
    });

    updateBusinessActionButtons();
}

async function initBusinessManagementPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const me = await APIClient.get('/auth/me');
    const nickname = Auth.resolveNicknameDisplayElement();
    if (nickname) Auth.applyNicknameDisplay(nickname, me);

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    syncBusinessManagementModeLabels();

    const profile = await APIClient.get('/users/me/business-profile');
    applyBusinessFormData(profile?.businessInfo || {});
    bindBusinessManagementEvents();
    updateBusinessActionButtons();
}

async function initBusinessInfoPage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();
    bindBusinessFilterEvents();
    await loadBusinessAds();
}

async function initBusinessPage() {
    if (window.location.pathname === '/business-management') {
        await initBusinessManagementPage();
        return;
    }
    await initBusinessInfoPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBusinessPage, { once: true });
} else {
    initBusinessPage();
}
