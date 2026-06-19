/**
 * 파일 역할: 기업회원 전용 BLACK DB 번호 검색/코멘트 작성 페이지를 초기화하는 스크립트 파일.
 */
function formatBlackDbDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function normalizeBlackDbPhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '').trim();
}

function renderBlackDbComments(comments, searchedPhoneNumber) {
    const list = document.getElementById('black-db-comment-list');
    const empty = document.getElementById('black-db-empty');
    const form = document.getElementById('black-db-comment-form');
    const phoneInput = document.getElementById('black-db-comment-phone');
    if (!list || !empty || !form || !phoneInput) return;

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
    comments.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'black-db-comment-item';
        const meta = document.createElement('div');
        meta.className = 'black-db-comment-meta';
        meta.textContent = `${item.authorNickname || '기업회원'} · ${formatBlackDbDate(item.createdAt)}`;
        const body = document.createElement('p');
        body.className = 'black-db-comment-body';
        body.textContent = item.comment || '';
        li.append(meta, body);
        list.appendChild(li);
    });
}

async function searchBlackDbComments(event) {
    event?.preventDefault();
    const input = document.getElementById('black-db-phone-input');
    const status = document.getElementById('black-db-status');
    const phoneNumber = normalizeBlackDbPhoneNumber(input?.value);

    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 20) {
        if (status) status.textContent = '검색할 번호를 7~20자리 숫자로 입력해주세요.';
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

    document.getElementById('black-db-search-form')?.addEventListener('submit', searchBlackDbComments);
    document.getElementById('black-db-comment-form')?.addEventListener('submit', submitBlackDbComment);
    renderBlackDbComments([], '');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlackDbPage);
} else {
    initBlackDbPage();
}
