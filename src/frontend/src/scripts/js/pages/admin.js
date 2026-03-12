/**
 * 파일 역할: admin 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let deleteTarget = null;

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
        if (nickname) nickname.textContent = me.nickname;

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

            const isPosts = tab.dataset.tab === 'posts';
            document.getElementById('posts-section')?.classList.toggle('hidden', !isPosts);
            document.getElementById('posts-section')?.classList.toggle('active', isPosts);
            document.getElementById('comments-section')?.classList.toggle('hidden', isPosts);
            document.getElementById('comments-section')?.classList.toggle('active', !isPosts);

            if (isPosts) await loadPosts();
            else await loadComments();
        });
    });

    document.getElementById('posts-retry-btn')?.addEventListener('click', loadPosts);
    document.getElementById('comments-retry-btn')?.addEventListener('click', loadComments);

    document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDelete);
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
                <tr>
                    <td>${comment.id}</td>
                    <td>${sanitizeHTML((comment.content || '').slice(0, 100))}</td>
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

function openDeleteModal(type, id) {
    deleteTarget = { type, id };
    const modal = document.getElementById('delete-modal');
    const title = document.getElementById('delete-modal-title');
    const message = document.getElementById('delete-modal-message');

    if (title) title.textContent = type === 'post' ? '게시글 삭제' : '댓글 삭제';
    if (message) message.textContent = type === 'post' ? '이 게시글을 삭제하시겠습니까?' : '이 댓글을 삭제하시겠습니까?';

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
        } else {
            await APIClient.delete(`/admin/comments/${deleteTarget.id}`);
            await loadComments();
        }
        closeDeleteModal();
    } catch (error) {
        alert(error.message || '삭제에 실패했습니다.');
    }
}
