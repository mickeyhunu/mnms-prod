/**
 * 파일 역할: myPage 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let currentUser = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyPage);
} else {
    initMyPage();
}

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
    const phoneField = document.getElementById('profile-phone');
    const emailField = document.getElementById('profile-email');
    const fixedName = document.getElementById('fixed-name');
    const fixedBirth = document.getElementById('fixed-birth');
    const emailConsent = document.getElementById('email-consent');
    const smsConsent = document.getElementById('sms-consent');
    const loginProvider = document.getElementById('profile-login-provider');

    if (nicknameInput) nicknameInput.value = user.nickname || '';

    if (phoneField) {
        if (phoneField.tagName === 'INPUT') phoneField.value = user.phone || '';
        else phoneField.textContent = user.phone || '없음';
    }

    if (emailField) {
        if (emailField.tagName === 'INPUT') emailField.value = user.email || '';
        else emailField.textContent = user.email || '없음';
    }

    if (fixedName) fixedName.textContent = user.name || user.nickname || '미등록';
    if (fixedBirth) fixedBirth.textContent = user.birthDate || user.birth || '미등록';
    if (emailConsent) emailConsent.checked = Boolean(user.emailConsent);
    if (smsConsent) smsConsent.checked = Boolean(user.smsConsent);
    if (loginProvider) loginProvider.textContent = '카카오 로그인 중';
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
        const joinedAt = response.joinedAt ? formatDate(response.joinedAt).replace(/-/g, '.') : '-';

        container.innerHTML = `
            <section class="mypage-summary-section">
                <h3 class="mypage-summary-title">기본 정보</h3>
                <div class="mypage-summary-list">
                    <div class="mypage-summary-row"><span>아이디</span><strong>${sanitizeHTML(response.loginId || '')}</strong></div>
                    <div class="mypage-summary-row"><span>닉네임</span><strong>${sanitizeHTML(response.nickname || '')}</strong></div>
                    <div class="mypage-summary-row"><span>랭크</span><strong>Lv.${Number(response.level || 1)}</strong></div>
                    <div class="mypage-summary-row"><span>가입일</span><strong>${sanitizeHTML(joinedAt)}</strong></div>
                </div>
            </section>

            <section class="mypage-summary-section">
                <h3 class="mypage-summary-title">포인트</h3>
                <div class="mypage-summary-row"><span>보유 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
                <div class="mypage-level-progress">
                    <div class="mypage-level-progress-meta">
                        <span>Lv.${Number(response.level || 1)} → ${sanitizeHTML(response.nextLevelLabel || 'MAX')}</span>
                        <span>${Number(response.neededPointsToNextLevel || 0).toLocaleString()}P 필요</span>
                    </div>
                    <progress class="mypage-progress-bar" max="100" value="${Number(response.progressRate || 0)}"></progress>
                    <div class="mypage-level-progress-meta"><span>${Number(response.totalPoints || 0).toLocaleString()}P</span><span>${Number(response.nextLevelMinPoints || response.totalPoints || 0).toLocaleString()}P</span></div>
                </div>
            </section>

            <section class="mypage-summary-section">
                <h3 class="mypage-summary-title">활동 내역</h3>
                <div class="mypage-activity-grid">
                    <div class="mypage-activity-item"><span>출석</span><strong>${Number(response.attendanceCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>후기</span><strong>${Number(response.reviewCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>게시글</span><strong>${Number(response.postCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>댓글</span><strong>${Number(response.commentCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>추천</span><strong>${Number(response.recommendCount || 0)}</strong></div>
                </div>
            </section>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error-message">통계를 불러오지 못했습니다.</div>';
    }
}
