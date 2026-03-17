/**
 * 파일 역할: 관리자 공지/FAQ 작성 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;
let editingTarget = null;

function initSupportCreatePage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    applyInitialCategory();
    bindSupportCreateEvents();
    validateSupportForm();
    Auth.bindLogoutButton();
    fillUserInfo();
    loadEditTargetIfNeeded();
}

function getSearchParams() {
    return new URLSearchParams(window.location.search || '');
}

function getInitialSupportCategory() {
    const params = getSearchParams();
    const category = String(params.get('category') || '').toUpperCase();
    return category === 'FAQ' ? 'FAQ' : 'NOTICE';
}

function applyPageTitle(category, isEdit) {
    const heading = document.querySelector('.page-header h1');
    if (!heading) return;

    if (isEdit) {
        heading.textContent = category === 'FAQ' ? 'FAQ 글 수정' : '공지사항 글 수정';
        return;
    }

    heading.textContent = category === 'FAQ' ? 'FAQ 새 글 작성' : '공지사항 새 글 작성';
}

function applyInitialCategory() {
    const category = getInitialSupportCategory();
    const categorySelect = document.getElementById('support-form-category');
    if (categorySelect) categorySelect.value = category;
    applyPageTitle(category, false);
}

async function loadEditTargetIfNeeded() {
    const params = getSearchParams();
    const targetId = Number.parseInt(params.get('id') || '', 10);
    if (!Number.isInteger(targetId)) return;

    const sourceType = String(params.get('sourceType') || 'SUPPORT').toUpperCase() === 'POST' ? 'POST' : 'SUPPORT';

    try {
        const article = await APIClient.get(`/admin/support/article/${targetId}`, { sourceType });
        if (!article) return;

        editingTarget = { id: targetId, sourceType };

        const category = String(article.category || getInitialSupportCategory()).toUpperCase() === 'FAQ' ? 'FAQ' : 'NOTICE';
        const categorySelect = document.getElementById('support-form-category');
        if (categorySelect) categorySelect.value = category;

        const titleInput = document.getElementById('title');
        const contentInput = document.getElementById('content');
        if (titleInput) titleInput.value = article.title || '';
        if (contentInput) contentInput.value = article.content || '';

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.textContent = '수정';

        applyPageTitle(category, true);
        validateSupportForm();
    } catch (error) {
        alert(error.message || '수정할 글 정보를 불러오지 못했습니다.');
        window.location.href = '/admin';
    }
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
            submitBtn.textContent = editingTarget ? '수정 중...' : '등록 중...';
        }

        if (editingTarget) {
            await APIClient.put(`/admin/support/${editingTarget.id}?sourceType=${encodeURIComponent(editingTarget.sourceType)}`, {
                category,
                title,
                content,
                sourceType: editingTarget.sourceType
            });
            alert('공지/FAQ 글이 수정되었습니다.');
        } else {
            await APIClient.post('/admin/support', { category, title, content });
            alert('공지/FAQ 글이 등록되었습니다.');
        }

        window.location.href = '/admin';
    } catch (error) {
        alert(error.message || (editingTarget ? '공지/FAQ 수정에 실패했습니다.' : '공지/FAQ 등록에 실패했습니다.'));
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.textContent = editingTarget ? '수정' : '등록';
        }
        validateSupportForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportCreatePage);
} else {
    initSupportCreatePage();
}
