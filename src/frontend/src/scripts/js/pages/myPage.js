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

    bindProfileForm();
    bindLogoutActions();

    try {
        currentUser = await APIClient.get('/auth/me');
        Auth.setUser(currentUser);
        renderHeaderUser(currentUser);
        renderProfileForm(currentUser);

        await Promise.all([
            loadStats()
        ]);
    } catch (error) {
        console.error(error);
        alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
        Auth.logout();
    }
}

function bindLogoutActions() {
    Auth.bindLogoutButton();

    const footerLogoutButton = document.querySelector('.mypage-footer-logout');
    if (footerLogoutButton && footerLogoutButton.dataset.boundLogout !== 'true') {
        footerLogoutButton.dataset.boundLogout = 'true';
        footerLogoutButton.addEventListener('click', async (event) => {
            event.preventDefault();

            if (!confirm('로그아웃 하시겠습니까?')) return;

            if (typeof AuthAPI !== 'undefined' && AuthAPI.logout) {
                await AuthAPI.logout();
                return;
            }

            Auth.logout();
        });
    }
}

function renderHeaderUser(user) {
    const nickname = document.getElementById('user-nickname');
    if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(user);

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        if (user.isAdmin) adminLink.classList.remove('hidden');
        else adminLink.classList.add('hidden');
    }
}

function renderProfileForm(user) {
    const nicknameInput = document.getElementById('profile-nickname');
    const phoneInput = document.getElementById('profile-phone');
    const emailInput = document.getElementById('profile-email');
    const fixedName = document.getElementById('fixed-name');
    const fixedBirth = document.getElementById('fixed-birth');
    const emailConsent = document.getElementById('email-consent');
    const smsConsent = document.getElementById('sms-consent');

    if (nicknameInput) nicknameInput.value = user.nickname || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (emailInput) emailInput.value = user.email || '';
    if (fixedName) fixedName.textContent = user.name || '미등록';
    if (fixedBirth) fixedBirth.textContent = user.birthDate || user.birth || '미등록';
    if (emailConsent) emailConsent.checked = Boolean(user.emailConsent);
    if (smsConsent) smsConsent.checked = Boolean(user.smsConsent);
}

function bindProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = document.getElementById('profile-save-result');
        const submitButton = form.querySelector('button[type="submit"]');

        const payload = {
            nickname: form.nickname.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            emailConsent: form.emailConsent.checked,
            smsConsent: form.smsConsent.checked
        };

        if (form.password.value.trim()) {
            payload.password = form.password.value.trim();
        }

        try {
            submitButton.disabled = true;
            if (result) {
                result.textContent = '저장 중입니다...';
                result.style.color = '#6c757d';
            }

            await APIClient.put('/users/me', payload);
            if (result) {
                result.textContent = '내 정보가 저장되었습니다.';
                result.style.color = '#198754';
            }
        } catch (error) {
            if (result) {
                result.textContent = '저장에 실패했습니다. 입력값을 확인해 주세요.';
                result.style.color = '#dc3545';
            }
        } finally {
            submitButton.disabled = false;
            form.password.value = '';
        }
    });
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

async function loadStats() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/stats');
        container.innerHTML = `
            <div class="card" style="padding:16px;"><strong>내 게시글</strong><div style="font-size:24px;margin-top:8px;">${response.postCount}</div></div>
            <div class="card" style="padding:16px;"><strong>내 댓글</strong><div style="font-size:24px;margin-top:8px;">${response.commentCount}</div></div>
            <div class="card" style="padding:16px;"><strong>받은 좋아요</strong><div style="font-size:24px;margin-top:8px;">${response.likeCount}</div></div>
            <div class="card" style="padding:16px;"><strong>회원 등급</strong><div style="font-size:20px;margin-top:8px;">${sanitizeHTML(currentUser.levelLabel || 'Lv1 🐣 룸린이')}</div></div>
            <div class="card" style="padding:16px;"><strong>누적 포인트</strong><div style="font-size:24px;margin-top:8px;">${Number(currentUser.totalPoints || 0)}</div></div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error-message">통계를 불러오지 못했습니다.</div>';
    }
}
