/**
 * 파일 역할: createPost 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;
let isEditMode = false;
let editingPostId = null;
let existingImageUrls = [];
let isBusinessUser = false;

const MAX_POST_IMAGE_COUNT = 5;
const MAX_POST_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_COMPRESSION_TARGET_BYTES = 3 * 1024 * 1024;
const IMAGE_RESIZE_MAX_DIMENSION = 1920;
const COMPRESSIBLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DIRECT_UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const PIECE_TEMPLATE_START = '<!-- PIECE_TEMPLATE_START -->';
const PIECE_TEMPLATE_END = '<!-- PIECE_TEMPLATE_END -->';
const WRITABLE_BOARD_TYPES = new Set(['FREE', 'ANON', 'REVIEW', 'STORY', 'PIECE', 'ATTENDANCE', 'QUESTION', 'EVENT', 'PROMOTION']);

const PIECE_LOCATION_FALLBACK_CITY = '서울';
const PIECE_LOCATION_FALLBACK_DISTRICT = '강남구';

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

let pieceAdAreaAvailability = {
    regions: Object.keys(REGION_DISTRICT_MAP),
    districtsByRegion: { ...REGION_DISTRICT_MAP }
};

function getSelectedBoardType() {
    const boardTypeSelect = document.getElementById('board-type');
    const selectedValue = String(boardTypeSelect?.selectedOptions?.[0]?.value || boardTypeSelect?.value || '').trim().toUpperCase();
    return WRITABLE_BOARD_TYPES.has(selectedValue) ? selectedValue : '';
}

function isPieceBoardSelected() {
    return getSelectedBoardType() === 'PIECE';
}


function sortPieceAreasByDefinedOrder(values, definedOrder = []) {
    const order = new Map(definedOrder.map((value, index) => [value, index]));

    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
        .sort((left, right) => {
            const leftOrder = order.has(left) ? order.get(left) : Number.MAX_SAFE_INTEGER;
            const rightOrder = order.has(right) ? order.get(right) : Number.MAX_SAFE_INTEGER;
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return left.localeCompare(right, 'ko-KR');
        });
}

function normalizePieceAdAreaAvailability(response) {
    const content = Array.isArray(response?.content) ? response.content : [];
    const districtsByRegion = {};

    content.forEach((item) => {
        const region = String(item?.region || '').trim();
        if (!region) return;

        const knownDistricts = REGION_DISTRICT_MAP[region] || [];
        const districts = Array.isArray(item?.districts)
            ? item.districts.map((district) => String(district || '').trim()).filter(Boolean)
            : [];
        districtsByRegion[region] = sortPieceAreasByDefinedOrder(districts, knownDistricts);
    });

    const regions = sortPieceAreasByDefinedOrder(Object.keys(districtsByRegion), Object.keys(REGION_DISTRICT_MAP));
    return { regions, districtsByRegion };
}

async function loadPieceAdAreaAvailability() {
    try {
        const response = await APIClient.get('/live/business-ads/areas');
        pieceAdAreaAvailability = normalizePieceAdAreaAvailability(response);
    } catch (error) {
        pieceAdAreaAvailability = {
            regions: Object.keys(REGION_DISTRICT_MAP),
            districtsByRegion: { ...REGION_DISTRICT_MAP }
        };
    }
}

function populatePieceCityOptions(selectedCity = '') {
    const citySelect = document.getElementById('piece-location-city');
    if (!citySelect) return;

    const cities = pieceAdAreaAvailability.regions;
    const fallbackCity = cities.includes(PIECE_LOCATION_FALLBACK_CITY) ? PIECE_LOCATION_FALLBACK_CITY : (cities[0] || '');
    const cityValue = cities.includes(selectedCity) ? selectedCity : fallbackCity;

    citySelect.innerHTML = cities
        .map((city) => `<option value="${sanitizeHTML(city)}">${sanitizeHTML(city)}</option>`)
        .join('');
    citySelect.value = cityValue;
}

function populatePieceDistrictOptions(selectedDistrict = '') {
    const citySelect = document.getElementById('piece-location-city');
    const districtSelect = document.getElementById('piece-location-district');
    if (!citySelect || !districtSelect) return;

    const districts = pieceAdAreaAvailability.districtsByRegion[citySelect.value] || [];
    const fallbackDistrict = districts.includes(PIECE_LOCATION_FALLBACK_DISTRICT) ? PIECE_LOCATION_FALLBACK_DISTRICT : (districts[0] || '');
    const districtValue = districts.includes(selectedDistrict) ? selectedDistrict : fallbackDistrict;

    districtSelect.innerHTML = districts
        .map((district) => `<option value="${sanitizeHTML(district)}">${sanitizeHTML(district)}</option>`)
        .join('');
    districtSelect.value = districtValue;
}

async function setupPieceLocationOptions() {
    const citySelect = document.getElementById('piece-location-city');
    if (!citySelect) return;

    const initialCity = citySelect.value || PIECE_LOCATION_FALLBACK_CITY;
    const initialDistrict = document.getElementById('piece-location-district')?.value || PIECE_LOCATION_FALLBACK_DISTRICT;
    await loadPieceAdAreaAvailability();
    populatePieceCityOptions(initialCity);
    populatePieceDistrictOptions(initialDistrict);
    citySelect.addEventListener('change', () => {
        populatePieceDistrictOptions();
        validateForm();
    });
}


function formatPieceLocationValue(city, district) {
    const normalizedCity = String(city || '').trim();
    const normalizedDistrict = String(district || '').trim();
    const displayCity = normalizedCity && !/[시도]$/.test(normalizedCity) ? `${normalizedCity}시` : normalizedCity;
    return [displayCity, normalizedDistrict].filter(Boolean).join(' ');
}

function formatPieceDateTimeOffset(date) {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
    const minutes = String(absoluteMinutes % 60).padStart(2, '0');
    return `UTC${sign}${hours}:${minutes}`;
}

function parsePieceDateTimeInputValue(value) {
    const [datePart, timePart = '00:00'] = String(value || '').split('T');
    const [year, month, day] = datePart.split('-').map((item) => Number(item));
    const [hour = 0, minute = 0] = timePart.split(':').map((item) => Number(item));
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const date = new Date(year, month - 1, day, hour, minute);
    return Number.isNaN(date.getTime()) ? null : date;
}


function logPieceDateTimeComparison(context, selectedDateTime = null, serverTime = null) {
    const localNow = new Date();
    const serverDate = serverTime ? new Date(serverTime) : null;
    console.log('[PieceDateTime] 서버/로컬 시간 비교', {
        context,
        inputValue: document.getElementById('piece-datetime')?.value || '',
        selectedDateTime: selectedDateTime instanceof Date && !Number.isNaN(selectedDateTime.getTime())
            ? selectedDateTime.toISOString()
            : null,
        localNow: localNow.toISOString(),
        localTimezoneOffsetMinutes: localNow.getTimezoneOffset(),
        serverNow: serverDate && !Number.isNaN(serverDate.getTime()) ? serverDate.toISOString() : serverTime,
        serverLocalDiffMs: serverDate && !Number.isNaN(serverDate.getTime())
            ? serverDate.getTime() - localNow.getTime()
            : null
    });
}

function formatPieceDateTimeValue(value) {
    if (!value) return '';
    const date = parsePieceDateTimeInputValue(value);
    const [datePart, timePart = ''] = String(value).split('T');
    const [year, month, day] = datePart.split('-').map((item) => Number(item));
    if (!year || !month || !day) return String(value);
    const displayValue = `${year}년 ${month}월 ${day}일${timePart ? ` ${timePart}` : ''}`;
    return date ? `${displayValue} (${formatPieceDateTimeOffset(date)})` : displayValue;
}

function formatPieceRangeValue(minValue, maxValue, prefixLabel, separator = ' / ') {
    const minText = String(minValue || '').trim();
    const maxText = String(maxValue || '').trim();
    if (minText && maxText) return `${prefixLabel} ${minText}${separator}최대 ${maxText}`;
    if (minText) return `${prefixLabel} ${minText}`;
    if (maxText) return `최대 ${maxText}`;
    return '';
}

function buildPieceTemplateRows() {
    const city = getPieceInputValue(document.getElementById('piece-location-city'));
    const district = getPieceInputValue(document.getElementById('piece-location-district'));
    const dateTime = getPieceInputValue(document.getElementById('piece-datetime'));
    const capacityMin = getPieceInputValue(document.getElementById('piece-capacity-min'));
    const capacityMax = getPieceInputValue(document.getElementById('piece-capacity-max'));
    const ageMin = getPieceInputValue(document.getElementById('piece-age-min'));
    const ageMax = getPieceInputValue(document.getElementById('piece-age-max'));
    const cost = getPieceInputValue(document.getElementById('piece-cost'));
    const drinking = getPieceInputValue(document.getElementById('piece-drinking'));

    return [
        { label: '📍 장소', value: formatPieceLocationValue(city, district) },
        { label: '🕘 시간', value: formatPieceDateTimeValue(dateTime) },
        { label: '👥 인원', value: formatPieceRangeValue(capacityMin, capacityMax, '최소') },
        { label: '🎂 연령대', value: ageMin && ageMax ? `${ageMin}~${ageMax}` : (ageMin || ageMax) },
        { label: '💰 1인 예상 비용', value: cost },
        { label: '🍻 주량', value: drinking }
    ].filter((item) => item.value);
}

function getPieceInputs() {
    return Array.from(document.querySelectorAll('.piece-input'));
}

function getPieceInputValue(input) {
    if (input?.tagName === 'SELECT' && input.multiple) {
        return Array.from(input.selectedOptions)
            .map((option) => option.value.trim())
            .filter(Boolean)
            .join(', ');
    }

    return String(input?.value || '').trim();
}

function setMinimumPieceDateTime() {
    const dateTimeInput = document.getElementById('piece-datetime');
    if (!dateTimeInput) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateTimeInput.min = now.toISOString().slice(0, 16);
}

function togglePieceFields() {
    const pieceFields = document.getElementById('piece-fields');
    if (!pieceFields) return;
    const isPiece = isPieceBoardSelected();
    pieceFields.classList.toggle('hidden', !isPiece);
    getPieceInputs().forEach((input) => {
        input.required = isPiece && input.dataset.pieceRequired === 'true';
    });
}

function parsePieceOrderedNumber(value) {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : null;
}

function parsePieceAgeOrder(value) {
    const rawValue = String(value || '');
    const decadeMatch = rawValue.match(/(\d+)대/);
    if (!decadeMatch) return null;

    const phaseOffsetMap = { 초반: 0, 중반: 1, 후반: 2 };
    const phaseMatch = rawValue.match(/(초반|중반|후반)/);
    const phaseOffset = phaseOffsetMap[phaseMatch?.[1]] ?? 0;
    return Number(decadeMatch[1]) * 10 + phaseOffset;
}

function updatePieceRangeOptions() {
    const capacityMin = parsePieceOrderedNumber(document.getElementById('piece-capacity-min')?.value);
    const ageMin = parsePieceAgeOrder(document.getElementById('piece-age-min')?.value);

    document.querySelectorAll('#piece-capacity-max option').forEach((option) => {
        const optionValue = parsePieceOrderedNumber(option.value);
        option.disabled = capacityMin !== null && optionValue !== null && optionValue < capacityMin;
    });

    document.querySelectorAll('#piece-age-max option').forEach((option) => {
        const optionValue = parsePieceAgeOrder(option.value);
        option.disabled = ageMin !== null && optionValue !== null && optionValue < ageMin;
    });
}

function getPieceValidationError() {
    if (!isPieceBoardSelected()) return '';

    const requiredEmptyInput = getPieceInputs()
        .filter((input) => input.dataset.pieceRequired === 'true')
        .find((input) => getPieceInputValue(input).length === 0);
    if (requiredEmptyInput) return '조각게시판 필수 작성 양식을 모두 입력해주세요.';

    const dateTimeInput = document.getElementById('piece-datetime');
    if (dateTimeInput?.value) {
        const selectedDateTime = parsePieceDateTimeInputValue(dateTimeInput.value);
        if (!selectedDateTime || selectedDateTime.getTime() <= Date.now()) {
            logPieceDateTimeComparison('client-validation-failed', selectedDateTime);
            setMinimumPieceDateTime();
            return '조각 날짜/시간은 현재 이후로 선택해주세요.';
        }
        logPieceDateTimeComparison('client-validation-passed', selectedDateTime);
        setMinimumPieceDateTime();
    }

    const capacityMin = parsePieceOrderedNumber(document.getElementById('piece-capacity-min')?.value);
    const capacityMax = parsePieceOrderedNumber(document.getElementById('piece-capacity-max')?.value);
    if (capacityMin !== null && capacityMax !== null && capacityMin > capacityMax) {
        return '모집 인원은 최소 인원이 최대 인원보다 많을 수 없습니다.';
    }

    const ageMin = parsePieceAgeOrder(document.getElementById('piece-age-min')?.value);
    const ageMax = parsePieceAgeOrder(document.getElementById('piece-age-max')?.value);
    if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
        return '모집 연령은 최소 연령이 최대 연령보다 높을 수 없습니다.';
    }

    return '';
}

function areRequiredPieceFieldsFilled() {
    return !getPieceValidationError();
}

function stripPieceTemplate(content) {
    const rawContent = String(content || '');
    const startIndex = rawContent.indexOf(PIECE_TEMPLATE_START);
    const endIndex = rawContent.indexOf(PIECE_TEMPLATE_END);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return rawContent.trim();
    }

    return `${rawContent.slice(0, startIndex)}${rawContent.slice(endIndex + PIECE_TEMPLATE_END.length)}`.trim();
}

function buildPieceTemplateContent(content) {
    if (!isPieceBoardSelected()) return stripPieceTemplate(content);

    const templateLines = buildPieceTemplateRows().map((item) => `${item.label}: ${item.value}`).join('\n');
    const cleanContent = stripPieceTemplate(content);

    return `${PIECE_TEMPLATE_START}\n[조각 모집 정보]\n${templateLines}\n${PIECE_TEMPLATE_END}${cleanContent ? `\n\n${cleanContent}` : ''}`;
}

function hydratePieceFieldsFromContent(content) {
    const rawContent = String(content || '');
    const startIndex = rawContent.indexOf(PIECE_TEMPLATE_START);
    const endIndex = rawContent.indexOf(PIECE_TEMPLATE_END);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return rawContent;

    const templateContent = rawContent.slice(startIndex + PIECE_TEMPLATE_START.length, endIndex);
    getPieceInputs().forEach((input) => {
        const label = input.dataset.pieceLabel;
        const line = templateContent.split('\n').find((item) => item.trim().startsWith(`${label}:`));
        if (!line) return;
        const value = line.replace(`${label}:`, '').trim();
        if (input.id === 'piece-location-city') {
            input.value = pieceAdAreaAvailability.districtsByRegion[value] ? value : (pieceAdAreaAvailability.regions[0] || '');
            populatePieceDistrictOptions(document.getElementById('piece-location-district')?.value || PIECE_LOCATION_FALLBACK_DISTRICT);
            return;
        }
        if (input.id === 'piece-location-district') {
            populatePieceDistrictOptions(value);
            return;
        }
        if (input.tagName === 'SELECT' && input.multiple) {
            const values = value.split(',').map((item) => item.trim());
            Array.from(input.options).forEach((option) => {
                option.selected = values.includes(option.value);
            });
            return;
        }
        input.value = value;
    });

    return stripPieceTemplate(rawContent);
}

function getFileMimeType(file) {
    const type = String(file?.type || '').toLowerCase();
    const name = String(file?.name || '').toLowerCase();

    if (/\.jpe?g$/.test(name)) return 'image/jpeg';
    if (/\.png$/.test(name)) return 'image/png';
    if (/\.gif$/.test(name)) return 'image/gif';
    if (/\.webp$/.test(name)) return 'image/webp';
    if (/\.heic$/.test(name)) return 'image/heic';
    if (/\.heif$/.test(name)) return 'image/heif';

    if (type && type !== 'application/octet-stream') return type;

    // 일부 모바일 브라우저는 갤러리 사진명을 `image:...` 또는 `image%3A...`처럼 주고 MIME 타입을 비워둡니다.
    if (/^image(?::|%3a)/i.test(name)) return 'image/jpeg';

    return '';
}

function hasKnownNonImageExtension(file) {
    const name = String(file?.name || '').toLowerCase();
    if (!/\.[a-z0-9]{2,10}$/.test(name)) return false;
    return !/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name);
}

function isImageFile(file) {
    const mimeType = getFileMimeType(file);
    if (mimeType) return mimeType.startsWith('image/');

    // accept="image/*"로 열린 모바일 선택기는 실제 이미지여도 type/name이 비어 있을 수 있어 우선 허용하고, 제출 직전에 헤더로 재검증합니다.
    return !hasKnownNonImageExtension(file);
}

async function detectImageMimeTypeFromHeader(file) {
    try {
        const headerBuffer = await file.slice(0, 16).arrayBuffer();
        const bytes = new Uint8Array(headerBuffer);
        const ascii = Array.from(bytes).map((byte) => String.fromCharCode(byte)).join('');

        if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
        if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'image/gif';
        if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
        if (ascii.slice(4, 8) === 'ftyp' && /(heic|heix|hevc|hevx|mif1|msf1)/i.test(ascii.slice(8, 16))) {
            return 'image/heic';
        }
    } catch (_error) {
        return '';
    }

    return '';
}

function normalizeDataUrlMimeType(dataUrl, mimeType) {
    const normalizedMimeType = String(mimeType || '').toLowerCase();
    if (!normalizedMimeType.startsWith('image/')) return dataUrl;

    return String(dataUrl || '').replace(/^data:[^;,]*;base64,/i, `data:${normalizedMimeType};base64,`);
}

function estimateDataUrlBytes(dataUrl) {
    const base64Body = String(dataUrl || '').split(',')[1] || '';
    if (!base64Body) return 0;
    const padding = base64Body.endsWith('==') ? 2 : (base64Body.endsWith('=') ? 1 : 0);
    return Math.floor((base64Body.length * 3) / 4) - padding;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('이미지 읽기에 실패했습니다.'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(imageUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('이미지 미리보기 변환에 실패했습니다.'));
        };
        image.src = imageUrl;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('이미지 압축에 실패했습니다.'));
        }, type, quality);
    });
}

async function compressImageFile(file) {
    const image = await loadImageFromFile(file);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, IMAGE_RESIZE_MAX_DIMENSION / Math.max(originalWidth, originalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.85;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (blob.size > IMAGE_COMPRESSION_TARGET_BYTES && quality > 0.45) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (blob.size > IMAGE_COMPRESSION_TARGET_BYTES) {
        const reducedCanvas = document.createElement('canvas');
        reducedCanvas.width = Math.max(1, Math.round(canvas.width * 0.75));
        reducedCanvas.height = Math.max(1, Math.round(canvas.height * 0.75));
        reducedCanvas.getContext('2d').drawImage(canvas, 0, 0, reducedCanvas.width, reducedCanvas.height);
        blob = await canvasToBlob(reducedCanvas, 'image/jpeg', 0.65);
    }

    if (blob.size > MAX_POST_IMAGE_UPLOAD_BYTES) {
        throw new Error('이미지 용량이 너무 큽니다. 8MB 이하의 사진을 선택해주세요.');
    }

    return readFileAsDataUrl(blob);
}

async function prepareImageForUpload(file) {
    const declaredMimeType = getFileMimeType(file);
    const headerMimeType = await detectImageMimeTypeFromHeader(file);
    const mimeType = headerMimeType || declaredMimeType;

    if (!DIRECT_UPLOAD_IMAGE_TYPES.includes(mimeType)) {
        throw new Error('JPG, PNG, GIF, WEBP, HEIC 이미지만 업로드할 수 있습니다.');
    }

    if (file.size > MAX_POST_IMAGE_UPLOAD_BYTES) {
        throw new Error('이미지 용량이 너무 큽니다. 8MB 이하의 사진을 선택해주세요.');
    }

    if (mimeType === 'image/gif') {
        return normalizeDataUrlMimeType(await readFileAsDataUrl(file), mimeType);
    }

    if (COMPRESSIBLE_IMAGE_TYPES.includes(mimeType)) {
        try {
            return await compressImageFile(file);
        } catch (error) {
            // iOS/Android 일부 브라우저는 HEIC 또는 content URI 이미지를 canvas로 열지 못할 수 있습니다.
            // 서버 허용 용량(8MB) 이내라면 원본 data URL로 폴백해 모바일 업로드 실패를 방지합니다.
            console.warn('이미지 압축 실패, 원본 업로드로 전환:', error);
        }
    }

    const dataUrl = normalizeDataUrlMimeType(await readFileAsDataUrl(file), mimeType);
    if (estimateDataUrlBytes(dataUrl) > MAX_POST_IMAGE_UPLOAD_BYTES) {
        throw new Error('이미지 용량이 너무 큽니다. 8MB 이하의 사진을 선택해주세요.');
    }
    return dataUrl;
}

function getModeFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const postId = params.get('postId') || params.get('id');

    isEditMode = mode === 'edit' && Boolean(postId);
    editingPostId = isEditMode ? postId : null;
}

async function initCreatePost() {
    getModeFromQuery();
    setMinimumPieceDateTime();
    await setupPieceLocationOptions();
    setupEventListeners();
    setupImageUpload();
    await setupBoardOptions();
    setupModeUI();
    validateForm();

    if (isEditMode) {
        await loadPostForEdit();
    }
}

function setupModeUI() {
    const submitBtn = document.getElementById('submit-btn');
    const boardName = document.querySelector('.community-board-name');
    const description = document.querySelector('.main-content .text-muted');

    if (boardName) {
        boardName.textContent = isEditMode ? '게시글 수정' : '새 글 작성';
    }

    if (description) {
        description.textContent = isEditMode
            ? '기존 게시글 내용을 수정해보세요'
            : '미드나잇 맨즈에 새로운 이야기를 공유해보세요';
    }

    if (submitBtn) {
        submitBtn.textContent = isEditMode ? '수정' : '등록';
    }
}

async function setupBoardOptions() {
    const boardTypeSelect = document.getElementById('board-type');
    if (!boardTypeSelect) return;

    let me = Auth.getUser();
    if (!me) {
        try {
            me = await APIClient.get('/auth/me');
        } catch (_error) {
            me = null;
        }
    }

    isBusinessUser = Boolean(me?.isBusiness || me?.isAdvertiser || String(me?.role || '').toUpperCase() === 'BUSINESS');
    const isAdmin = Boolean(me?.isAdmin || String(me?.role || '').toUpperCase() === 'ADMIN');

    if (!isAdmin) {
        const eventOption = Array.from(boardTypeSelect.options).find((option) => option.value === 'EVENT');
        if (eventOption) {
            eventOption.remove();
        }
    }

    if (!isBusinessUser && !isAdmin) {
        const promotionOption = Array.from(boardTypeSelect.options).find((option) => option.value === 'PROMOTION');
        if (promotionOption) {
            promotionOption.remove();
        }
        if (boardTypeSelect.value === 'PROMOTION') {
            boardTypeSelect.value = 'FREE';
        }
        return;
    }

    if (!isBusinessUser) return;

    boardTypeSelect.value = 'PROMOTION';
    Array.from(boardTypeSelect.options)
        .filter((option) => option.value !== 'PROMOTION')
        .forEach((option) => option.remove());
}

function setupEventListeners() {
    const postForm = document.getElementById('post-form');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const boardTypeSelect = document.getElementById('board-type');

    if (postForm) {
        postForm.addEventListener('submit', handleSubmit);
    }

    if (titleInput) {
        titleInput.addEventListener('input', function() {
            updateCharCount('title', 255);
            validateForm();
        });
    }

    if (contentInput) {
        contentInput.addEventListener('input', function() {
            updateCharCount('content', 1000);
            validateForm();
        });
    }

    if (boardTypeSelect) {
        boardTypeSelect.addEventListener('change', function() {
            togglePieceFields();
            validateForm();
        });
    }

    getPieceInputs().forEach((input) => {
        const handlePieceInputChange = () => {
            setMinimumPieceDateTime();
            updatePieceRangeOptions();
            validateForm();
        };
        input.addEventListener('input', handlePieceInputChange);
        input.addEventListener('change', handlePieceInputChange);
    });
    updatePieceRangeOptions();
    togglePieceFields();
}

function setupImageUpload() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput) return;

    imageInput.addEventListener('change', function(event) {
        const files = event.target.files;
        const maxNewImageCount = MAX_POST_IMAGE_COUNT - existingImageUrls.length;
        const selectedFiles = Array.from(files);

        if (selectedFiles.some((file) => !isImageFile(file))) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            imageInput.value = '';
            renderImagePreview();
            return;
        }

        if (selectedFiles.length > maxNewImageCount) {
            alert(`현재 기존 이미지를 포함해 최대 ${MAX_POST_IMAGE_COUNT}개까지 업로드할 수 있습니다. (추가 가능: ${Math.max(0, maxNewImageCount)}개)`);
            imageInput.value = '';
            renderImagePreview();
            return;
        }

        renderImagePreview();
    });
}

function renderImagePreview() {
    const previewContainer = document.getElementById('image-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    existingImageUrls.forEach((imageUrl, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview-item';
        previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
        previewDiv.innerHTML = `
            <img src="${sanitizeHTML(imageUrl)}" alt="기존 이미지 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
            <button type="button" onclick="removeExistingImage(${index})" class="remove-image-btn" aria-label="기존 이미지 삭제" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
            <small style="display:block;text-align:center;margin-top:4px;color:#666;">기존 이미지</small>
        `;
        previewContainer.appendChild(previewDiv);
    });

    const files = document.getElementById('image-files')?.files || [];

    Array.from(files).forEach((file, index) => {
        if (!isImageFile(file)) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview-item';
            previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="미리보기 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
                <button type="button" onclick="removeImage(${index})" class="remove-image-btn" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
                <small style="display:block;text-align:center;margin-top:4px;color:#666;">새 이미지</small>
            `;
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

function handlePostSubmitSuccess() {
    window.location.href = '/community';
}

function removeImage(index) {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files) return;

    const dt = new DataTransfer();
    Array.from(imageInput.files).forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });

    imageInput.files = dt.files;
    renderImagePreview();
}

function removeExistingImage(index) {
    existingImageUrls = existingImageUrls.filter((_, i) => i !== index);
    renderImagePreview();
}

function updateCharCount(fieldId, maxLength) {
    const field = document.getElementById(fieldId);
    const counter = document.getElementById(`${fieldId}-count`);

    if (!field || !counter) return;

    const currentLength = field.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.style.color = currentLength > maxLength ? '#dc3545' : '#6c757d';
}

function validateForm() {
    const title = document.getElementById('title');
    const content = document.getElementById('content');
    const submitBtn = document.getElementById('submit-btn');
    if (!title || !content || !submitBtn) return;

    const hasSelectedBoard = isBusinessUser || Boolean(getSelectedBoardType());
    const isValid = hasSelectedBoard &&
        title.value.trim().length > 0 &&
        content.value.trim().length >= 6 &&
        title.value.length <= 255 &&
        buildPieceTemplateContent(content.value.trim()).length <= 1000 &&
        areRequiredPieceFieldsFilled();

    submitBtn.disabled = !isValid || isSubmitting;
}

function readSelectedImagesAsDataUrls() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        return Promise.resolve([]);
    }

    const imageFiles = Array.from(imageInput.files)
        .filter(isImageFile)
        .slice(0, MAX_POST_IMAGE_COUNT - existingImageUrls.length);

    return Promise.all(imageFiles.map(prepareImageForUpload));
}

async function loadPostForEdit() {
    try {
        const response = await APIClient.get(`/posts/${editingPostId}`);
        const post = response.post || response;

        const titleInput = document.getElementById('title');
        const contentInput = document.getElementById('content');

        if (titleInput) titleInput.value = post.title || '';
        if (contentInput) contentInput.value = hydratePieceFieldsFromContent(post.content || '');

        const boardTypeSelect = document.getElementById('board-type');
        if (boardTypeSelect && post.boardType) {
            boardTypeSelect.value = String(post.boardType).toUpperCase();
            togglePieceFields();
        }

        const normalizedImageUrls = Array.isArray(post.imageUrls)
            ? post.imageUrls
            : Array.isArray(post.images)
                ? post.images
                : (post.imageUrl ? [post.imageUrl] : []);

        existingImageUrls = normalizedImageUrls
            .map((url) => String(url || '').trim())
            .filter((url) => url.length > 0)
            .slice(0, MAX_POST_IMAGE_COUNT);
        renderImagePreview();

        updateCharCount('title', 255);
        updateCharCount('content', 1000);

        validateForm();
    } catch (error) {
        console.error('수정할 게시글 로드 실패:', error);
        alert('수정할 게시글을 불러오지 못했습니다.');
        window.location.href = '/';
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const titleValue = document.getElementById('title')?.value.trim() || '';
    const rawContentValue = document.getElementById('content')?.value.trim() || '';
    const contentValue = buildPieceTemplateContent(rawContentValue);
    const submitBtn = document.getElementById('submit-btn');
    const boardTypeSelect = document.getElementById('board-type');
    const boardType = isBusinessUser
        ? 'PROMOTION'
        : getSelectedBoardType();
    const isNotice = false;
    const noticeTargetBoards = [];

    if (!boardType) {
        alert('게시판을 선택해주세요.');
        boardTypeSelect?.focus();
        return;
    }

    if (!titleValue || !rawContentValue) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    if (rawContentValue.length < 6) {
        alert('내용은 최소 6자 이상 입력해주세요.');
        return;
    }

    if (contentValue.length > 1000) {
        alert('조각게시판 작성 양식을 포함해 내용은 1000자 이하로 입력해주세요.');
        return;
    }

    if (!validateNoBlockedExpression(titleValue, '게시글 제목')) {
        return;
    }

    const pieceValidationError = getPieceValidationError();
    if (pieceValidationError) {
        alert(pieceValidationError);
        const invalidPieceInput = getPieceInputs().find((input) => input.dataset.pieceRequired === 'true' && !input.value.trim())
            || document.getElementById('piece-datetime')
            || document.getElementById('piece-capacity-min')
            || document.getElementById('piece-age-min');
        invalidPieceInput?.focus();
        return;
    }

    if (!validateNoBlockedExpression(contentValue, '게시글 내용')) {
        return;
    }

    isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
    }

    try {
        const imageUrls = await readSelectedImagesAsDataUrls();
        const payload = {
            title: titleValue,
            content: contentValue,
            boardType,
            board_type: boardType,
            isNotice,
            noticeType: isNotice ? 'IMPORTANT' : null,
            noticeTargetBoards,
            imageUrls: [...existingImageUrls, ...imageUrls].slice(0, MAX_POST_IMAGE_COUNT)
        };

        if (isEditMode) {
            await APIClient.put(`/posts/${editingPostId}`, payload);
        } else {
            await APIClient.post('/posts', payload);
        }

        alert(isEditMode ? '글이 수정되었습니다!' : '글이 작성되었습니다!');
        handlePostSubmitSuccess();
    } catch (error) {
        console.error('글 작성 에러:', error);
        if (boardType === 'PIECE') {
            logPieceDateTimeComparison('submit-error', parsePieceDateTimeInputValue(document.getElementById('piece-datetime')?.value), error.data?.serverTime);
        }
        if (error.status === 401) {
            alert('로그인이 필요합니다. 다시 로그인해주세요.');
            window.location.href = '/login';
            return;
        }

        alert(error.message || '글 작성 중 오류가 발생했습니다.');
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? '수정' : '등록';
        }
        validateForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreatePost);
} else {
    initCreatePost();
}
