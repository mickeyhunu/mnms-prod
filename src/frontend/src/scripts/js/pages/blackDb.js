/**
 * 파일 역할: 기업회원 전용 BLACK DB 번호 검색/코멘트 작성 페이지를 초기화하는 스크립트 파일.
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

function formatBlackDbDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function normalizeBlackDbPhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '').slice(0, 11).trim();
}

function enforceBlackDbPhoneInputLimit(event) {
    const input = event?.target;
    if (!input) return;
    input.value = normalizeBlackDbPhoneNumber(input.value);
}

function formatBlackDbPhoneNumber(value) {
    const phoneNumber = normalizeBlackDbPhoneNumber(value);
    if (phoneNumber.length === 11) return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`;
    if (phoneNumber.length === 10) return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    return phoneNumber;
}

function maskRandomBlackDbPhonePart(part) {
    if (!part) return part;
    const index = Math.floor(Math.random() * part.length);
    return `${part.slice(0, index)}*${part.slice(index + 1)}`;
}

function maskBlackDbPhoneNumber(value) {
    const formatted = formatBlackDbPhoneNumber(value);
    const parts = formatted.split('-');
    if (parts.length >= 3) {
        parts[parts.length - 2] = maskRandomBlackDbPhonePart(parts[parts.length - 2]);
        parts[parts.length - 1] = maskRandomBlackDbPhonePart(parts[parts.length - 1]);
        return parts.join('-');
    }
    return formatted.length > 4 ? `${formatted.slice(0, -4)}${maskRandomBlackDbPhonePart(formatted.slice(-4))}` : formatted;
}

function getBlackDbAreaText(item) {
    const region = String(item?.region || '').trim();
    const district = String(item?.district || '').trim();
    if (region && district) return `${region} ${district}`;
    if (region) return region;

    const match = String(item?.comment || '').match(/^\s*\[([^\]\n]{1,12})\]/);
    return match ? match[1].trim() : '';
}

function stripLegacyBlackDbRegionPrefix(comment) {
    return String(comment || '').replace(/^\s*\[[^\]\n]{1,12}\]\s*/, '');
}

function isBlackDbAdminViewer() {
    const user = Auth.getUser();
    return typeof Auth.isAdminAccount === 'function' && Auth.isAdminAccount(user);
}

function updateBlackDbDistrictOptions() {
    const regionSelect = document.getElementById('black-db-comment-region');
    const districtSelect = document.getElementById('black-db-comment-district');
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

function renderBlackDbOverview(comments, searchedPhoneNumber) {
    const overview = document.getElementById('black-db-overview');
    if (!overview) return;

    overview.innerHTML = '';
    overview.classList.toggle('hidden', !searchedPhoneNumber);
    if (!searchedPhoneNumber) return;

    const regions = [...new Set(comments.map((item) => getBlackDbAreaText(item)).filter(Boolean))];
    const latestDate = comments[0]?.createdAt ? formatBlackDbDate(comments[0].createdAt) : '';
    const regionText = regions.length ? regions.slice(0, 6).join(' / ') : '등록된 활동지역 없음';
    const reportSummary = comments.length
        ? `댓글 ${comments.length}개${latestDate ? ` · 최근 제보 ${latestDate}` : ''}`
        : '등록된 댓글이 없습니다.';

    const phone = document.createElement('div');
    phone.className = 'black-db-phone';
    phone.textContent = `📞 ${maskBlackDbPhoneNumber(searchedPhoneNumber)}`;

    const grid = document.createElement('div');
    grid.className = 'black-db-overview-grid';
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

function renderBlackDbComments(comments, searchedPhoneNumber) {
    const list = document.getElementById('black-db-comment-list');
    const empty = document.getElementById('black-db-empty');
    const form = document.getElementById('black-db-comment-form');
    const phoneInput = document.getElementById('black-db-comment-phone');
    if (!list || !empty || !form || !phoneInput) return;

    renderBlackDbOverview(comments, searchedPhoneNumber);
    list.innerHTML = '';
    phoneInput.value = searchedPhoneNumber || '';
    form.classList.toggle('hidden', !searchedPhoneNumber);

    if (!comments.length) {
        empty.classList.remove('hidden');
        empty.textContent = searchedPhoneNumber
            ? '검색된 코멘트가 없습니다. 아래에서 이 번호에 대한 정보를 남겨주세요.'
            : '번호를 검색하면 기업회원들이 남긴 코멘트가 표시됩니다.';
        return;
    }

    empty.classList.add('hidden');
    const heading = document.createElement('li');
    heading.className = 'black-db-comment-heading';
    heading.textContent = '💬 이용자 코멘트';
    list.appendChild(heading);

    const isAdminViewer = isBlackDbAdminViewer();

    comments.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'black-db-comment-item';
        const header = document.createElement('div');
        header.className = 'black-db-comment-header';
        const meta = document.createElement('div');
        meta.className = 'black-db-comment-meta';
        const areaText = getBlackDbAreaText(item);
        meta.textContent = `${areaText ? `[${areaText}] ` : ''}${formatBlackDbDate(item.createdAt)}`;
        const recommendButton = document.createElement('button');
        recommendButton.className = 'black-db-comment-recommend-btn';
        recommendButton.type = 'button';
        recommendButton.dataset.commentId = item.id;
        recommendButton.textContent = `👍 ${Number(item.recommendationCount || 0)}`;
        recommendButton.setAttribute('aria-pressed', item.isRecommendedByMe ? 'true' : 'false');
        if (item.isRecommendedByMe) recommendButton.classList.add('active');

        header.append(meta);
        if (isAdminViewer) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'black-db-comment-delete-btn';
            deleteButton.type = 'button';
            deleteButton.dataset.commentId = item.id;
            deleteButton.textContent = '삭제';
            header.append(deleteButton);
        }

        const content = document.createElement('div');
        content.className = 'black-db-comment-content';
        const body = document.createElement('p');
        body.className = 'black-db-comment-body';
        body.textContent = stripLegacyBlackDbRegionPrefix(item.comment);
        content.append(body, recommendButton);
        li.append(header, content);
        list.appendChild(li);
    });
}

async function searchBlackDbComments(event) {
    event?.preventDefault();
    const input = document.getElementById('black-db-phone-input');
    const status = document.getElementById('black-db-status');
    const phoneNumber = normalizeBlackDbPhoneNumber(input?.value);

    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 11) {
        if (status) status.textContent = '검색할 번호를 7~11자리 숫자로 입력해주세요.';
        renderBlackDbComments([], '');
        return;
    }

    try {
        if (status) status.textContent = '검색 중입니다...';
        const response = await APIClient.get('/black-db/comments', { phoneNumber });
        renderBlackDbComments(response.comments || [], response.phoneNumber || phoneNumber);
        if (status) status.textContent = response.hasComments ? '검색 결과를 확인하세요.' : '정보가 없습니다. 코멘트를 남길 수 있습니다.';
    } catch (error) {
        if (status) status.textContent = error.message || '검색 중 오류가 발생했습니다.';
        renderBlackDbComments([], '');
    }
}

async function recommendBlackDbComment(commentId) {
    if (!commentId) return;
    const status = document.getElementById('black-db-status');

    try {
        const response = await APIClient.post(`/black-db/comments/${encodeURIComponent(commentId)}/recommend`, {});
        const button = document.querySelector(`.black-db-comment-recommend-btn[data-comment-id="${CSS.escape(String(commentId))}"]`);
        if (button) {
            button.textContent = `👍 ${Number(response.recommendationCount || 0)}`;
            button.classList.toggle('active', Boolean(response.isRecommendedByMe));
            button.setAttribute('aria-pressed', response.isRecommendedByMe ? 'true' : 'false');
        }
    } catch (error) {
        if (status) status.textContent = error.message || '코멘트 추천 중 오류가 발생했습니다.';
    }
}

async function deleteBlackDbComment(commentId) {
    if (!commentId || !window.confirm('이 코멘트를 삭제하시겠습니까?')) return;
    const status = document.getElementById('black-db-status');

    try {
        await APIClient.delete(`/black-db/comments/${encodeURIComponent(commentId)}`);
        if (status) status.textContent = '코멘트가 삭제되었습니다.';
        await searchBlackDbComments();
    } catch (error) {
        if (status) status.textContent = error.message || '코멘트 삭제 중 오류가 발생했습니다.';
    }
}

async function submitBlackDbComment(event) {
    event.preventDefault();
    const phoneNumber = normalizeBlackDbPhoneNumber(document.getElementById('black-db-comment-phone')?.value);
    const textarea = document.getElementById('black-db-comment-input');
    const status = document.getElementById('black-db-status');
    const region = String(document.getElementById('black-db-comment-region')?.value || '').trim();
    const district = String(document.getElementById('black-db-comment-district')?.value || '').trim();
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
        await APIClient.post('/black-db/comments', { phoneNumber, region, district, comment });
        if (textarea) textarea.value = '';
        if (status) status.textContent = '코멘트가 등록되었습니다.';
        await searchBlackDbComments();
    } catch (error) {
        if (status) status.textContent = error.message || '코멘트 등록 중 오류가 발생했습니다.';
    }
}

function initBlackDbPage() {
    Auth.updateHeaderUI();
    Auth.bindLogoutButton();

    const user = Auth.getUser();
    if (!Auth.isBusinessAccount(user) && !Auth.isAdminAccount(user)) {
        window.location.href = '/';
        return;
    }

    document.getElementById('black-db-phone-input')?.addEventListener('input', enforceBlackDbPhoneInputLimit);
    document.getElementById('black-db-search-form')?.addEventListener('submit', searchBlackDbComments);
    document.getElementById('black-db-comment-region')?.addEventListener('change', updateBlackDbDistrictOptions);
    document.getElementById('black-db-comment-form')?.addEventListener('submit', submitBlackDbComment);
    document.getElementById('black-db-comment-list')?.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.black-db-comment-delete-btn');
        if (deleteButton) {
            deleteBlackDbComment(deleteButton.dataset.commentId);
            return;
        }

        const button = event.target.closest('.black-db-comment-recommend-btn');
        if (!button) return;
        recommendBlackDbComment(button.dataset.commentId);
    });
    updateBlackDbDistrictOptions();
    renderBlackDbComments([], '');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlackDbPage);
} else {
    initBlackDbPage();
}
