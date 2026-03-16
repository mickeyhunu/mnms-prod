/**
 * 파일 역할: admin 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let deleteTarget = null;
let supportEditTarget = null;
let currentSupportCategory = 'NOTICE';

document.addEventListener('DOMContentLoaded', initAdminPage);

async function initAdminPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindCommonEvents();

    try {
        const me = await APIClient.get('/auth/me');
        if (!me.isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);

        await loadPosts();
    } catch (error) {
        alert('관리자 권한 확인에 실패했습니다.');
        window.location.href = '/';
    }
}

function bindCommonEvents() {
    Auth.bindLogoutButton();

    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabKey = tab.dataset.tab;
            ['posts', 'comments', 'support'].forEach((key) => {
                const isActive = key === tabKey;
                document.getElementById(`${key}-section`)?.classList.toggle('hidden', !isActive);
                document.getElementById(`${key}-section`)?.classList.toggle('active', isActive);
            });

            if (tabKey === 'posts') await loadPosts();
            else if (tabKey === 'comments') await loadComments();
            else if (tabKey === 'support') await loadSupportArticles();
        });
    });

    document.getElementById('posts-retry-btn')?.addEventListener('click', loadPosts);
    document.getElementById('comments-retry-btn')?.addEventListener('click', loadComments);
    document.getElementById('support-retry-btn')?.addEventListener('click', loadSupportArticles);

    document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDelete);

    document.getElementById('support-category')?.addEventListener('change', async (event) => {
        currentSupportCategory = event.target.value;
        await loadSupportArticles();
    });
    document.getElementById('support-new-btn')?.addEventListener('click', () => openSupportModal());
    document.getElementById('support-cancel-btn')?.addEventListener('click', closeSupportModal);
    document.getElementById('support-save-btn')?.addEventListener('click', saveSupportArticle);
}

async function loadPosts() {
    toggleLoading('posts', true);
    try {
        const response = await APIClient.get('/admin/posts');
        const posts = response.content || [];
        document.getElementById('posts-total').textContent = response.totalElements || posts.length;

        const tbody = document.getElementById('posts-tbody');
        if (!posts.length) {
            tbody.innerHTML = '<tr><td colspan="7">게시글이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = posts.map(post => `
                <tr>
                    <td>${post.id}</td>
                    <td><a href="/post-detail?id=${post.id}" target="_blank">${sanitizeHTML(post.title || '')}</a></td>
                    <td>${sanitizeHTML(post.authorNickname || `사용자#${post.user_id || post.userId}`)}</td>
                    <td>${formatDate(post.createdAt || post.created_at)}</td>
                    <td>${post.likeCount || 0}</td>
                    <td>${post.commentCount || 0}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="openDeleteModal('post', ${post.id})">삭제</button></td>
                </tr>
            `).join('');
        }

        showContent('posts');
    } catch (error) {
        showError('posts', error.message || '게시글을 불러오지 못했습니다.');
    }
}

async function loadComments() {
    toggleLoading('comments', true);
    try {
        const response = await APIClient.get('/admin/comments');
        const comments = response.content || [];
        document.getElementById('comments-total').textContent = response.totalElements || comments.length;

        const tbody = document.getElementById('comments-tbody');
        if (!comments.length) {
            tbody.innerHTML = '<tr><td colspan="6">댓글이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = comments.map(comment => `
                <tr class="${getAdminCommentRowClass(comment)}">
                    <td>${comment.id}</td>
                    <td>
                        <div class="admin-comment-cell">
                            <div class="admin-comment-flags">${renderAdminCommentFlags(comment)}</div>
                            <div class="admin-comment-text">${sanitizeHTML((comment.content || '').slice(0, 100))}</div>
                        </div>
                    </td>
                    <td><a href="/post-detail?id=${comment.postId || comment.post_id}" target="_blank">게시글 보기</a></td>
                    <td>${sanitizeHTML(comment.authorNickname || `사용자#${comment.user_id || comment.userId}`)}</td>
                    <td>${formatDate(comment.createdAt || comment.created_at)}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="openDeleteModal('comment', ${comment.id})">삭제</button></td>
                </tr>
            `).join('');
        }

        showContent('comments');
    } catch (error) {
        showError('comments', error.message || '댓글을 불러오지 못했습니다.');
    }
}

async function loadSupportArticles() {
    toggleLoading('support', true);
    try {
        const response = await APIClient.get('/admin/support', { category: currentSupportCategory });
        const rows = response.content || [];
        document.getElementById('support-total').textContent = response.totalElements || rows.length;

        const tbody = document.getElementById('support-tbody');
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="5">등록된 글이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = rows.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.category === 'NOTICE' ? '공지사항' : 'FAQ'}</td>
                    <td>${sanitizeHTML(item.title || '')}</td>
                    <td>${formatDate(item.createdAt || item.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="openSupportModal(${item.sourceId || item.id}, '${item.sourceType || 'SUPPORT'}')">수정</button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteModal('support', ${item.sourceId || item.id}, '${item.sourceType || 'SUPPORT'}')">삭제</button>
                    </td>
                </tr>
            `).join('');
        }

        showContent('support');
    } catch (error) {
        showError('support', error.message || '공지/FAQ를 불러오지 못했습니다.');
    }
}

async function openSupportModal(id = null, sourceType = 'SUPPORT') {
    supportEditTarget = null;
    const titleEl = document.getElementById('support-modal-title');
    const categoryEl = document.getElementById('support-form-category');
    const subjectEl = document.getElementById('support-form-title');
    const contentEl = document.getElementById('support-form-content');

    if (!categoryEl || !subjectEl || !contentEl) return;

    if (!id) {
        titleEl.textContent = '공지/FAQ 작성';
        categoryEl.value = currentSupportCategory;
        subjectEl.value = '';
        contentEl.value = '';
    } else {
        const response = await APIClient.get('/admin/support', { category: currentSupportCategory });
        const target = (response.content || []).find((item) => Number(item.sourceId || item.id) === Number(id) && String(item.sourceType || 'SUPPORT') === String(sourceType || 'SUPPORT'));
        if (!target) {
            alert('글을 찾을 수 없습니다.');
            return;
        }

        supportEditTarget = { id: Number(target.sourceId || target.id), sourceType: String(target.sourceType || 'SUPPORT') };
        titleEl.textContent = '공지/FAQ 수정';
        categoryEl.value = target.category;
        subjectEl.value = target.title || '';
        contentEl.value = target.content || '';
    }

    document.getElementById('support-modal')?.classList.remove('hidden');
}

function closeSupportModal() {
    supportEditTarget = null;
    document.getElementById('support-modal')?.classList.add('hidden');
}

async function saveSupportArticle() {
    const category = document.getElementById('support-form-category')?.value;
    const title = document.getElementById('support-form-title')?.value?.trim();
    const content = document.getElementById('support-form-content')?.value?.trim();

    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }

    try {
        if (supportEditTarget) {
            await APIClient.put(`/admin/support/${supportEditTarget.id}?sourceType=${encodeURIComponent(supportEditTarget.sourceType)}`, { category, title, content, sourceType: supportEditTarget.sourceType });
        } else {
            await APIClient.post('/admin/support', { category, title, content });
        }

        currentSupportCategory = category;
        const categorySelect = document.getElementById('support-category');
        if (categorySelect) categorySelect.value = category;

        closeSupportModal();
        await loadSupportArticles();
    } catch (error) {
        alert(error.message || '저장에 실패했습니다.');
    }
}

function renderAdminCommentFlags(comment) {
    const flags = [];
    if (isDeletedComment(comment)) {
        flags.push('<span class="admin-comment-flag deleted">삭제됨</span>');
    }
    if (isSecretComment(comment)) {
        flags.push('<span class="admin-comment-flag secret">비밀댓글</span>');
    }
    return flags.join('');
}

function getAdminCommentRowClass(comment) {
    const classes = [];
    if (isDeletedComment(comment)) classes.push('admin-comment-row-deleted');
    if (isSecretComment(comment)) classes.push('admin-comment-row-secret');
    return classes.join(' ');
}

function isDeletedComment(comment) {
    return Boolean(comment.isDeleted || comment.is_deleted);
}

function isSecretComment(comment) {
    return Boolean(comment.isSecret || comment.is_secret);
}

function toggleLoading(prefix, isLoading) {
    document.getElementById(`${prefix}-loading`)?.classList.toggle('hidden', !isLoading);
    document.getElementById(`${prefix}-error`)?.classList.add('hidden');
    if (isLoading) {
        document.getElementById(`${prefix}-content`)?.classList.add('hidden');
    }
}

function showContent(prefix) {
    document.getElementById(`${prefix}-loading`)?.classList.add('hidden');
    document.getElementById(`${prefix}-error`)?.classList.add('hidden');
    document.getElementById(`${prefix}-content`)?.classList.remove('hidden');
}

function showError(prefix, message) {
    document.getElementById(`${prefix}-loading`)?.classList.add('hidden');
    document.getElementById(`${prefix}-content`)?.classList.add('hidden');
    const errorBox = document.getElementById(`${prefix}-error`);
    const errorMessage = document.getElementById(`${prefix}-error-message`);
    if (errorMessage) errorMessage.textContent = message;
    if (errorBox) errorBox.classList.remove('hidden');
}

function openDeleteModal(type, id, sourceType = 'SUPPORT') {
    deleteTarget = { type, id, sourceType };
    const modal = document.getElementById('delete-modal');
    const title = document.getElementById('delete-modal-title');
    const message = document.getElementById('delete-modal-message');

    if (type === 'post') {
        if (title) title.textContent = '게시글 삭제';
        if (message) message.textContent = '이 게시글을 삭제하시겠습니까?';
    } else if (type === 'comment') {
        if (title) title.textContent = '댓글 삭제';
        if (message) message.textContent = '이 댓글을 삭제하시겠습니까?';
    } else {
        if (title) title.textContent = '공지/FAQ 삭제';
        if (message) message.textContent = '이 글을 삭제하시겠습니까?';
    }

    modal?.classList.remove('hidden');
}

function closeDeleteModal() {
    deleteTarget = null;
    document.getElementById('delete-modal')?.classList.add('hidden');
}

async function confirmDelete() {
    if (!deleteTarget) return;

    try {
        if (deleteTarget.type === 'post') {
            await APIClient.delete(`/admin/posts/${deleteTarget.id}`);
            await loadPosts();
        } else if (deleteTarget.type === 'comment') {
            await APIClient.delete(`/admin/comments/${deleteTarget.id}`);
            await loadComments();
        } else {
            await APIClient.delete(`/admin/support/${deleteTarget.id}?sourceType=${encodeURIComponent(deleteTarget.sourceType || 'SUPPORT')}`);
            await loadSupportArticles();
        }
        closeDeleteModal();
    } catch (error) {
        alert(error.message || '삭제에 실패했습니다.');
    }
}
