/**
 * 파일 역할: 기업회원 전용 밤치트 번호 검색/코멘트 작성 페이지를 초기화하는 스크립트 파일.
 */
const BAMCHEAT_ACCESS_CODE = 'blackcode';
const BAMCHEAT_ACCESS_STORAGE_KEY = 'mnmsBamcheatAccessCode';

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

function isBamcheatPrivilegedUser(user = Auth.getUser()) {
    return Auth.isBusinessAccount(user) || Auth.isAdminAccount(user);
}

function getStoredBamcheatAccessCode() {
    return window.sessionStorage?.getItem(BAMCHEAT_ACCESS_STORAGE_KEY) || '';
}

function hasBamcheatCodeAccess() {
    return getStoredBamcheatAccessCode() === BAMCHEAT_ACCESS_CODE;
}

function canAccessBamcheat() {
    return isBamcheatPrivilegedUser() || hasBamcheatCodeAccess();
}

function appendBamcheatAccessCode(params = {}) {
    if (isBamcheatPrivilegedUser()) return params;
    const accessCode = getStoredBamcheatAccessCode();
    return accessCode ? { ...params, accessCode } : params;
}

function withBamcheatAccessCode(data = {}) {
    if (isBamcheatPrivilegedUser()) return data;
    const accessCode = getStoredBamcheatAccessCode();
    return accessCode ? { ...data, accessCode } : data;
}

function updateBamcheatAccessView() {
    const canAccess = canAccessBamcheat();
    document.getElementById('bamcheat-access-card')?.classList.toggle('hidden', canAccess);
    document.getElementById('bamcheat-content-card')?.classList.toggle('hidden', !canAccess);
    return canAccess;
}

function submitBamcheatAccessCode(event) {
    event.preventDefault();
    const input = document.getElementById('bamcheat-access-code-input');
    const status = document.getElementById('bamcheat-access-status');
    const code = String(input?.value || '').trim();

    if (code !== BAMCHEAT_ACCESS_CODE) {
        if (status) status.textContent = '접근 코드가 올바르지 않습니다.';
        return;
    }

    window.sessionStorage?.setItem(BAMCHEAT_ACCESS_STORAGE_KEY, code);
    if (status) status.textContent = '';
    updateBamcheatAccessView();
}

function formatBamcheatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function normalizeBamcheatPhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '').slice(0, 11).trim();
}

function enforceBamcheatPhoneInputLimit(event) {
    const input = event?.target;
    if (!input) return;
    input.value = normalizeBamcheatPhoneNumber(input.value);
}

function formatBamcheatPhoneNumber(value) {
    const phoneNumber = normalizeBamcheatPhoneNumber(value);
    if (phoneNumber.length === 11) return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`;
    if (phoneNumber.length === 10) return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    return phoneNumber;
}

function maskRandomBamcheatPhonePart(part) {
    if (!part) return part;
    const index = Math.floor(Math.random() * part.length);
    return `${part.slice(0, index)}*${part.slice(index + 1)}`;
}

function maskBamcheatPhoneNumber(value) {
    const formatted = formatBamcheatPhoneNumber(value);
    const parts = formatted.split('-');
    if (parts.length >= 3) {
        parts[parts.length - 2] = maskRandomBamcheatPhonePart(parts[parts.length - 2]);
        parts[parts.length - 1] = maskRandomBamcheatPhonePart(parts[parts.length - 1]);
        return parts.join('-');
    }
    return formatted.length > 4 ? `${formatted.slice(0, -4)}${maskRandomBamcheatPhonePart(formatted.slice(-4))}` : formatted;
}

function getBamcheatAreaText(item) {
    const region = String(item?.region || '').trim();
    const district = String(item?.district || '').trim();
    if (region && district) return `${region} ${district}`;
    if (region) return region;

    const match = String(item?.comment || '').match(/^\s*\[([^\]\n]{1,12})\]/);
    return match ? match[1].trim() : '';
}

function stripLegacyBamcheatRegionPrefix(comment) {
    return String(comment || '').replace(/^\s*\[[^\]\n]{1,12}\]\s*/, '');
}

function isBamcheatAdminViewer() {
    const user = Auth.getUser();
    return typeof Auth.isAdminAccount === 'function' && Auth.isAdminAccount(user);
}

function updateBamcheatDistrictOptions() {
    const regionSelect = document.getElementById('bamcheat-comment-region');
    const districtSelect = document.getElementById('bamcheat-comment-district');
    if (!regionSelect || !districtSelect) return;

    const districts = REGION_DISTRICT_MAP[regionSelect.value] || [];
    districtSelect.innerHTML = '<option value="">구/군 선택</option>';
    districts.forEach((district) => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
    districtSelect.disabled = !districts.length;
}

function renderBamcheatOverview(comments, searchedPhoneNumber) {
    const overview = document.getElementById('bamcheat-overview');
    if (!overview) return;

    overview.innerHTML = '';
    overview.classList.toggle('hidden', !searchedPhoneNumber);
    if (!searchedPhoneNumber) return;

    const regions = [...new Set(comments.map((item) => getBamcheatAreaText(item)).filter(Boolean))];
    const latestDate = comments[0]?.createdAt ? formatBamcheatDate(comments[0].createdAt) : '';
    const regionText = regions.length ? regions.slice(0, 6).join(' / ') : '등록된 활동지역 없음';
    const reportSummary = comments.length
        ? `댓글 ${comments.length}개${latestDate ? ` · 최근 제보 ${latestDate}` : ''}`
        : '등록된 댓글이 없습니다.';

    const phone = document.createElement('div');
    phone.className = 'bamcheat-phone';
    phone.textContent = `📞 ${maskBamcheatPhoneNumber(searchedPhoneNumber)}`;

    const grid = document.createElement('div');
    grid.className = 'bamcheat-overview-grid';
    [
        ['📍 활동지역', regionText],
        ['📝 제보 요약', reportSummary]
    ].forEach(([labelText, valueText, valueClass]) => {
        const item = document.createElement('div');
        const label = document.createElement('span');
        label.textContent = labelText;
        const value = document.createElement('strong');
        value.textContent = valueText;
        if (valueClass) value.className = valueClass;
        item.append(label, value);
        grid.appendChild(item);
    });
    overview.append(phone, grid);
}

function renderBamcheatComments(comments, searchedPhoneNumber) {
    const list = document.getElementById('bamcheat-comment-list');
    const empty = document.getElementById('bamcheat-empty');
    const form = document.getElementById('bamcheat-comment-form');
    const phoneInput = document.getElementById('bamcheat-comment-phone');
    const resultHeading = document.getElementById('bamcheat-result-heading');
    const commentHeading = document.getElementById('bamcheat-comment-heading');
    if (!list || !empty || !form || !phoneInput) return;

    renderBamcheatOverview(comments, searchedPhoneNumber);
    if (resultHeading) resultHeading.classList.toggle('hidden', !searchedPhoneNumber);
    if (commentHeading) commentHeading.classList.add('hidden');
    list.innerHTML = '';
    phoneInput.value = searchedPhoneNumber || '';
    const canWriteComment = Boolean(Auth.getUser() && Auth.isAuthenticated());
    form.classList.toggle('hidden', !searchedPhoneNumber || !canWriteComment);

    if (!comments.length) {
        empty.classList.remove('hidden');
        empty.textContent = searchedPhoneNumber
            ? (canWriteComment ? '검색된 코멘트가 없습니다. 아래에서 이 번호에 대한 정보를 남겨주세요.' : '검색된 코멘트가 없습니다. 코멘트 등록은 로그인 후 이용할 수 있습니다.')
            : '번호를 검색하면 코멘트가 표시됩니다.';
        return;
    }

    empty.classList.add('hidden');
    if (commentHeading) commentHeading.classList.remove('hidden');

    const isAdminViewer = isBamcheatAdminViewer();

    comments.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'bamcheat-comment-item';
        const header = document.createElement('div');
        header.className = 'bamcheat-comment-header';
        const meta = document.createElement('div');
        meta.className = 'bamcheat-comment-meta';
        const areaText = getBamcheatAreaText(item);
        meta.textContent = `${areaText ? `[${areaText}] ` : ''}${formatBamcheatDate(item.createdAt)}`;
        const recommendButton = document.createElement('button');
        recommendButton.className = 'bamcheat-comment-recommend-btn';
        recommendButton.type = 'button';
        recommendButton.dataset.commentId = item.id;
        recommendButton.textContent = `👍 ${Number(item.recommendationCount || 0)}`;
        recommendButton.setAttribute('aria-pressed', item.isRecommendedByMe ? 'true' : 'false');
        if (item.isRecommendedByMe) recommendButton.classList.add('active');

        header.append(meta);
        if (isAdminViewer) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'bamcheat-comment-delete-btn';
            deleteButton.type = 'button';
            deleteButton.dataset.commentId = item.id;
            deleteButton.textContent = '삭제';
            header.append(deleteButton);
        }

        const content = document.createElement('div');
        content.className = 'bamcheat-comment-content';
        const body = document.createElement('p');
        body.className = 'bamcheat-comment-body';
        body.textContent = stripLegacyBamcheatRegionPrefix(item.comment);
        if (!Auth.getUser() || !Auth.isAuthenticated()) {
            recommendButton.disabled = true;
            recommendButton.title = '로그인 후 추천할 수 있습니다.';
        }
        content.append(body, recommendButton);
        li.append(header, content);
        list.appendChild(li);
    });
}

async function searchBamcheatComments(event) {
    event?.preventDefault();
    const input = document.getElementById('bamcheat-phone-input');
    const status = document.getElementById('bamcheat-status');
    const phoneNumber = normalizeBamcheatPhoneNumber(input?.value);

    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 11) {
        if (status) status.textContent = '검색할 번호를 7~11자리 숫자로 입력해주세요.';
        renderBamcheatComments([], '');
        return;
    }

    try {
        if (status) status.textContent = '검색 중입니다...';
        const response = await APIClient.get('/bamcheat/comments', appendBamcheatAccessCode({ phoneNumber }));
        renderBamcheatComments(response.comments || [], response.phoneNumber || phoneNumber);
        if (status) status.textContent = response.hasComments ? '검색 결과를 확인하세요.' : '정보가 없습니다. 코멘트를 남길 수 있습니다.';
    } catch (error) {
        if (status) status.textContent = error.message || '검색 중 오류가 발생했습니다.';
        renderBamcheatComments([], '');
    }
}

async function recommendBamcheatComment(commentId) {
    if (!commentId) return;
    const status = document.getElementById('bamcheat-status');

    try {
        const response = await APIClient.post(`/bamcheat/comments/${encodeURIComponent(commentId)}/recommend`, withBamcheatAccessCode({}));
        const button = document.querySelector(`.bamcheat-comment-recommend-btn[data-comment-id="${CSS.escape(String(commentId))}"]`);
        if (button) {
            button.textContent = `👍 ${Number(response.recommendationCount || 0)}`;
            button.classList.toggle('active', Boolean(response.isRecommendedByMe));
            button.setAttribute('aria-pressed', response.isRecommendedByMe ? 'true' : 'false');
        }
    } catch (error) {
        if (status) status.textContent = error.message || '코멘트 추천 중 오류가 발생했습니다.';
    }
}

async function deleteBamcheatComment(commentId) {
    if (!commentId || !window.confirm('이 코멘트를 삭제하시겠습니까?')) return;
    const status = document.getElementById('bamcheat-status');

    try {
        await APIClient.delete(`/bamcheat/comments/${encodeURIComponent(commentId)}`, withBamcheatAccessCode({}));
        if (status) status.textContent = '코멘트가 삭제되었습니다.';
        await searchBamcheatComments();
    } catch (error) {
        if (status) status.textContent = error.message || '코멘트 삭제 중 오류가 발생했습니다.';
    }
}

async function submitBamcheatComment(event) {
    event.preventDefault();
    const phoneNumber = normalizeBamcheatPhoneNumber(document.getElementById('bamcheat-comment-phone')?.value);
    const textarea = document.getElementById('bamcheat-comment-input');
    const status = document.getElementById('bamcheat-status');
    const region = String(document.getElementById('bamcheat-comment-region')?.value || '').trim();
    const district = String(document.getElementById('bamcheat-comment-district')?.value || '').trim();
    const comment = String(textarea?.value || '').trim();

    if (!region || !REGION_DISTRICT_MAP[region]) {
        if (status) status.textContent = '활동 시/도를 선택해주세요.';
        return;
    }
    if (!district || !REGION_DISTRICT_MAP[region].includes(district)) {
        if (status) status.textContent = '활동 구/군을 선택해주세요.';
        return;
    }

    if (!comment) {
        if (status) status.textContent = '코멘트를 입력해주세요.';
        return;
    }

    try {
        await APIClient.post('/bamcheat/comments', withBamcheatAccessCode({ phoneNumber, region, district, comment }));
        if (textarea) textarea.value = '';
        if (status) status.textContent = '코멘트가 등록되었습니다.';
        await searchBamcheatComments();
    } catch (error) {
        if (status) status.textContent = error.message || '코멘트 등록 중 오류가 발생했습니다.';
    }
}

function initBamcheatPage() {
    Auth.updateHeaderUI();
    Auth.bindLogoutButton();

    document.getElementById('bamcheat-access-form')?.addEventListener('submit', submitBamcheatAccessCode);
    updateBamcheatAccessView();

    document.getElementById('bamcheat-phone-input')?.addEventListener('input', enforceBamcheatPhoneInputLimit);
    document.getElementById('bamcheat-search-form')?.addEventListener('submit', searchBamcheatComments);
    document.getElementById('bamcheat-comment-region')?.addEventListener('change', updateBamcheatDistrictOptions);
    document.getElementById('bamcheat-comment-form')?.addEventListener('submit', submitBamcheatComment);
    document.getElementById('bamcheat-comment-list')?.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.bamcheat-comment-delete-btn');
        if (deleteButton) {
            deleteBamcheatComment(deleteButton.dataset.commentId);
            return;
        }

        const button = event.target.closest('.bamcheat-comment-recommend-btn');
        if (!button) return;
        recommendBamcheatComment(button.dataset.commentId);
    });
    updateBamcheatDistrictOptions();
    renderBamcheatComments([], '');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBamcheatPage);
} else {
    initBamcheatPage();
}
