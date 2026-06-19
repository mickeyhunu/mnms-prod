/**
 * 파일 역할: 기업회원 전용 BLACK DB 번호 검색/코멘트 작성 페이지를 초기화하는 스크립트 파일.
 */
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

function extractBlackDbRegion(comment) {
    const match = String(comment || '').match(/^\s*\[([^\]\n]{1,12})\]/);
    return match ? match[1].trim() : '';
}

function buildBlackDbSummary(comments) {
    const reportWords = ['주의', '신고', '먹튀', '노쇼', '연락 두절', '잠수', '문제', '피해', '차단'];
    const normalWords = ['정상', '문제 없', '문제없', '좋았', '괜찮', '안전'];
    const reportCount = comments.filter((item) => reportWords.some((word) => String(item.comment || '').includes(word))).length;
    const normalCount = comments.filter((item) => normalWords.some((word) => String(item.comment || '').includes(word))).length;
    const explicitReportCount = comments.filter((item) => String(item.comment || '').includes('신고')).length;
    let caution = { label: '확인 필요', emoji: '🟡', className: 'is-check' };

    if (comments.length >= 5 && explicitReportCount >= 3) {
        caution = { label: '신고 누적', emoji: '⚫', className: 'is-reported' };
    } else if (reportCount >= 3 || (comments.length >= 3 && reportCount > normalCount)) {
        caution = { label: '주의 제보 많음', emoji: '🔴', className: 'is-warning' };
    } else if (comments.length >= 2 && normalCount > reportCount) {
        caution = { label: '정상 의견 많음', emoji: '🟢', className: 'is-normal' };
    }

    return { caution, reportCount, normalCount };
}

function renderBlackDbOverview(comments, searchedPhoneNumber) {
    const overview = document.getElementById('black-db-overview');
    if (!overview) return;

    overview.innerHTML = '';
    overview.classList.toggle('hidden', !searchedPhoneNumber);
    if (!searchedPhoneNumber) return;

    const regions = [...new Set(comments.map((item) => extractBlackDbRegion(item.comment)).filter(Boolean))];
    const latestDate = comments[0]?.createdAt ? formatBlackDbDate(comments[0].createdAt) : '';
    const summary = buildBlackDbSummary(comments);
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
        ['활동지역', regionText],
        ['제보 요약', reportSummary],
        ['주의도', `${summary.caution.emoji} ${summary.caution.label}`, `black-db-caution ${summary.caution.className}`]
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

    comments.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'black-db-comment-item';
        const meta = document.createElement('div');
        meta.className = 'black-db-comment-meta';
        const region = extractBlackDbRegion(item.comment);
        meta.textContent = `${region ? `[${region}] ` : ''}${formatBlackDbDate(item.createdAt)}`;
        const body = document.createElement('p');
        body.className = 'black-db-comment-body';
        body.textContent = String(item.comment || '').replace(/^\s*\[[^\]\n]{1,12}\]\s*/, '');
        li.append(meta, body);
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

async function submitBlackDbComment(event) {
    event.preventDefault();
    const phoneNumber = normalizeBlackDbPhoneNumber(document.getElementById('black-db-comment-phone')?.value);
    const textarea = document.getElementById('black-db-comment-input');
    const status = document.getElementById('black-db-status');
    const comment = String(textarea?.value || '').trim();

    if (!comment) {
        if (status) status.textContent = '코멘트를 입력해주세요.';
        return;
    }

    try {
        await APIClient.post('/black-db/comments', { phoneNumber, comment });
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
    if (!Auth.isBusinessAccount(user)) {
        window.location.href = '/';
        return;
    }

    document.getElementById('black-db-phone-input')?.addEventListener('input', enforceBlackDbPhoneInputLimit);
    document.getElementById('black-db-search-form')?.addEventListener('submit', searchBlackDbComments);
    document.getElementById('black-db-comment-form')?.addEventListener('submit', submitBlackDbComment);
    renderBlackDbComments([], '');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlackDbPage);
} else {
    initBlackDbPage();
}
