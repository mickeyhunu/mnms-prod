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

    bindLogoutActions();

    try {
        currentUser = await APIClient.get('/auth/me');
        Auth.setUser(currentUser);
        renderHeaderUser(currentUser);
        renderProfileForm(currentUser);

        if (window.location.pathname === '/my-page/profile') {
            bindProfileForm();
        } else if (window.location.pathname === '/my-page/points') {
            await loadPointHistories();
        } else if (window.location.pathname === '/my-page/activity') {
            await loadActivityHistory();
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

            if (payload.nickname !== (currentUser?.nickname || '')) {
                const duplicateCheck = await APIClient.get('/auth/check-nickname', { nickname: payload.nickname });
                if (!duplicateCheck.available) {
                    throw new Error('이미 사용 중인 닉네임입니다.');
                }
            }

            const response = await APIClient.put('/users/me', payload);
            if (response?.user) {
                currentUser = { ...currentUser, ...response.user };
                Auth.setUser(currentUser);
                renderHeaderUser(currentUser);
                renderProfileForm(currentUser);
            }

            if (result) {
                result.textContent = response?.message || '내 정보가 저장되었습니다.';
                result.style.color = '#198754';
            }
        } catch (error) {
            if (result) {
                result.textContent = error?.message || '저장에 실패했습니다. 입력값을 확인해 주세요.';
                result.style.color = '#dc3545';
            }
        } finally {
            submitButton.disabled = false;
            form.password.value = '';
        }
    });
}


function getBoardLabel(boardType) {
    const boardMap = {
        FREE: '자유',
        ANON: '익명',
        REVIEW: '후기',
        STORY: '썰',
        QUESTION: '질문'
    };

    return boardMap[String(boardType || '').toUpperCase()] || '자유';
}

function formatActivityTitle(title, boardType) {
    const boardLabel = sanitizeHTML(getBoardLabel(boardType));
    const safeTitle = sanitizeHTML(title || '제목 없음');
    return `[${boardLabel}] ${safeTitle}`;
}

async function loadActivityHistory() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/activity');
        const myPosts = response.posts || [];
        const myComments = response.comments || [];
        const likedPosts = response.likedPosts || [];
        const commentedPosts = Array.from(
            myComments.reduce((map, comment) => {
                if (!comment.postId || map.has(comment.postId)) return map;

                map.set(comment.postId, {
                    postId: comment.postId,
                    postTitle: comment.postTitle || '원문 보기',
                    postBoardType: comment.postBoardType,
                    commentedAt: comment.createdAt
                });

                return map;
            }, new Map()).values()
        );

        container.innerHTML = `
            <section class="mypage-summary-section mypage-activity-tab-wrap">
                <div class="mypage-activity-tab-header" role="tablist" aria-label="활동 내역 탭">
                    <button type="button" class="mypage-activity-tab is-active" role="tab" aria-selected="true" data-activity-tab="posts">작성글</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="comments">작성댓글</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="commented-posts">댓글단 글</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="liked-posts">좋아요한 글</button>
                </div>

                <div class="mypage-activity-tab-panel is-active" role="tabpanel" data-activity-panel="posts">
                    ${myPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${myPosts.map((post) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${post.id}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType)}</strong>
                                    <p>${sanitizeHTML(formatDate(post.createdAt))} · 좋아요 ${Number(post.likeCount || 0)} · 댓글 ${Number(post.commentCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">작성한 게시글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="comments" hidden>
                    ${myComments.length ? `
                    <div class="mypage-point-history-list">
                        ${myComments.map((comment) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${comment.postId}">
                                <div>
                                    <strong>${formatActivityTitle(comment.postTitle || '원문 보기', comment.postBoardType)}</strong>
                                    <p>${sanitizeHTML(formatDate(comment.createdAt))}</p>
                                    <p>${sanitizeHTML(comment.content || '')}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">작성한 댓글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="commented-posts" hidden>
                    ${commentedPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${commentedPosts.map((post) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${post.postId}">
                                <div>
                                    <strong>${formatActivityTitle(post.postTitle, post.postBoardType)}</strong>
                                    <p>최근 댓글 ${sanitizeHTML(formatDate(post.commentedAt))}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">댓글을 작성한 게시글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="liked-posts" hidden>
                    ${likedPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${likedPosts.map((post) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${post.id}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType)}</strong>
                                    <p>추천일 ${sanitizeHTML(formatDate(post.likedAt || post.createdAt))} · 좋아요 ${Number(post.likeCount || 0)} · 댓글 ${Number(post.commentCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">좋아요한 게시글이 없습니다.</div>'}
                </div>
            </section>
        `;

        bindActivityTabs(container);
    } catch (error) {
        container.innerHTML = '<div class="error-message">활동 내역을 불러오지 못했습니다.</div>';
    }
}

function bindActivityTabs(container) {
    const tabs = container.querySelectorAll('[data-activity-tab]');
    const panels = container.querySelectorAll('[data-activity-panel]');
    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.activityTab;

            tabs.forEach((item) => {
                const isActive = item === tab;
                item.classList.toggle('is-active', isActive);
                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            panels.forEach((panel) => {
                const isActive = panel.dataset.activityPanel === target;
                panel.classList.toggle('is-active', isActive);
                panel.hidden = !isActive;
            });
        });
    });
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

async function loadPointHistories(page = 1) {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    const currentPage = Math.max(1, Number(page) || 1);

    try {
        const response = await APIClient.get('/users/me/points', { page: currentPage, limit: 20 });
        const histories = response.pointHistories || [];
        const pagination = response.pagination || {};
        const pageNumber = Math.max(1, Number(pagination.page) || currentPage);
        const totalPages = Math.max(1, Number(pagination.totalPages) || 1);

        container.innerHTML = `
            <div class="mypage-point-layout">
                <div class="mypage-point-primary-column">
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
                            <div class="mypage-point-pagination" aria-label="포인트 내역 페이지">
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.max(1, pageNumber - 1)}" ${pageNumber <= 1 ? 'disabled' : ''}>이전</button>
                                <span class="mypage-point-page-indicator">${pageNumber} / ${totalPages}</span>
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.min(totalPages, pageNumber + 1)}" ${pageNumber >= totalPages ? 'disabled' : ''}>다음</button>
                            </div>
                        ` : '<div class="no-data">포인트 내역이 없습니다.</div>'}
                    </section>
                </div>

                <div class="mypage-point-reference-grid">
                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">포인트 지급 기준</h3>
                        </div>
                        ${renderPointRuleGuide(response.pointRuleGuide || [])}
                    </section>

                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">회원 등급 기준</h3>
                        </div>
                        ${renderLevelGuide(response.levelGuide || [])}
                    </section>
                </div>
            </div>
        `;

        const pageButtons = container.querySelectorAll('.mypage-point-page-btn[data-page]');
        pageButtons.forEach((button) => {
            if (button.disabled) return;
            button.addEventListener('click', async () => {
                const nextPage = Number(button.dataset.page || pageNumber);
                await loadPointHistories(nextPage);
            });
        });
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
