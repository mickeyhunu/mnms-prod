/**
 * 파일 역할: admin 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let deleteTarget = null;
let supportEditTarget = null;
let currentSupportCategory = 'NOTICE';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    initAdminPage();
}

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
            ['posts', 'comments', 'users', 'ads', 'support'].forEach((key) => {
                const isActive = key === tabKey;
                document.getElementById(`${key}-section`)?.classList.toggle('hidden', !isActive);
                document.getElementById(`${key}-section`)?.classList.toggle('active', isActive);
            });

            if (tabKey === 'posts') await loadPosts();
            else if (tabKey === 'comments') await loadComments();
            else if (tabKey === 'users') await loadUsers();
            else if (tabKey === 'ads') await loadAds();
            else if (tabKey === 'support') await loadSupportArticles();
        });
    });

    document.getElementById('posts-retry-btn')?.addEventListener('click', loadPosts);
    document.getElementById('comments-retry-btn')?.addEventListener('click', loadComments);
    document.getElementById('users-retry-btn')?.addEventListener('click', loadUsers);
    document.getElementById('ads-retry-btn')?.addEventListener('click', loadAds);
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

    document.getElementById('ads-new-btn')?.addEventListener('click', () => openAdEditor());

    document.getElementById('posts-tbody')?.addEventListener('click', handleAdminTableActionClick);
    document.getElementById('comments-tbody')?.addEventListener('click', handleAdminTableActionClick);
    document.getElementById('users-tbody')?.addEventListener('click', handleAdminTableActionClick);
    document.getElementById('ads-tbody')?.addEventListener('click', handleAdminTableActionClick);
    document.getElementById('support-tbody')?.addEventListener('click', handleAdminTableActionClick);
}

async function loadPosts() {
    toggleLoading('posts', true);
    try {
        const response = await APIClient.get('/admin/posts');
        const posts = response.content || [];
        const postsTotal = document.getElementById('posts-total');
        if (postsTotal) postsTotal.textContent = response.totalElements || posts.length;

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
                    <td><button class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="post" data-target-id="${post.id}">삭제</button></td>
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
        const commentsTotal = document.getElementById('comments-total');
        if (commentsTotal) commentsTotal.textContent = response.totalElements || comments.length;

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
                    <td><button class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="comment" data-target-id="${comment.id}">삭제</button></td>
                </tr>
            `).join('');
        }

        showContent('comments');
    } catch (error) {
        showError('comments', error.message || '댓글을 불러오지 못했습니다.');
    }
}

async function loadUsers() {
    toggleLoading('users', true);
    try {
        const response = await APIClient.get('/admin/users');
        const users = response.content || [];
        const usersTotal = document.getElementById('users-total');
        if (usersTotal) usersTotal.textContent = response.totalElements || users.length;

        const tbody = document.getElementById('users-tbody');
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="8">회원이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${sanitizeHTML(user.email || '')}</td>
                    <td>${sanitizeHTML(user.nickname || '')}</td>
                    <td>${Number(user.totalPoints || 0)}</td>
                    <td>${formatDate(user.createdAt || user.created_at)}</td>
                    <td>
                        <select id="user-role-${user.id}" class="form-control admin-inline-select">
                            <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>USER</option>
                            <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                        </select>
                    </td>
                    <td>${user.isCurrentUser ? '내 계정' : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" data-admin-action="save-user-role" data-target-id="${user.id}">권한저장</button>
                        <button class="btn btn-sm btn-danger" ${user.isCurrentUser ? 'disabled' : ''} data-admin-action="delete" data-target-type="user" data-target-id="${user.id}">삭제</button>
                    </td>
                </tr>
            `).join('');
        }

        showContent('users');
    } catch (error) {
        showError('users', error.message || '회원 목록을 불러오지 못했습니다.');
    }
}

async function updateUserRole(userId) {
    const role = document.getElementById(`user-role-${userId}`)?.value;
    if (!role) return;

    try {
        await APIClient.patch(`/admin/users/${userId}/role`, { role });
        await loadUsers();
    } catch (error) {
        alert(error.message || '권한 변경에 실패했습니다.');
    }
}

async function loadAds() {
    toggleLoading('ads', true);
    try {
        const response = await APIClient.get('/admin/ads');
        const ads = response.content || [];
        const adsTotal = document.getElementById('ads-total');
        if (adsTotal) adsTotal.textContent = response.totalElements || ads.length;

        const tbody = document.getElementById('ads-tbody');
        if (!ads.length) {
            tbody.innerHTML = '<tr><td colspan="8">등록된 광고가 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = ads.map(ad => `
                <tr>
                    <td>${ad.id}</td>
                    <td>${sanitizeHTML(ad.title || '')}</td>
                    <td><a href="${sanitizeHTML(normalizeExternalUrl(ad.linkUrl))}" target="_blank" rel="noopener noreferrer">링크 열기</a></td>
                    <td>${Number(ad.displayOrder || 0)}</td>
                    <td>${ad.isActive ? '노출' : '숨김'}</td>
                    <td>${formatDate(ad.createdAt || ad.created_at)}</td>
                    <td>${formatDate(ad.updatedAt || ad.updated_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" data-admin-action="edit-ad" data-target-id="${ad.id}">수정</button>
                        <button class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="ad" data-target-id="${ad.id}">삭제</button>
                    </td>
                </tr>
            `).join('');
        }

        showContent('ads');
    } catch (error) {
        showError('ads', error.message || '광고 목록을 불러오지 못했습니다.');
    }
}

async function openAdEditor(adId = null) {
    let base = { title: '', imageUrl: '', linkUrl: '', displayOrder: 0, isActive: true };

    if (adId) {
        try {
            const response = await APIClient.get('/admin/ads');
            const target = (response.content || []).find((item) => Number(item.id) === Number(adId));
            if (!target) {
                alert('광고를 찾을 수 없습니다.');
                return;
            }
            base = target;
        } catch (error) {
            alert(error.message || '광고 정보를 불러오지 못했습니다.');
            return;
        }
    }

    const title = window.prompt('광고 제목을 입력해주세요.', base.title || '');
    if (title == null || !title.trim()) return;

    const imageUrl = window.prompt('광고 이미지 URL을 입력해주세요.', base.imageUrl || '');
    if (imageUrl == null || !imageUrl.trim()) return;

    const linkUrl = window.prompt('광고 클릭 링크 URL을 입력해주세요.', base.linkUrl || '');
    if (linkUrl == null || !linkUrl.trim()) return;

    const displayOrderRaw = window.prompt('노출 순서를 입력해주세요(숫자).', String(base.displayOrder || 0));
    if (displayOrderRaw == null) return;

    const isActiveRaw = window.prompt('노출 여부를 입력해주세요 (Y/N).', base.isActive ? 'Y' : 'N');
    if (isActiveRaw == null) return;

    if (!isValidExternalUrl(linkUrl.trim())) {
        alert('광고 클릭 링크 URL은 http:// 또는 https:// 형식이어야 합니다.');
        return;
    }

    const payload = {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        displayOrder: Number(displayOrderRaw) || 0,
        isActive: ['y', 'yes', '1', 'true'].includes(String(isActiveRaw).trim().toLowerCase())
    };

    try {
        if (adId) await APIClient.put(`/admin/ads/${adId}`, payload);
        else await APIClient.post('/admin/ads', payload);

        await loadAds();
    } catch (error) {
        alert(error.message || '광고 저장에 실패했습니다.');
    }
}

function isValidExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function normalizeExternalUrl(url) {
    const target = String(url || '').trim();
    return isValidExternalUrl(target) ? target : '#';
}

async function loadSupportArticles() {
    toggleLoading('support', true);
    try {
        const response = await APIClient.get('/admin/support', { category: currentSupportCategory });
        const articles = response.content || [];
        const supportTotal = document.getElementById('support-total');
        if (supportTotal) supportTotal.textContent = response.totalElements || articles.length;

        const tbody = document.getElementById('support-tbody');
        if (!articles.length) {
            tbody.innerHTML = '<tr><td colspan="5">등록된 글이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = articles.map(article => `
                <tr>
                    <td>${article.id}</td>
                    <td>${article.category === 'FAQ' ? 'FAQ' : '공지사항'}</td>
                    <td>${sanitizeHTML(article.title || '')}</td>
                    <td>${formatDate(article.createdAt || article.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" data-admin-action="edit-support" data-target-id="${article.sourceId || article.id}" data-source-type="${article.sourceType || 'SUPPORT'}">수정</button>
                        <button class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="support" data-target-id="${article.sourceId || article.id}" data-source-type="${article.sourceType || 'SUPPORT'}">삭제</button>
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
    const titleEl = document.getElementById('support-modal-title');
    const categoryEl = document.getElementById('support-form-category');
    const subjectEl = document.getElementById('support-form-title');
    const contentEl = document.getElementById('support-form-content');

    if (!categoryEl || !subjectEl || !contentEl) return;

    if (!id) {
        supportEditTarget = null;
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

async function handleAdminTableActionClick(event) {
    const actionElement = event.target.closest('[data-admin-action]');
    if (!actionElement || actionElement.disabled) return;

    event.preventDefault();

    const action = actionElement.dataset.adminAction;
    const targetIdRaw = actionElement.dataset.targetId;
    const targetId = Number.parseInt(targetIdRaw, 10);
    const targetType = actionElement.dataset.targetType;
    const sourceType = actionElement.dataset.sourceType || 'SUPPORT';

    if (action === 'delete' && Number.isInteger(targetId) && targetType) {
        openDeleteModal(targetType, targetId, sourceType);
        return;
    }

    if (action === 'edit-ad' && Number.isInteger(targetId)) {
        await openAdEditor(targetId);
        return;
    }

    if (action === 'edit-support' && Number.isInteger(targetId)) {
        await openSupportModal(targetId, sourceType);
        return;
    }

    if (action === 'save-user-role' && Number.isInteger(targetId)) {
        await updateUserRole(targetId);
        return;
    }

    if (['delete', 'edit-ad', 'edit-support', 'save-user-role'].includes(action) && !Number.isInteger(targetId)) {
        alert('대상 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
    }
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
    } else if (type === 'user') {
        if (title) title.textContent = '회원 삭제';
        if (message) message.textContent = '이 회원을 삭제하시겠습니까?';
    } else if (type === 'ad') {
        if (title) title.textContent = '광고 삭제';
        if (message) message.textContent = '이 광고를 삭제하시겠습니까?';
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
        } else if (deleteTarget.type === 'user') {
            await APIClient.delete(`/admin/users/${deleteTarget.id}`);
            await loadUsers();
        } else if (deleteTarget.type === 'ad') {
            await APIClient.delete(`/admin/ads/${deleteTarget.id}`);
            await loadAds();
        } else {
            await APIClient.delete(`/admin/support/${deleteTarget.id}?sourceType=${encodeURIComponent(deleteTarget.sourceType || 'SUPPORT')}`);
            await loadSupportArticles();
        }
        closeDeleteModal();
    } catch (error) {
        alert(error.message || '삭제에 실패했습니다.');
    }
}
