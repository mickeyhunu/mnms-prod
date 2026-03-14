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

        if (window.location.pathname === '/my-page/points') {
            await loadPointHistories();
        } else {
            await loadStats();
        }
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



function formatPointActionLabel(actionType) {
    const labels = {
        REGISTER: '회원가입',
        LOGIN_DAILY: '출석 체크',
        CREATE_POST: '게시글 작성',
        CREATE_REVIEW_BONUS: '후기 게시글 보너스',
        CREATE_COMMENT: '댓글 작성',
        LIKE_POST: '좋아요 누름',
        RECEIVE_POST_LIKE: '내 게시글 좋아요 받음',
        REVOKE_CREATE_POST: '게시글 삭제로 포인트 차감',
        REVOKE_CREATE_REVIEW_BONUS: '후기 보너스 포인트 차감',
        REVOKE_CREATE_COMMENT: '댓글 삭제로 포인트 차감',
        REVOKE_LIKE_POST: '좋아요 취소로 포인트 차감',
        REVOKE_RECEIVE_POST_LIKE: '받은 좋아요 취소로 포인트 차감'
    };

    return labels[actionType] || actionType;
}

function renderPointRuleGuide(pointRuleGuide = []) {
    if (!pointRuleGuide.length) {
        return '<div class="no-data">포인트 지급 기준 정보가 없습니다.</div>';
    }

    return `
        <div class="mypage-guide-list">
            ${pointRuleGuide.map((rule) => `
                <div class="mypage-guide-row">
                    <span>${sanitizeHTML(rule.actionLabel || formatPointActionLabel(rule.actionType || ''))}</span>
                    <strong>${Number(rule.points || 0).toLocaleString()}P</strong>
                    <em>${sanitizeHTML(rule.dailyLimitLabel || '제한 없음')}</em>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLevelGuide(levelGuide = []) {
    if (!levelGuide.length) {
        return '<div class="no-data">등급 정보가 없습니다.</div>';
    }

    return `
        <div class="mypage-guide-list">
            ${levelGuide.map((level) => {
                const maxLabel = level.maxPoints == null ? '이상' : `${Number(level.maxPoints).toLocaleString()}P`;
                return `
                    <div class="mypage-guide-row">
                        <span>${sanitizeHTML(level.label || '')}</span>
                        <strong>${Number(level.minPoints || 0).toLocaleString()}P ~ ${maxLabel}</strong>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function loadPointHistories() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/points');
        const histories = response.pointHistories || [];

        container.innerHTML = `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">보유 포인트</h3>
                </div>
                <div class="mypage-summary-row"><span>현재 등급</span><strong>${sanitizeHTML(response.levelLabel || '-')}</strong></div>
                <div class="mypage-summary-row"><span>누적 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
            </section>

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">포인트 적립/차감 내역</h3>
                </div>
                ${histories.length ? `
                    <div class="mypage-point-history-list">
                        ${histories.map((item) => {
                            const pointValue = Number(item.points || 0);
                            const pointClass = pointValue >= 0 ? 'plus' : 'minus';
                            const pointText = `${pointValue >= 0 ? '+' : ''}${pointValue.toLocaleString()}P`;
                            return `
                                <div class="mypage-point-history-row">
                                    <div>
                                        <strong>${sanitizeHTML(item.actionLabel || formatPointActionLabel(item.actionType || ''))}</strong>
                                        <p>${sanitizeHTML(formatDate(item.createdAt))}</p>
                                    </div>
                                    <span class="point-change ${pointClass}">${pointText}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : '<div class="no-data">포인트 내역이 없습니다.</div>'}
            </section>

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">포인트 지급 기준</h3>
                </div>
                ${renderPointRuleGuide(response.pointRuleGuide || [])}
            </section>

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">회원 등급 기준</h3>
                </div>
                ${renderLevelGuide(response.levelGuide || [])}
            </section>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error-message">포인트 내역을 불러오지 못했습니다.</div>';
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
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">기본 정보</h3>
                    <a class="mypage-summary-action" href="/my-page/profile">정보 수정</a>
                </div>
                <div class="mypage-summary-list">
                    <div class="mypage-summary-row"><span>아이디</span><strong>${sanitizeHTML(response.loginId || '')}</strong></div>
                    <div class="mypage-summary-row"><span>닉네임</span><strong>${sanitizeHTML(response.nickname || '')}</strong></div>
                    <div class="mypage-summary-row"><span>랭크</span><strong>${sanitizeHTML(response.levelLabel || '')}</strong></div>
                    <div class="mypage-summary-row"><span>가입일</span><strong>${sanitizeHTML(joinedAt)}</strong></div>
                </div>
            </section>

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">포인트</h3>
                    <a class="mypage-summary-action" href="/my-page/points">포인트 내역 보기</a>
                </div>
                <div class="mypage-summary-row"><span>보유 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
                <div class="mypage-level-progress">
                    <div class="mypage-level-progress-meta">
                        <span>${sanitizeHTML(response.levelLabel || '')} → ${sanitizeHTML(response.nextLevelLabel || 'MAX')}</span>
                        <span>${Number(response.neededPointsToNextLevel || 0).toLocaleString()}P 필요</span>
                    </div>
                    <progress class="mypage-progress-bar" max="100" value="${Number(response.progressRate || 0)}"></progress>
                    <div class="mypage-level-progress-meta"><span>${Number(response.totalPoints || 0).toLocaleString()}P</span><span>${Number(response.nextLevelMinPoints || response.totalPoints || 0).toLocaleString()}P</span></div>
                </div>
            </section>

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">활동 내역</h3>
                    <a class="mypage-summary-action" href="/my-page/activity">활동 내역 보기</a>
                </div>
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
