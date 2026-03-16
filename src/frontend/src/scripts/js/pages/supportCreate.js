/**
 * 파일 역할: 관리자 공지/FAQ 작성 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;

function initSupportCreatePage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindSupportCreateEvents();
    validateSupportForm();
    Auth.bindLogoutButton();
    fillUserInfo();
}

async function fillUserInfo() {
    try {
        const me = await APIClient.get('/auth/me');
        if (!me.isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);
    } catch (error) {
        alert('관리자 권한 확인에 실패했습니다.');
        window.location.href = '/admin';
    }
}

function bindSupportCreateEvents() {
    const form = document.getElementById('support-post-form');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');

    form?.addEventListener('submit', submitSupportPost);
    titleInput?.addEventListener('input', validateSupportForm);
    contentInput?.addEventListener('input', validateSupportForm);
}

function validateSupportForm() {
    const title = document.getElementById('title')?.value?.trim() || '';
    const content = document.getElementById('content')?.value?.trim() || '';
    const submitBtn = document.getElementById('submit-btn');
    if (!submitBtn) return;

    submitBtn.disabled = isSubmitting || !title || content.length < 10;
}

async function submitSupportPost(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const category = document.getElementById('support-form-category')?.value || 'NOTICE';
    const title = document.getElementById('title')?.value?.trim() || '';
    const content = document.getElementById('content')?.value?.trim() || '';
    const submitBtn = document.getElementById('submit-btn');

    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }

    if (content.length < 10) {
        alert('내용은 최소 10자 이상 입력해주세요.');
        return;
    }

    try {
        isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '등록 중...';
        }

        await APIClient.post('/admin/support', { category, title, content });
        alert('공지/FAQ 글이 등록되었습니다.');
        window.location.href = '/admin';
    } catch (error) {
        alert(error.message || '공지/FAQ 등록에 실패했습니다.');
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.textContent = '등록';
        }
        validateSupportForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportCreatePage);
} else {
    initSupportCreatePage();
}
