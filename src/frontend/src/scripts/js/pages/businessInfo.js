/**
 * 파일 역할: business-info 페이지의 업체 광고 프로필 목록/지역 필터 렌더링을 담당하는 스크립트 파일.
 */
const BUSINESS_IMAGE_PLACEHOLDER = '등록할 이미지를 선택해주세요.';
const BUSINESS_DIRECTORY_DEFAULT_IMAGE_URL = '/src/assets/image/ad-profile-default.webp';
let businessDirectoryAds = [];
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
const BUSINESS_AD_AREA_FALLBACK = {
    regions: Object.keys(REGION_DISTRICT_MAP),
    districtsByRegion: { ...REGION_DISTRICT_MAP }
};
let businessAdAreaAvailability = BUSINESS_AD_AREA_FALLBACK;
const KAKAO_POSTCODE_SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
const KAKAO_MAP_SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';
const KAKAO_MAP_SEARCH_URL = 'https://map.kakao.com/link/search/';
const BUSINESS_APPLY_AGREEMENT_KEY = 'mnmsBusinessApplyAgreedAt';
const BUSINESS_OCR_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const BUSINESS_OCR_LANGUAGE = 'kor+eng';
const BUSINESS_OCR_STATUS = {
    IDLE: 'idle',
    CHECKING: 'checking',
    VALID: 'valid',
    INVALID: 'invalid'
};
let kakaoPostcodeLoader = null;
let kakaoMapLoader = null;
let businessOcrLoader = null;
let businessOcrRequestId = 0;

function isBusinessApplicationMode() {
    const searchParams = new URLSearchParams(window.location.search || '');
    return searchParams.get('apply') === '1' || Boolean(window.sessionStorage?.getItem(BUSINESS_APPLY_AGREEMENT_KEY));
}

function normalizeBusinessManagementRegistrationStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'registered') return 'registered';
    if (value === 'draft') return 'draft';
    return 'unregistered';
}

function normalizeBusinessManagementApprovalStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'approved') return 'approved';
    if (value === 'rejected') return 'rejected';
    return 'pending';
}

function isBusinessManagementPendingReview(profile, user) {
    const registrationStatus = normalizeBusinessManagementRegistrationStatus(profile?.registrationStatus);
    const approvalStatus = normalizeBusinessManagementApprovalStatus(profile?.approvalStatus);
    const isBusinessMember = typeof Auth !== 'undefined'
        && typeof Auth.isBusinessAccount === 'function'
        && Auth.isBusinessAccount(user);

    return !isBusinessMember && registrationStatus === 'registered' && approvalStatus === 'pending';
}

function notifyPendingBusinessManagementReview() {
    const message = '이미 접수된 기업회원 신청이 검토중입니다. 검토 완료 후 다시 이용해주세요.';
    if (typeof showNotification === 'function') {
        showNotification(message, 'warning');
        return;
    }

    alert(message);
}

function renderBusinessManagementReviewNotice(profile) {
    const notice = document.getElementById('business-management-review-notice');
    if (!notice) return;

    const approvalStatus = normalizeBusinessManagementApprovalStatus(profile?.approvalStatus);
    const wasReverted = Boolean(profile?.revertedToLastApprovedBusinessInfo);
    if (approvalStatus !== 'rejected' || !wasReverted) {
        notice.textContent = '';
        notice.classList.add('hidden');
        return;
    }

    const rejectionReason = String(profile?.rejectionReason || '').trim();
    notice.textContent = rejectionReason
        ? `사업자정보 수정 요청이 반려되어 기존 승인된 사업자등록증 정보로 자동 복구되었습니다. 반려 사유: ${rejectionReason}`
        : '사업자정보 수정 요청이 반려되어 기존 승인된 사업자등록증 정보로 자동 복구되었습니다.';
    notice.classList.remove('hidden');
}

function redirectBusinessManagementPendingReview(profile, user) {
    if (!isBusinessApplicationMode() || !isBusinessManagementPendingReview(profile, user)) {
        return false;
    }

    notifyPendingBusinessManagementReview();
    window.location.replace('/my-page');
    return true;
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

function getKakaoMapAppKey() {
    const configKey = String(window.MNMS_PUBLIC_CONFIG?.kakaoMapAppKey || '').trim();
    if (configKey) return configKey;

    const metaKey = String(document.querySelector('meta[name="kakao-map-app-key"]')?.content || '').trim();
    return metaKey;
}

function buildKakaoMapSearchUrl(address) {
    return `${KAKAO_MAP_SEARCH_URL}${encodeURIComponent(address)}`;
}

function buildKakaoMapFallbackMarkup(address, message = '카카오맵에서 위치를 확인해주세요.') {
    const mapUrl = buildKakaoMapSearchUrl(address);
    return `
        <a class="business-profile-mini-map-fallback" href="${mapUrl}" target="_blank" rel="noopener noreferrer">
            <span class="business-profile-mini-map-fallback__badge">KakaoMap</span>
            <strong>${sanitizeHTML(address)}</strong>
            <span>${sanitizeHTML(message)}</span>
        </a>
    `;
}

function loadKakaoMapScript() {
    const appKey = getKakaoMapAppKey();
    if (!appKey) {
        return Promise.reject(new Error('카카오맵 앱 키가 설정되지 않았습니다.'));
    }

    if (window.kakao?.maps?.services) {
        return Promise.resolve(window.kakao.maps);
    }

    if (kakaoMapLoader) return kakaoMapLoader;

    kakaoMapLoader = new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-kakao-map-sdk="true"]');
        const script = existingScript || document.createElement('script');

        const handleLoad = () => {
            if (!window.kakao?.maps?.load) {
                reject(new Error('카카오맵 서비스를 초기화하지 못했습니다.'));
                return;
            }

            window.kakao.maps.load(() => resolve(window.kakao.maps));
        };

        script.addEventListener('load', handleLoad, { once: true });
        script.addEventListener('error', () => reject(new Error('카카오맵 서비스를 불러오지 못했습니다.')), { once: true });

        if (!existingScript) {
            const params = new URLSearchParams({ appkey: appKey, libraries: 'services', autoload: 'false' });
            script.src = `${KAKAO_MAP_SDK_URL}?${params.toString()}`;
            script.async = true;
            script.dataset.kakaoMapSdk = 'true';
            document.head.appendChild(script);
        }
    });

    return kakaoMapLoader;
}

function renderKakaoMap(container, maps, address) {
    const geocoder = new maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
        if (status !== maps.services.Status.OK || !result?.[0]) {
            container.innerHTML = buildKakaoMapFallbackMarkup(address, '주소 좌표를 찾지 못했습니다. 카카오맵 검색으로 이동합니다.');
            return;
        }

        const coords = new maps.LatLng(Number(result[0].y), Number(result[0].x));
        const map = new maps.Map(container, {
            center: coords,
            level: 3
        });
        new maps.Marker({
            map,
            position: coords
        });
        setTimeout(() => map.relayout(), 0);
    });
}

async function initializeBusinessProfileKakaoMaps(root = document) {
    const mapNodes = [...root.querySelectorAll('[data-kakao-map-address]')];
    if (!mapNodes.length) return;

    const maps = await loadKakaoMapScript().catch(() => null);
    mapNodes.forEach((container) => {
        const address = String(container.dataset.kakaoMapAddress || '').trim();
        if (!address) return;

        if (!maps) {
            container.innerHTML = buildKakaoMapFallbackMarkup(address, '카카오맵 앱 키 설정 후 미니맵이 표시됩니다.');
            return;
        }

        renderKakaoMap(container, maps, address);
    });
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

    businessDirectoryAds = Array.isArray(ads) ? ads : [];
    closeBusinessProfileModal();

    if (!businessDirectoryAds.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = businessDirectoryAds.map((ad, index) => {
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
        const uploadedImageUrl = sanitizeHTML(ad.imageUrl || '');
        const thumbnailImageUrl = uploadedImageUrl || BUSINESS_DIRECTORY_DEFAULT_IMAGE_URL;
        const thumbnailLoading = uploadedImageUrl || index < 6 ? 'eager' : 'lazy';
        const thumbnailFetchPriority = uploadedImageUrl && index < 6 ? 'high' : 'auto';
        const formattedTime = (openHour !== '시간선택' && closeHour !== '시간선택')
            ? `${openHour} ~ ${closeHour}`
            : '시간선택 ~ 시간선택';
        const detail = `${regionLabel} ${district} · ${category} · ${formattedTime}`;
        return `
            <li class="business-directory-item business-directory-item--clickable" data-business-ad-id="${sanitizeHTML(ad.id || '')}" data-business-ad-view-count="${Number(ad.viewCount || 0)}" role="link" tabindex="0" aria-label="${title} 상세 페이지 보기">
                <img class="business-directory-thumbnail" src="${thumbnailImageUrl}" alt="${title} 대표이미지" loading="${thumbnailLoading}" fetchpriority="${thumbnailFetchPriority}" decoding="async" onerror="this.onerror=null;this.src='${BUSINESS_DIRECTORY_DEFAULT_IMAGE_URL}';">
                <div class="business-directory-main">
                    <h4>${title}</h4>
                    <p class="business-directory-region-detail">${detail}</p>
                    <div class="business-directory-meta">
                        <span class="business-directory-manager">${managerName} · ${managerContact}</span>
                        <span class="business-directory-views" data-business-ad-view-count>조회수 ${viewCount}</span>
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

function normalizeBusinessProfileLinkUrl(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue || rawValue === '#') return '';

    try {
        const url = new URL(rawValue, window.location.origin);
        if (!['http:', 'https:'].includes(url.protocol)) return '';
        return url.href;
    } catch (error) {
        return '';
    }
}

function sanitizeBusinessRichText(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';

    if (!/<[a-z][\s\S]*>/i.test(rawValue)) {
        return sanitizeHTML(rawValue).replace(/\n/g, '<br>');
    }

    const template = document.createElement('template');
    template.innerHTML = rawValue;
    const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'SPAN', 'A', 'IMG']);

    const sanitizeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }

        const tagName = node.tagName.toUpperCase();
        if (!allowedTags.has(tagName)) {
            const fragment = document.createDocumentFragment();
            node.childNodes.forEach((child) => fragment.appendChild(sanitizeNode(child)));
            return fragment;
        }

        const element = document.createElement(tagName.toLowerCase());
        if (tagName === 'A') {
            const href = normalizeBusinessProfileLinkUrl(node.getAttribute('href') || '');
            if (href) {
                element.setAttribute('href', href);
                element.setAttribute('target', '_blank');
                element.setAttribute('rel', 'noopener noreferrer');
            }
        }
        if (tagName === 'IMG') {
            const src = String(node.getAttribute('src') || '').trim();
            const isSafeImage = /^https?:\/\//i.test(src) || /^data:image\//i.test(src) || src.startsWith('/');
            if (!isSafeImage) return document.createDocumentFragment();
            element.setAttribute('src', src);
            element.setAttribute('alt', node.getAttribute('alt') || '업체프로필 상세 이미지');
            element.setAttribute('loading', 'lazy');
        }

        node.childNodes.forEach((child) => element.appendChild(sanitizeNode(child)));
        return element;
    };

    const fragment = document.createDocumentFragment();
    template.content.childNodes.forEach((child) => fragment.appendChild(sanitizeNode(child)));

    const container = document.createElement('div');
    container.appendChild(fragment);
    const sanitized = container.innerHTML.trim();
    if (sanitized) return sanitized;

    return sanitizeHTML(rawValue).replace(/\n/g, '<br>');
}

function getBusinessProfileTitle(ad) {
    const regionLabel = sanitizeHTML(ad?.region || '지역미지정');
    const businessName = sanitizeHTML(ad?.businessName || ad?.companyName || ad?.ownerNickname || '업소');
    const title = sanitizeHTML(ad?.title || '업체정보');
    return `[${regionLabel}-${businessName}] ${title}`;
}

function getBusinessProfileTelHref(contact) {
    const digits = String(contact || '').replace(/[^0-9+]/g, '');
    if (!digits || digits.length < 8) return '';
    return `tel:${digits}`;
}

function normalizeBooleanFlag(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    return ['1', 'true', 'y', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function buildBusinessProfileInfoRow(label, value, icon, className = '') {
    const rowClass = ['business-profile-info-item', className].filter(Boolean).join(' ');
    return `<div class="${rowClass}"><dt><span aria-hidden="true">${icon}</span>${label}</dt><dd>${value}</dd></div>`;
}

function buildBusinessProfileInfoPair(firstRow, secondRow) {
    return `<div class="business-profile-info-pair">${firstRow}${secondRow}</div>`;
}

function buildBusinessProfileContactInfoGroup(managerContact, ad) {
    const contactItems = [
        { label: '연락처', value: managerContact, icon: '📞' }
    ];
    const kakaoTalkId = String(ad?.kakaoTalkId || '').trim();
    const telegramId = String(ad?.telegramId || '').trim();

    if (kakaoTalkId) {
        contactItems.push({ label: '카카오톡', value: sanitizeHTML(kakaoTalkId), icon: '💬' });
    }
    if (telegramId) {
        contactItems.push({ label: '텔레그램', value: sanitizeHTML(telegramId), icon: '✈️' });
    }

    const contactMarkup = contactItems.map((item) => `
        <span class="business-profile-contact-item">
            <span class="business-profile-contact-label"><span aria-hidden="true">${item.icon}</span>${item.label}</span>
            <span class="business-profile-contact-value">${item.value}</span>
        </span>
    `).join('');

    return `<div class="business-profile-info-item business-profile-info-item--contact"><dd>${contactMarkup}</dd></div>`;
}

function buildBusinessProfileMapMarkup(ad) {
    const businessAddress = String(ad?.businessAddress || '').trim();
    const businessAddressDetail = String(ad?.businessAddressDetail || '').trim();
    const shouldShowMap = normalizeBooleanFlag(ad?.showBusinessAddressMap) && businessAddress;

    if (!shouldShowMap) return '';

    const fullAddress = [businessAddress, businessAddressDetail].filter(Boolean).join(' ');

    return `
        <section class="business-profile-extra" aria-label="위치정보">
            <h3>위치정보</h3>
            <div class="business-profile-mini-map" title="${sanitizeHTML(fullAddress)} 카카오맵 미니맵" data-kakao-map-address="${sanitizeHTML(fullAddress)}">${buildKakaoMapFallbackMarkup(fullAddress, '카카오맵 미니맵을 불러오는 중입니다.')}</div>
            <a class="business-profile-map-link" href="${buildKakaoMapSearchUrl(fullAddress)}" target="_blank" rel="noopener noreferrer">카카오맵에서 크게 보기</a>
        </section>
    `;
}

function buildBusinessProfileAdditionalInfoMarkup(ad) {
    const businessAddress = String(ad?.businessAddress || '').trim();
    const businessAddressDetail = String(ad?.businessAddressDetail || '').trim();
    const shouldShowMap = normalizeBooleanFlag(ad?.showBusinessAddressMap) && businessAddress;
    const useVisitVerification = normalizeBooleanFlag(ad?.useVisitVerification);
    const useStampEvent = normalizeBooleanFlag(ad?.useStampEvent);
    const stampEventCount = Number(ad?.stampEventCount || 0);
    const infoRows = [];

    if (useVisitVerification) {
        infoRows.push(buildBusinessProfileInfoRow('방문 인증', '사용 업소 · 방문인증시 스탬프 1개 차감', '✅'));
    }
    if (useStampEvent && stampEventCount > 0) {
        infoRows.push(buildBusinessProfileInfoRow('스탬프 이벤트', `사용 업소 · ${stampEventCount.toLocaleString('ko-KR')}개`, '🎟️'));
    }
    if (shouldShowMap) {
        const fullAddress = [businessAddress, businessAddressDetail].filter(Boolean).join(' ');
        infoRows.push(buildBusinessProfileInfoRow('사업자등록기준 주소지', sanitizeHTML(fullAddress), '📍'));
    }

    if (!infoRows.length) return '';

    return `
        <section class="business-profile-extra" aria-label="업체 부가 정보">
            <h3>부가 정보</h3>
            <dl class="business-profile-info business-profile-info--extra">${infoRows.join('')}</dl>
        </section>
    `;
}

function closeBusinessProfileModal() {
    document.body.classList.remove('business-profile-modal-open');
}

function buildBusinessProfileDetailMarkup(ad) {
    const regionLabel = sanitizeHTML(ad.region || '지역미지정');
    const district = sanitizeHTML(ad.district || '선택');
    const category = sanitizeHTML(ad.category || '선택');
    const businessName = sanitizeHTML(ad.businessName || ad.companyName || ad.ownerNickname || '업소');
    const managerName = sanitizeHTML(ad.managerName || ad.profileManagerName || ad.ownerNickname || '담당자');
    const managerContact = sanitizeHTML(ad.managerContact || '연락처');
    const openHour = sanitizeHTML(ad.openHour || '시간선택');
    const closeHour = sanitizeHTML(ad.closeHour || '시간선택');
    const viewCount = Number(ad.viewCount || 0).toLocaleString('ko-KR');
    const imageUrl = sanitizeHTML(ad.imageUrl || BUSINESS_DIRECTORY_DEFAULT_IMAGE_URL);
    const description = sanitizeBusinessRichText(ad.description || '');
    const contactInfoGroup = buildBusinessProfileContactInfoGroup(managerContact, ad);
    const mapMarkup = buildBusinessProfileMapMarkup(ad);
    const additionalInfoMarkup = buildBusinessProfileAdditionalInfoMarkup(ad);
    const externalUrl = normalizeBusinessProfileLinkUrl(ad.linkUrl || '');
    const profileTitle = getBusinessProfileTitle(ad);

    return `
        <article class="business-profile-standalone">
            <div class="business-profile-hero">
                <div class="business-profile-image-frame">
                    <img class="business-profile-image-blur" src="${imageUrl}" alt="" aria-hidden="true" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${BUSINESS_DIRECTORY_DEFAULT_IMAGE_URL}';">
                    <img class="business-profile-image" src="${imageUrl}" alt="${profileTitle} 대표이미지" onerror="this.onerror=null;this.src='${BUSINESS_DIRECTORY_DEFAULT_IMAGE_URL}';">
                </div>
                <div class="business-profile-summary">
                    <p class="business-profile-eyebrow">${regionLabel} ${district} · ${category}</p>
                    <h2>${profileTitle}</h2>
                    <div class="business-profile-stats">
                        <span>영업시간 ${openHour} ~ ${closeHour}</span>
                        <span>조회수 ${viewCount}</span>
                    </div>
                </div>
            </div>
            <dl class="business-profile-info">
                ${buildBusinessProfileInfoPair(
                    buildBusinessProfileInfoRow('업체명', businessName, '🏢'),
                    buildBusinessProfileInfoRow('담당자', managerName, '👤')
                )}
                ${contactInfoGroup}
                ${buildBusinessProfileInfoPair(
                    buildBusinessProfileInfoRow('지역', `${regionLabel} ${district}`, '📍'),
                    buildBusinessProfileInfoRow('업종', category, '🏷️')
                )}
            </dl>
            <section class="business-profile-description" aria-label="업체 상세정보">
                <h3>상세정보</h3>
                <div class="business-profile-description-content">${description || '<p>등록된 상세정보가 없습니다.</p>'}</div>
            </section>
            ${mapMarkup}
            ${additionalInfoMarkup}
            ${externalUrl ? `<a class="business-profile-link btn btn-primary" href="${sanitizeHTML(externalUrl)}" target="_blank" rel="noopener noreferrer">업체 링크 열기</a>` : ''}
        </article>
    `;
}

function openBusinessProfileModal(ad) {
    if (!ad?.id) return;
    window.location.href = `/business-info/${encodeURIComponent(ad.id)}`;
}

async function initBusinessProfileDetailPage() {
    const detail = document.getElementById('business-profile-detail');
    const callFooter = document.getElementById('business-profile-call-footer');
    const callBar = document.getElementById('business-profile-call-bar');
    const visitButton = document.getElementById('business-profile-visit-button');
    const callButton = document.getElementById('business-profile-call-button');
    if (!detail) return;

    const adId = window.location.pathname.split('/').filter(Boolean).pop();
    if (!adId || adId === 'business-info') {
        detail.innerHTML = '<p class="text-muted">유효하지 않은 업체정보입니다.</p>';
        return;
    }

    try {
        const response = await APIClient.get(`/live/business-ads/${encodeURIComponent(adId)}`);
        const ad = response?.content;
        if (!ad) throw new Error('업체정보를 찾을 수 없습니다.');

        detail.innerHTML = buildBusinessProfileDetailMarkup(ad);
        initializeBusinessProfileKakaoMaps(detail);
        const telHref = getBusinessProfileTelHref(ad.managerContact);
        const visitHref = normalizeBusinessProfileLinkUrl(ad.linkUrl || '') || telHref;
        if (telHref && callButton && visitButton && callBar) {
            visitButton.setAttribute('href', visitHref);
            visitButton.textContent = '방문신청';
            visitButton.setAttribute('aria-label', `${getBusinessProfileTitle(ad)} 방문신청`);
            if (visitHref !== telHref) {
                visitButton.setAttribute('target', '_blank');
                visitButton.setAttribute('rel', 'noopener noreferrer');
            } else {
                visitButton.removeAttribute('target');
                visitButton.removeAttribute('rel');
            }
            callButton.setAttribute('href', telHref);
            callButton.textContent = '전화하기';
            callButton.setAttribute('aria-label', `${getBusinessProfileTitle(ad)} 전화하기`);
            callBar.classList.remove('hidden');
            callFooter?.classList.remove('hidden');
        } else if (callBar) {
            callBar.classList.add('hidden');
            callFooter?.classList.add('hidden');
        }
    } catch (error) {
        detail.innerHTML = `<p class="text-muted">${sanitizeHTML(error.message || '업체정보를 불러오지 못했습니다.')}</p>`;
        callBar?.classList.add('hidden');
        callFooter?.classList.add('hidden');
    }
}

function bindBusinessProfileModalEvents() {
    const list = document.getElementById('business-directory-list');
    const modal = document.getElementById('business-profile-modal');

    list?.addEventListener('click', (event) => {
        const item = event.target.closest('[data-business-ad-id]');
        if (!item) return;
        window.location.href = `/business-info/${encodeURIComponent(item.dataset.businessAdId)}`;
    });

    list?.addEventListener('keydown', (event) => {
        if (!['Enter', ' '].includes(event.key)) return;
        const item = event.target.closest('[data-business-ad-id]');
        if (!item) return;
        event.preventDefault();
        window.location.href = `/business-info/${encodeURIComponent(item.dataset.businessAdId)}`;
    });

    modal?.addEventListener('click', (event) => {
        if (event.target.closest('[data-business-profile-close]')) {
            closeBusinessProfileModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal?.classList.contains('hidden')) {
            closeBusinessProfileModal();
        }
    });
}

function readBusinessFilters() {
    return {
        region: String(document.getElementById('business-region-filter')?.value || '').trim(),
        district: String(document.getElementById('business-district-filter')?.value || '').trim(),
        category: String(document.getElementById('business-category-filter')?.value || '').trim(),
        keyword: String(document.getElementById('business-keyword-filter')?.value || '').trim()
    };
}

function sortBusinessAreasByDefinedOrder(values, definedOrder = []) {
    const order = new Map(definedOrder.map((value, index) => [value, index]));

    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
        .sort((left, right) => {
            const leftOrder = order.has(left) ? order.get(left) : Number.MAX_SAFE_INTEGER;
            const rightOrder = order.has(right) ? order.get(right) : Number.MAX_SAFE_INTEGER;
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return left.localeCompare(right, 'ko-KR');
        });
}

function normalizeBusinessAdAreaAvailability(response) {
    const content = Array.isArray(response?.content) ? response.content : [];
    const districtsByRegion = {};

    content.forEach((item) => {
        const region = String(item?.region || '').trim();
        if (!region) return;

        const knownDistricts = REGION_DISTRICT_MAP[region] || [];
        const districts = Array.isArray(item?.districts)
            ? item.districts.map((district) => String(district || '').trim()).filter(Boolean)
            : [];
        districtsByRegion[region] = sortBusinessAreasByDefinedOrder(districts, knownDistricts);
    });

    const regions = sortBusinessAreasByDefinedOrder(Object.keys(districtsByRegion), Object.keys(REGION_DISTRICT_MAP));
    return { regions, districtsByRegion };
}

async function loadBusinessAdAreaAvailability() {
    try {
        const response = await APIClient.get('/live/business-ads/areas');
        businessAdAreaAvailability = normalizeBusinessAdAreaAvailability(response);
    } catch (error) {
        businessAdAreaAvailability = BUSINESS_AD_AREA_FALLBACK;
    }
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

async function bindBusinessFilterEvents() {
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

    await loadBusinessAdAreaAvailability();

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
            businessAdAreaAvailability.regions.map((region) => ({ value: region, label: normalizeAreaLabel(region) })),
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
        const districts = businessAdAreaAvailability.districtsByRegion[regionSelect?.value || ''] || [];
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


function getBusinessNumberDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 10);
}

function formatBusinessRegistrationNumber(value) {
    const digits = getBusinessNumberDigits(value);
    const first = digits.slice(0, 3);
    const second = digits.slice(3, 5);
    const third = digits.slice(5, 10);

    return [first, second, third].filter(Boolean).join('-');
}

function updateBusinessVerificationStatus(message = '', state = 'idle') {
    const businessNumberInput = document.getElementById('business-number');
    if (!businessNumberInput) return;

    businessNumberInput.classList.remove('is-verification-checking', 'is-verification-valid', 'is-verification-invalid');
    businessNumberInput.removeAttribute('aria-invalid');
    delete businessNumberInput.dataset.verifiedBusinessNumber;
    delete businessNumberInput.dataset.businessVerificationStatus;

    if (state === 'valid') {
        businessNumberInput.classList.add('is-verification-valid');
        businessNumberInput.dataset.verifiedBusinessNumber = getBusinessNumberDigits(businessNumberInput.value);
        businessNumberInput.dataset.businessVerificationStatus = 'valid';
    } else if (state === 'invalid') {
        businessNumberInput.classList.add('is-verification-invalid');
        businessNumberInput.dataset.businessVerificationStatus = 'invalid';
        businessNumberInput.setAttribute('aria-invalid', 'true');
    } else if (state === 'checking') {
        businessNumberInput.classList.add('is-verification-checking');
    }

    if (message) {
        businessNumberInput.title = message;
        businessNumberInput.setAttribute('aria-label', message);
    } else {
        businessNumberInput.removeAttribute('title');
        businessNumberInput.removeAttribute('aria-label');
    }
}

function syncBusinessNumberVerificationControls({ resetStatus = false } = {}) {
    const businessNumberInput = document.getElementById('business-number');
    const verifyButton = document.getElementById('business-verify-btn');
    if (!businessNumberInput) return;

    const formatted = formatBusinessRegistrationNumber(businessNumberInput.value);
    if (businessNumberInput.value !== formatted) {
        businessNumberInput.value = formatted;
    }

    const digits = getBusinessNumberDigits(formatted);
    if (verifyButton) verifyButton.disabled = digits.length !== 10;

    if (resetStatus) {
        updateBusinessVerificationStatus('', 'idle');
    }
}

async function verifyBusinessRegistrationNumber() {
    const businessNumberInput = document.getElementById('business-number');
    const verifyButton = document.getElementById('business-verify-btn');
    const businessNumber = getBusinessNumberDigits(businessNumberInput?.value);

    if (businessNumber.length !== 10) {
        updateBusinessVerificationStatus('사업자등록번호 숫자 10자리를 입력해주세요.', 'invalid');
        syncBusinessNumberVerificationControls();
        return;
    }

    const originalLabel = verifyButton?.textContent || '검증';
    if (verifyButton) {
        verifyButton.disabled = true;
        verifyButton.textContent = '검증중';
    }
    updateBusinessVerificationStatus('사업자등록번호를 조회하고 있습니다.', 'checking');

    try {
        const result = await APIClient.post('/users/me/business-profile/verify-registration', { businessNumber });
        if (result?.valid) {
            updateBusinessVerificationStatus(result.message || '유효한 사업자등록번호입니다.', 'valid');
        } else {
            updateBusinessVerificationStatus(result?.message || '유효하지 않은 사업자등록번호입니다.', 'invalid');
        }
    } catch (error) {
        updateBusinessVerificationStatus(error.message || '사업자등록번호 검증에 실패했습니다.', 'invalid');
    } finally {
        if (verifyButton) {
            verifyButton.textContent = originalLabel;
        }
        syncBusinessNumberVerificationControls();
        updateBusinessActionButtons();
    }
}

function collectBusinessManagementFormData() {
    const licenseButton = document.getElementById('business-license-upload-btn');
    const permitButton = document.getElementById('business-permit-upload-btn');
    const licensePreview = document.getElementById('business-license-preview');
    const permitPreview = document.getElementById('business-permit-preview');

    return {
        licenseImageName: String(licenseButton?.dataset.fileName || '').trim(),
        licenseImageDataUrl: String(licensePreview?.getAttribute('src') || '').trim(),
        permitImageName: String(permitButton?.dataset.fileName || '').trim(),
        permitImageDataUrl: String(permitPreview?.getAttribute('src') || '').trim(),
        licenseImageOcrStatus: String(licenseButton?.dataset.ocrState || '').trim(),
        permitImageOcrStatus: String(permitButton?.dataset.ocrState || '').trim(),
        businessNumber: formatBusinessRegistrationNumber(document.getElementById('business-number')?.value || ''),
        businessName: String(document.getElementById('business-name')?.value || '').trim(),
        businessOwner: String(document.getElementById('business-owner')?.value || '').trim(),
        businessAddress: String(document.getElementById('business-address')?.value || '').trim(),
        businessAddressDetail: String(document.getElementById('business-address-detail')?.value || '').trim()
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
    updateBusinessOcrVisualState(button);
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

function resolveExpectedBusinessDocumentType(documentLabel = '') {
    return /영업/u.test(String(documentLabel || '')) ? 'business_permit_certificate' : 'business_registration_certificate';
}

function detectBusinessDocumentType(text) {
    const normalizedText = normalizeBusinessOcrText(text);
    const compactText = normalizedText.replace(/\s/g, '');

    if (/사업자등록증|사업자등록번호|사업자등록번호증/u.test(compactText)) {
        return 'business_registration_certificate';
    }

    if (/영업(허가|신고|등록)증|영업(허가|신고|등록)번호|식품접객업영업(허가|신고)증|허가증|신고증/u.test(compactText)) {
        return 'business_permit_certificate';
    }

    return 'unknown';
}

function hasLenientBusinessRegistrationSignals(text) {
    const normalizedText = normalizeBusinessOcrText(text);
    const compactText = normalizedText.replace(/\s/g, '');

    if (!compactText) return false;

    const strongRegistrationSignals = [
        /사업자/u,
        /등록번호/u,
        /사업자등록/u
    ];
    if (strongRegistrationSignals.some((pattern) => pattern.test(compactText))) return true;

    const supportingRegistrationSignals = [
        /등록/u,
        /상호|법인명/u,
        /성명|대표자/u,
        /사업장|소재지/u,
        /개업/u,
        /업태|종목/u
    ];
    const signalCount = supportingRegistrationSignals.reduce((count, pattern) => count + (pattern.test(compactText) ? 1 : 0), 0);

    return signalCount >= 2;
}

function hasLenientBusinessPermitSignals(text) {
    const normalizedText = normalizeBusinessOcrText(text);
    const compactText = normalizedText.replace(/\s/g, '');

    if (!compactText) return false;

    const permitSignals = [
        /영업/u,
        /허가|신고|등록/u,
        /식품접객/u,
        /제\d+호/u
    ];
    const signalCount = permitSignals.reduce((count, pattern) => count + (pattern.test(compactText) ? 1 : 0), 0);

    return signalCount >= 1;
}

function isBusinessOcrDocumentValid({ text, expectedDocumentType, detectedDocumentType }) {
    if (detectedDocumentType === expectedDocumentType) return true;

    if (expectedDocumentType === 'business_registration_certificate' && detectedDocumentType === 'unknown') {
        return hasLenientBusinessRegistrationSignals(text);
    }

    if (expectedDocumentType === 'business_permit_certificate' && detectedDocumentType === 'unknown') {
        return hasLenientBusinessPermitSignals(text);
    }

    return false;
}

function parseBusinessOcrText(text, { documentLabel = '', fileName = '', confidence = 0 } = {}) {
    const expectedDocumentType = resolveExpectedBusinessDocumentType(documentLabel);
    const detectedDocumentType = detectBusinessDocumentType(text);

    return {
        documentLabel,
        fileName,
        expectedDocumentType,
        detectedDocumentType,
        isValidDocument: isBusinessOcrDocumentValid({ text, expectedDocumentType, detectedDocumentType }),
        confidence: Number.isFinite(Number(confidence)) ? Math.round(Number(confidence) * 100) / 100 : 0
    };
}

function updateBusinessOcrVisualState(button, state = BUSINESS_OCR_STATUS.IDLE) {
    if (!button) return;

    button.classList.remove('is-ocr-checking', 'is-ocr-valid', 'is-ocr-invalid');
    delete button.dataset.ocrStatus;
    delete button.dataset.ocrState;

    if (state === BUSINESS_OCR_STATUS.CHECKING) {
        button.classList.add('is-ocr-checking');
        button.dataset.ocrState = BUSINESS_OCR_STATUS.CHECKING;
        button.dataset.ocrStatus = '이미지 검사 중';
    } else if (state === BUSINESS_OCR_STATUS.VALID) {
        button.classList.add('is-ocr-valid');
        button.dataset.ocrState = BUSINESS_OCR_STATUS.VALID;
        button.dataset.ocrStatus = '통과';
    } else if (state === BUSINESS_OCR_STATUS.INVALID) {
        button.classList.add('is-ocr-invalid');
        button.dataset.ocrState = BUSINESS_OCR_STATUS.INVALID;
        button.dataset.ocrStatus = '불통과';
    }
}

async function recognizeBusinessImageFile({ file, imageUrl, documentLabel, uploadButton }) {
    const requestId = String(++businessOcrRequestId);
    const fileName = String(file?.name || '').trim();
    if (uploadButton) {
        uploadButton.dataset.ocrRequestId = requestId;
        updateBusinessOcrVisualState(uploadButton, BUSINESS_OCR_STATUS.CHECKING);
    }

    try {
        const Tesseract = await loadBusinessOcrScript();
        const recognized = await Tesseract.recognize(imageUrl, BUSINESS_OCR_LANGUAGE);

        if (uploadButton?.dataset.ocrRequestId !== requestId) {
            return null;
        }

        const result = parseBusinessOcrText(recognized?.data?.text || '', {
            documentLabel,
            fileName,
            confidence: recognized?.data?.confidence
        });
        updateBusinessOcrVisualState(uploadButton, result.isValidDocument ? BUSINESS_OCR_STATUS.VALID : BUSINESS_OCR_STATUS.INVALID);
        return result;
    } catch (error) {
        if (uploadButton?.dataset.ocrRequestId === requestId) {
            updateBusinessOcrVisualState(uploadButton, BUSINESS_OCR_STATUS.INVALID);
        }
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
        await recognizeBusinessImageFile({ file, imageUrl, documentLabel, uploadButton });
        updateBusinessActionButtons();
    } catch (error) {
        alert(error.message || '이미지를 불러오지 못했습니다.');
    }
}

function hasBusinessImageInspectionPassed(data, imageType = 'license') {
    if (!data) return false;

    const imageNameKey = imageType === 'permit' ? 'permitImageName' : 'licenseImageName';
    const statusKey = imageType === 'permit' ? 'permitImageOcrStatus' : 'licenseImageOcrStatus';
    const hasImage = data[imageNameKey] && data[imageNameKey] !== BUSINESS_IMAGE_PLACEHOLDER;

    if (!hasImage) return false;
    return data[statusKey] === BUSINESS_OCR_STATUS.VALID;
}

function hasBusinessRegistrationVerificationPassed(data) {
    const businessNumberInput = document.getElementById('business-number');
    const currentDigits = getBusinessNumberDigits(data?.businessNumber || businessNumberInput?.value);
    const verifiedDigits = String(businessNumberInput?.dataset.verifiedBusinessNumber || '').trim();
    return Boolean(
        currentDigits.length === 10
        && businessNumberInput?.dataset.businessVerificationStatus === 'valid'
        && verifiedDigits === currentDigits
    );
}

function isBusinessInfoComplete(data) {
    if (!data) return false;
    return Boolean(
        hasBusinessImageInspectionPassed(data, 'license')
        && hasBusinessImageInspectionPassed(data, 'permit')
        && hasBusinessRegistrationVerificationPassed(data)
        && data.businessName
        && data.businessOwner
        && data.businessAddress
    );
}

function updateBusinessActionButtons() {
    const saveButton = document.getElementById('business-info-save-btn');
    const formData = collectBusinessManagementFormData();
    const isComplete = isBusinessInfoComplete(formData);

    if (saveButton) saveButton.disabled = !isComplete;
}

function applyBusinessFormData(savedData) {
    if (!savedData || typeof savedData !== 'object') return;

    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element && value) element.value = value;
    };

    setValue('business-number', formatBusinessRegistrationNumber(savedData.businessNumber));
    syncBusinessNumberVerificationControls();
    if (savedData.businessNumberVerificationStatus === 'valid') {
        updateBusinessVerificationStatus('저장된 사업자등록번호 검증 통과 이력이 있습니다. 번호를 변경하면 다시 검증해주세요.', 'valid');
    }
    setValue('business-name', savedData.businessName);
    setValue('business-owner', savedData.businessOwner);
    setValue('business-address', savedData.businessAddress);
    setValue('business-address-detail', savedData.businessAddressDetail);

    const licenseUploadButton = document.getElementById('business-license-upload-btn');
    const permitUploadButton = document.getElementById('business-permit-upload-btn');

    updateBusinessUploadPreview(licenseUploadButton, {
        fileName: savedData.licenseImageName,
        imageUrl: savedData.licenseImageDataUrl
    });
    if (savedData.licenseImageOcrStatus === BUSINESS_OCR_STATUS.VALID) {
        updateBusinessOcrVisualState(licenseUploadButton, BUSINESS_OCR_STATUS.VALID);
    }

    updateBusinessUploadPreview(permitUploadButton, {
        fileName: savedData.permitImageName,
        imageUrl: savedData.permitImageDataUrl
    });
    if (savedData.permitImageOcrStatus === BUSINESS_OCR_STATUS.VALID) {
        updateBusinessOcrVisualState(permitUploadButton, BUSINESS_OCR_STATUS.VALID);
    }

    updateBusinessActionButtons();
}

function bindBusinessManagementEvents() {
    const licenseInput = document.getElementById('business-license-input');
    const permitInput = document.getElementById('business-permit-input');
    const uploadButton = document.getElementById('business-license-upload-btn');
    const permitUploadButton = document.getElementById('business-permit-upload-btn');
    const saveButton = document.getElementById('business-info-save-btn');
    const addressSearchButton = document.getElementById('business-address-search-btn');
    const addressInput = document.getElementById('business-address');
    const businessNumberInput = document.getElementById('business-number');
    const verifyButton = document.getElementById('business-verify-btn');
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
        if (id === 'business-number') {
            input?.addEventListener('input', () => {
                syncBusinessNumberVerificationControls({ resetStatus: true });
                updateBusinessActionButtons();
            });
            input?.addEventListener('change', () => {
                syncBusinessNumberVerificationControls({ resetStatus: true });
                updateBusinessActionButtons();
            });
            return;
        }
        input?.addEventListener('input', updateBusinessActionButtons);
        input?.addEventListener('change', updateBusinessActionButtons);
    });

    syncBusinessNumberVerificationControls();
    businessNumberInput?.setAttribute('inputmode', 'numeric');
    businessNumberInput?.setAttribute('autocomplete', 'off');
    verifyButton?.addEventListener('click', verifyBusinessRegistrationNumber);

    const handleAddressSearch = async () => {
        try {
            await openBusinessAddressSearch();
        } catch (error) {
            alert(error.message || '주소 검색을 실행할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    };
    addressSearchButton?.addEventListener('click', handleAddressSearch);
    addressInput?.addEventListener('click', handleAddressSearch);

    saveButton?.addEventListener('click', async () => {
        try {
            const formData = collectBusinessManagementFormData();
            if (!isBusinessInfoComplete(formData)) {
                alert('사업자등록증과 영업허가증 이미지를 모두 첨부하고 이미지 검사 통과 후 필수 항목을 모두 입력해야 신청/저장할 수 있습니다.');
                updateBusinessActionButtons();
                return;
            }

            const isApplyMode = isBusinessApplicationMode();
            const response = await APIClient.put('/users/me/business-profile', {
                registrationStatus: 'REGISTERED',
                businessInfo: {
                    ...formData,
                    businessNumberVerificationStatus: 'valid'
                }
            });
            if (isApplyMode) {
                window.sessionStorage?.removeItem(BUSINESS_APPLY_AGREEMENT_KEY);
            }
            const message = isApplyMode
                ? '기업회원 신청 접수가 완료되었습니다. 관리자가 신청서를 검토한 뒤 최종 승인하면 기업회원으로 전환됩니다.'
                : (response?.requiresAdminReview
                    ? '사업자정보 변경 내역이 접수되었습니다. 관리자가 검토한 뒤 최종 반영됩니다.'
                    : '사업자정보가 저장되었습니다.');
            alert(message);
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
    if (redirectBusinessManagementPendingReview(profile, me)) return;

    renderBusinessManagementReviewNotice(profile);
    applyBusinessFormData(profile?.businessInfo || {});
    bindBusinessManagementEvents();
    updateBusinessActionButtons();
}

async function initBusinessInfoPage() {
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') initHeader();
    Auth.bindLogoutButton();

    if (document.getElementById('business-profile-detail')) {
        await initBusinessProfileDetailPage();
        return;
    }

    bindBusinessProfileModalEvents();
    await bindBusinessFilterEvents();
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
