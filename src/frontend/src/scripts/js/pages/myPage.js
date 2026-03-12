/**
 * 파일 역할: myPage 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let currentUser = null;

document.addEventListener('DOMContentLoaded', initMyPage);

async function initMyPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindTabs();

    try {
        currentUser = await APIClient.get('/auth/me');
        Auth.setUser(currentUser);
        renderHeaderUser(currentUser);

        await Promise.all([
            loadMyPosts(),
            loadMyComments(),
            loadMessages(),
            loadStats()
        ]);
    } catch (error) {
        console.error(error);
        alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
        Auth.logout();
    }
}

function bindTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => {
                p.classList.remove('active');
                p.classList.add('hidden');
            });

            btn.classList.add('active');
            const target = document.getElementById(`${tab}-tab`);
            if (target) {
                target.classList.add('active');
                target.classList.remove('hidden');
            }
        });
    });

    Auth.bindLogoutButton();
}

function renderHeaderUser(user) {
    const nickname = document.getElementById('user-nickname');
    if (nickname) nickname.textContent = user.nickname || user.email;

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        if (user.isAdmin) adminLink.classList.remove('hidden');
        else adminLink.classList.add('hidden');
    }
}

async function loadMyPosts() {
    const container = document.getElementById('my-posts-list');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/posts', { page: 0, size: 100 });
        const posts = (response.content || []).filter(post => Number(post.userId) === Number(currentUser.id));

        if (!posts.length) {
            container.innerHTML = '<div class="no-data">작성한 게시글이 없습니다.</div>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="my-post-card" onclick="location.href='/post-detail?id=${post.id}'" style="cursor:pointer;padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:10px;">
                <div class="post-title"><strong>${sanitizeHTML(post.title)}</strong></div>
                <div class="post-meta" style="margin-top:6px;color:#666;font-size:13px;">${formatDate(post.createdAt)} · 좋아요 ${post.likeCount || 0} · 댓글 ${post.commentCount || 0}</div>
                <div class="post-content" style="margin-top:8px;">${sanitizeHTML((post.content || '').slice(0, 120))}${(post.content || '').length > 120 ? '...' : ''}</div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="error-message">내 게시글을 불러오지 못했습니다.</div>';
    }
}

async function loadMyComments() {
    const container = document.getElementById('my-comments-list');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/comments');
        const comments = response.content || [];

        if (!comments.length) {
            container.innerHTML = '<div class="no-data">작성한 댓글이 없습니다.</div>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div style="padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:10px;">
                <div style="margin-bottom:8px;">${sanitizeHTML(comment.content)}</div>
                <div style="font-size:13px;color:#666;">${formatDate(comment.createdAt)} · <a href="/post-detail?id=${comment.postId}">원문 보기</a></div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="error-message">내 댓글을 불러오지 못했습니다.</div>';
    }
}

async function loadMessages() {
    const receivedContainer = document.getElementById('received-messages');
    const sentContainer = document.getElementById('sent-messages');
    if (!receivedContainer || !sentContainer) return;

    const tabButtons = document.querySelectorAll('.message-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.messageTab;
            receivedContainer.classList.toggle('hidden', tab !== 'received');
            sentContainer.classList.toggle('hidden', tab !== 'sent');
        });
    });

    try {
        const [received, sent] = await Promise.all([
            APIClient.get('/posts/messages/received'),
            APIClient.get('/posts/messages/sent')
        ]);

        receivedContainer.innerHTML = renderMessages(received, true);
        sentContainer.innerHTML = renderMessages(sent, false);
    } catch (error) {
        receivedContainer.innerHTML = '<div class="error-message">받은 쪽지를 불러오지 못했습니다.</div>';
        sentContainer.innerHTML = '<div class="error-message">보낸 쪽지를 불러오지 못했습니다.</div>';
    }
}

function renderMessages(messages, received) {
    if (!messages || !messages.length) {
        return `<div class="no-data">${received ? '받은' : '보낸'} 쪽지가 없습니다.</div>`;
    }

    return messages.map(message => `
        <div style="padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:10px;">
            <div style="margin-bottom:8px;">${sanitizeHTML(message.content)}</div>
            <div style="font-size:13px;color:#666;">${formatDate(message.created_at || message.createdAt)}</div>
        </div>
    `).join('');
}

async function loadStats() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/stats');
        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
                <div class="card" style="padding:16px;"><strong>내 게시글</strong><div style="font-size:24px;margin-top:8px;">${response.postCount}</div></div>
                <div class="card" style="padding:16px;"><strong>내 댓글</strong><div style="font-size:24px;margin-top:8px;">${response.commentCount}</div></div>
                <div class="card" style="padding:16px;"><strong>받은 좋아요</strong><div style="font-size:24px;margin-top:8px;">${response.likeCount}</div></div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error-message">통계를 불러오지 못했습니다.</div>';
    }
}
