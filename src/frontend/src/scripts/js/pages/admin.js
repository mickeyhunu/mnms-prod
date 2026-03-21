/**
 * 파일 역할: admin 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let adminActionTarget = null;
let supportEditTarget = null;
let currentSupportCategory = 'NOTICE';
let currentInquiryStatus = '';
let inquiryAnswerTarget = null;
let editingUserId = null;
let editingEntryId = null;
let currentEntryStoreNo = null;
let entryStores = [];
let isGlobalAdminClickBound = false;

const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const ACCOUNT_STATUS = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' };
const ADMIN_TABS = ['posts', 'comments', 'users', 'entries', 'ads', 'support', 'inquiries'];

function getAdminPageState() {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');
    const activeTab = ADMIN_TABS.includes(requestedTab) ? requestedTab : 'posts';
    const editUserId = Number.parseInt(params.get('editUserId') || '', 10);

    return {
        activeTab,
        editUserId: Number.isInteger(editUserId) && editUserId > 0 ? editUserId : null
    };
}

function syncAdminPageState(nextState = {}, { replace = true } = {}) {
    const url = new URL(window.location.href);
    const currentState = getAdminPageState();
    const activeTab = ADMIN_TABS.includes(nextState.activeTab) ? nextState.activeTab : currentState.activeTab;
    const editUserId = Object.prototype.hasOwnProperty.call(nextState, 'editUserId') ? nextState.editUserId : currentState.editUserId;

    if (activeTab && activeTab !== 'posts') url.searchParams.set('tab', activeTab);
    else url.searchParams.delete('tab');

    if (Number.isInteger(editUserId) && editUserId > 0) url.searchParams.set('editUserId', String(editUserId));
    else url.searchParams.delete('editUserId');

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url);
}

async function activateAdminTab(tabKey, options = {}) {
    const { updateHistory = true, replaceHistory = true } = options;
    const resolvedTabKey = ADMIN_TABS.includes(tabKey) ? tabKey : 'posts';
    const tabs = document.querySelectorAll('.admin-tab');

    tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === resolvedTabKey);
    });

    ADMIN_TABS.forEach((key) => {
        const isActive = key === resolvedTabKey;
        document.getElementById(`${key}-section`)?.classList.toggle('hidden', !isActive);
        document.getElementById(`${key}-section`)?.classList.toggle('active', isActive);
    });

    if (updateHistory) {
        syncAdminPageState({
            activeTab: resolvedTabKey,
            editUserId: resolvedTabKey === 'users' ? getAdminPageState().editUserId : null
        }, { replace: replaceHistory });
    }

    if (resolvedTabKey === 'posts') await loadPosts();
    else if (resolvedTabKey === 'comments') await loadComments();
    else if (resolvedTabKey === 'users') await loadUsers();
    else if (resolvedTabKey === 'entries') await loadEntries();
    else if (resolvedTabKey === 'ads') await loadAds();
    else if (resolvedTabKey === 'support') await loadSupportArticles();
    else if (resolvedTabKey === 'inquiries') await loadInquiries();
}

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

        const pageState = getAdminPageState();
        await activateAdminTab(pageState.activeTab, { updateHistory: true, replaceHistory: true });

        if (pageState.activeTab === 'users' && pageState.editUserId) {
            await openUserEditModal(pageState.editUserId, { syncHistory: false });
        }
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
            await activateAdminTab(tab.dataset.tab, { updateHistory: true, replaceHistory: false });
        });
    });

    document.getElementById('posts-retry-btn')?.addEventListener('click', loadPosts);
    document.getElementById('comments-retry-btn')?.addEventListener('click', loadComments);
    document.getElementById('users-retry-btn')?.addEventListener('click', loadUsers);
    document.getElementById('entries-retry-btn')?.addEventListener('click', loadEntries);
    document.getElementById('entries-retry-btn-secondary')?.addEventListener('click', loadEntries);
    document.getElementById('ads-retry-btn')?.addEventListener('click', loadAds);
    document.getElementById('support-retry-btn')?.addEventListener('click', loadSupportArticles);
    document.getElementById('inquiries-retry-btn')?.addEventListener('click', loadInquiries);

    document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDelete);
    document.getElementById('user-edit-cancel-btn')?.addEventListener('click', closeUserEditModal);
    document.getElementById('user-edit-cancel-btn-secondary')?.addEventListener('click', closeUserEditModal);
    document.getElementById('user-edit-save-btn')?.addEventListener('click', saveUserDetail);
    bindUserEditForm();

    document.getElementById('support-category')?.addEventListener('change', async (event) => {
        currentSupportCategory = event.target.value;
        await loadSupportArticles();
    });
    document.getElementById('support-cancel-btn')?.addEventListener('click', closeSupportModal);
    document.getElementById('support-save-btn')?.addEventListener('click', saveSupportArticle);

    document.getElementById('ads-new-btn')?.addEventListener('click', () => openAdEditor());
    document.getElementById('entry-store-select')?.addEventListener('change', async (event) => {
        currentEntryStoreNo = Number.parseInt(event.target.value || '', 10);
        resetEntryEditor();
        await loadEntries();
    });
    document.getElementById('entry-save-btn')?.addEventListener('click', saveEntry);
    document.getElementById('entry-cancel-btn')?.addEventListener('click', resetEntryEditor);

    document.getElementById('inquiries-status')?.addEventListener('change', async (event) => {
        currentInquiryStatus = event.target.value || '';
        await loadInquiries();
    });
    document.getElementById('inquiry-answer-cancel-btn')?.addEventListener('click', closeInquiryAnswerModal);
    document.getElementById('inquiry-answer-save-btn')?.addEventListener('click', saveInquiryAnswer);

    if (!isGlobalAdminClickBound) {
        document.addEventListener('click', handleGlobalAdminClick);
        isGlobalAdminClickBound = true;
    }
}

async function handleGlobalAdminClick(event) {
    const supportNewButton = event.target.closest('#support-new-btn');
    if (supportNewButton) {
        event.preventDefault();
        const category = encodeURIComponent(currentSupportCategory || 'NOTICE');
        window.location.href = `/admin/support/create?category=${category}`;
        return;
    }

    const actionButton = event.target.closest('[data-admin-action]');
    if (!actionButton) return;
    await handleAdminTableActionClick(event);
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
            tbody.innerHTML = posts.map(post => {
                const isHidden = isHiddenPost(post);
                return `
                <tr class="${getAdminPostRowClass(post)}">
                    <td>${post.id}</td>
                    <td>
                        <div class="admin-comment-cell">
                            <div class="admin-comment-flags">${renderAdminPostFlags(post)}</div>
                            <a href="/post-detail?id=${post.id}" target="_blank">${sanitizeHTML(post.title || '')}</a>
                        </div>
                    </td>
                    <td>${sanitizeHTML(post.authorNickname || `사용자#${post.user_id || post.userId}`)}</td>
                    <td>${formatDate(post.createdAt || post.created_at)}</td>
                    <td>${post.likeCount || 0}</td>
                    <td>${post.commentCount || 0}</td>
                    <td>
                        <button class="btn btn-sm ${isHidden ? 'btn-outline' : 'btn-secondary'}" type="button" data-admin-action="toggle-hide" data-target-type="post" data-target-id="${post.id}" data-current-hidden="${isHidden ? 'true' : 'false'}">${isHidden ? '가리기 해제' : '가리기'}</button>
                    </td>
                </tr>
            `;}).join('');
            bindAdminHideToggleButtons(tbody);
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
            tbody.innerHTML = comments.map(comment => {
                const isHidden = isHiddenComment(comment);
                return `
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
                    <td><button class="btn btn-sm ${isHidden ? 'btn-outline' : 'btn-secondary'}" type="button" data-admin-action="toggle-hide" data-target-type="comment" data-target-id="${comment.id}" data-current-hidden="${isHidden ? 'true' : 'false'}">${isHidden ? '가리기 해제' : '가리기'}</button></td>
                </tr>
            `;}).join('');
            bindAdminHideToggleButtons(tbody);
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
            tbody.innerHTML = '<tr><td colspan="9">회원이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${sanitizeHTML(user.email || '')}</td>
                    <td>${sanitizeHTML(user.nickname || '')}</td>
                    <td>${formatAdminRestrictionStatus(user)}</td>
                    <td>${Number(user.totalPoints || 0).toLocaleString()} P</td>
                    <td>${formatDate(user.createdAt || user.created_at)}</td>
                    <td>${sanitizeHTML(user.role || 'USER')}</td>
                    <td>${user.memberType === 'ADVERTISER' ? '광고 회원' : '일반 회원'}</td>
                    <td>
                        <div class="admin-user-actions">
                            <a class="btn btn-sm btn-secondary" href="/admin?tab=users&editUserId=${user.id}" data-admin-action="edit-user" data-target-id="${user.id}">정보 수정</a>
                            <button class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="user" data-target-id="${user.id}">삭제</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        showContent('users');
    } catch (error) {
        showError('users', error.message || '회원 목록을 불러오지 못했습니다.');
    }
}

function setEntryHelpMessage(message, color = '#6c757d') {
    const help = document.getElementById('entry-form-help');
    if (!help) return;
    help.textContent = message;
    help.style.color = color;
}

function renderEntryStoreOptions() {
    const select = document.getElementById('entry-store-select');
    if (!select) return;

    if (!entryStores.length) {
        select.innerHTML = '<option value="">매장 없음</option>';
        select.disabled = true;
        currentEntryStoreNo = null;
        return;
    }

    if (!entryStores.some((store) => store.storeNo === currentEntryStoreNo)) {
        currentEntryStoreNo = entryStores[0].storeNo;
    }

    select.disabled = false;
    select.innerHTML = entryStores.map((store) => `
        <option value="${store.storeNo}" ${store.storeNo === currentEntryStoreNo ? 'selected' : ''}>${sanitizeHTML(store.storeName)}</option>
    `).join('');
}

async function ensureEntryStoresLoaded() {
    const response = await APIClient.get('/admin/entries/stores');
    entryStores = (response.content || []).map((store) => ({
        storeNo: Number.parseInt(store.storeNo, 10),
        storeName: String(store.storeName || '').trim()
    })).filter((store) => Number.isInteger(store.storeNo) && store.storeName);
    renderEntryStoreOptions();
}

function resetEntryEditor() {
    editingEntryId = null;
    const input = document.getElementById('entry-name-input');
    const saveButton = document.getElementById('entry-save-btn');
    const cancelButton = document.getElementById('entry-cancel-btn');
    const title = document.getElementById('entry-editor-title');

    if (input) input.value = '';
    if (saveButton) saveButton.textContent = '추가';
    if (cancelButton) cancelButton.classList.add('hidden');
    if (title) title.textContent = '새 엔트리 추가';
    setEntryHelpMessage('');
}

function startEntryEdit(entry) {
    editingEntryId = entry.entryId;
    const input = document.getElementById('entry-name-input');
    const saveButton = document.getElementById('entry-save-btn');
    const cancelButton = document.getElementById('entry-cancel-btn');
    const title = document.getElementById('entry-editor-title');

    if (input) {
        input.value = entry.workerName || '';
        input.focus();
    }
    if (saveButton) saveButton.textContent = '수정 저장';
    if (cancelButton) cancelButton.classList.remove('hidden');
    if (title) title.textContent = '엔트리 수정';
    setEntryHelpMessage(`"${entry.workerName || ''}" 항목을 수정 중입니다.`);
}

async function loadEntries() {
    toggleLoading('entries', true);

    try {
        await ensureEntryStoresLoaded();

        if (!currentEntryStoreNo) {
            const tbody = document.getElementById('entries-tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5">관리할 매장이 없습니다.</td></tr>';
            showContent('entries');
            return;
        }

        const response = await APIClient.get('/admin/entries', { storeNo: currentEntryStoreNo });
        const entries = response.content || [];
        const tbody = document.getElementById('entries-tbody');

        if (!entries.length) {
            tbody.innerHTML = '<tr><td colspan="5">등록된 엔트리 항목이 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = entries.map((entry) => `
                <tr>
                    <td>${sanitizeHTML(entry.workerName || '')}</td>
                    <td>${Number(entry.mentionCount || 0).toLocaleString()}</td>
                    <td>${Number(entry.insertCount || 0).toLocaleString()}</td>
                    <td>${formatDate(entry.createdAt)}</td>
                    <td>
                        <div class="admin-user-actions">
                            <button class="btn btn-sm btn-secondary" data-admin-action="edit-entry" data-entry-id="${sanitizeHTML(entry.entryId || '')}" data-entry-name="${sanitizeHTML(entry.workerName || '')}">수정</button>
                            <button class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="entry" data-entry-id="${sanitizeHTML(entry.entryId || '')}">삭제</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        showContent('entries');
    } catch (error) {
        showError('entries', error.message || '엔트리 목록을 불러오지 못했습니다.');
    }
}

async function saveEntry() {
    const input = document.getElementById('entry-name-input');
    const saveButton = document.getElementById('entry-save-btn');
    const workerName = input?.value?.trim() || '';

    if (!currentEntryStoreNo) {
        setEntryHelpMessage('먼저 매장을 선택해주세요.', '#dc3545');
        return;
    }

    if (!workerName) {
        setEntryHelpMessage('엔트리 이름을 입력해주세요.', '#dc3545');
        return;
    }

    try {
        if (saveButton) saveButton.disabled = true;
        setEntryHelpMessage(editingEntryId ? '엔트리를 수정하는 중입니다...' : '엔트리를 추가하는 중입니다...');

        if (editingEntryId) {
            await APIClient.put(`/admin/entries/${encodeURIComponent(editingEntryId)}`, { workerName });
        } else {
            await APIClient.post('/admin/entries', { storeNo: currentEntryStoreNo, workerName });
        }

        resetEntryEditor();
        await loadEntries();
    } catch (error) {
        setEntryHelpMessage(error.message || '엔트리 저장에 실패했습니다.', '#dc3545');
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

function setAdminUserHelpMessage(message, color = '#6c757d') {
    const result = document.getElementById('admin-user-save-result');
    if (!result) return;
    result.textContent = message;
    result.style.color = color;
}

function syncLoginRestrictionFields() {
    const accountStatusEl = document.getElementById('admin-user-account-status');
    const loginRestrictionDaysEl = document.getElementById('admin-user-login-restriction-days');
    const loginRestrictionPermanentEl = document.getElementById('admin-user-login-restriction-permanent');
    const loginRestrictedUntilEl = document.getElementById('admin-user-login-restricted-until');
    if (!accountStatusEl || !loginRestrictionDaysEl || !loginRestrictionPermanentEl || !loginRestrictedUntilEl) return;

    const isSuspended = accountStatusEl.value === ACCOUNT_STATUS.SUSPENDED;
    const isPermanent = loginRestrictionPermanentEl.checked;
    loginRestrictionDaysEl.disabled = !isSuspended || isPermanent;
    loginRestrictionDaysEl.placeholder = isSuspended
        ? (isPermanent ? '영구 제한은 일수 입력이 필요 없습니다.' : '예: 1, 7, 30')
        : '정상 계정은 제한이 없습니다.';

    if (!isSuspended) {
        loginRestrictionDaysEl.value = '';
        loginRestrictionPermanentEl.checked = false;
        loginRestrictedUntilEl.value = '';
    } else if (isPermanent) {
        loginRestrictionDaysEl.value = '';
        loginRestrictedUntilEl.value = '영구 제한';
    }
}

function formatAdminRestrictionStatus(user) {
    if (user.accountStatus !== ACCOUNT_STATUS.SUSPENDED) return '정상';
    if (user.isLoginRestrictionPermanent) return '정지 (영구 제한)';
    if (user.loginRestrictedUntil) return `정지 (${formatDate(user.loginRestrictedUntil)})`;
    return '정지';
}

function bindUserEditForm() {
    const phoneInput = document.getElementById('admin-user-phone');
    const passwordInput = document.getElementById('admin-user-password');
    const passwordConfirmInput = document.getElementById('admin-user-password-confirm');
    const passwordMatchResult = document.getElementById('admin-user-password-match-result');
    const accountStatusEl = document.getElementById('admin-user-account-status');
    const loginRestrictionPermanentEl = document.getElementById('admin-user-login-restriction-permanent');

    phoneInput?.addEventListener('input', () => {
        phoneInput.value = formatPhoneNumber(phoneInput.value);
    });

    const syncPasswordMatchMessage = () => {
        if (!passwordMatchResult || !passwordConfirmInput) return;

        const password = passwordInput?.value.trim() || '';
        const passwordConfirm = passwordConfirmInput.value.trim();

        if (!password && !passwordConfirm) {
            passwordMatchResult.textContent = '';
            return;
        }

        if (!passwordConfirm) {
            passwordMatchResult.textContent = '변경할 비밀번호를 한 번 더 입력해주세요.';
            passwordMatchResult.style.color = '#6c757d';
            return;
        }

        if (password !== passwordConfirm) {
            passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 다릅니다.';
            passwordMatchResult.style.color = '#dc3545';
            return;
        }

        passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 일치합니다.';
        passwordMatchResult.style.color = '#198754';
    };

    passwordInput?.addEventListener('input', syncPasswordMatchMessage);
    passwordConfirmInput?.addEventListener('input', syncPasswordMatchMessage);
    accountStatusEl?.addEventListener('change', syncLoginRestrictionFields);
    loginRestrictionPermanentEl?.addEventListener('change', syncLoginRestrictionFields);
}

function fillUserEditForm(user) {
    document.getElementById('admin-user-email').value = user.email || '';
    document.getElementById('admin-user-email-display').value = user.email || '';
    document.getElementById('admin-user-name').value = user.name || user.nickname || '';
    document.getElementById('admin-user-birth').value = user.birthDate || '';
    document.getElementById('admin-user-nickname').value = user.nickname || '';
    document.getElementById('admin-user-phone').value = formatPhoneNumber(user.phone || '');
    document.getElementById('admin-user-email-consent').checked = Boolean(user.emailConsent);
    document.getElementById('admin-user-sms-consent').checked = Boolean(user.smsConsent);
    document.getElementById('admin-user-total-points').value = Number(user.totalPoints || 0);
    document.getElementById('admin-user-role').value = user.role || 'USER';
    document.getElementById('admin-user-member-type').value = user.memberType || 'GENERAL';
    document.getElementById('admin-user-account-status').value = user.accountStatus || ACCOUNT_STATUS.ACTIVE;
    document.getElementById('admin-user-login-restriction-permanent').checked = Boolean(user.isLoginRestrictionPermanent);
    document.getElementById('admin-user-login-restriction-days').value = '';
    document.getElementById('admin-user-login-restricted-until').value = user.isLoginRestrictionPermanent
        ? '영구 제한'
        : (user.loginRestrictedUntil ? formatDate(user.loginRestrictedUntil) : '');
    document.getElementById('admin-user-created-at').value = formatDate(user.createdAt || user.created_at);
    document.getElementById('admin-user-password').value = '';
    document.getElementById('admin-user-password-confirm').value = '';
    document.getElementById('admin-user-password-match-result').textContent = '';
    setAdminUserHelpMessage('');
    syncLoginRestrictionFields();
}

async function openUserEditModal(userId, options = {}) {
    const { syncHistory = true, replaceHistory = true } = options;

    try {
        const response = await APIClient.get(`/admin/users/${userId}`);
        const user = response.user;
        if (!user) throw new Error('회원 정보를 찾을 수 없습니다.');

        editingUserId = userId;
        document.getElementById('user-edit-modal-title').textContent = `회원 정보 수정 #${userId}`;
        fillUserEditForm(user);
        document.getElementById('user-edit-modal')?.classList.remove('hidden');
        document.getElementById('user-edit-modal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (syncHistory) {
            syncAdminPageState({ activeTab: 'users', editUserId: userId }, { replace: replaceHistory });
        }
    } catch (error) {
        if (syncHistory) {
            syncAdminPageState({ activeTab: 'users', editUserId: null }, { replace: true });
        }
        alert(error.message || '회원 정보를 불러오지 못했습니다.');
    }
}

function closeUserEditModal() {
    editingUserId = null;
    document.getElementById('user-edit-form')?.reset();
    document.getElementById('admin-user-password-match-result').textContent = '';
    setAdminUserHelpMessage('');
    document.getElementById('user-edit-modal')?.classList.add('hidden');
    syncAdminPageState({ activeTab: 'users', editUserId: null }, { replace: true });
}

async function saveUserDetail() {
    if (!editingUserId) return;

    const nickname = document.getElementById('admin-user-nickname')?.value?.trim() || '';
    const password = document.getElementById('admin-user-password')?.value?.trim() || '';
    const passwordConfirm = document.getElementById('admin-user-password-confirm')?.value?.trim() || '';
    const phone = formatPhoneNumber(document.getElementById('admin-user-phone')?.value?.trim() || '');
    const totalPoints = Number.parseInt(document.getElementById('admin-user-total-points')?.value || '0', 10);
    const role = document.getElementById('admin-user-role')?.value || 'USER';
    const memberType = document.getElementById('admin-user-member-type')?.value || 'GENERAL';
    const emailConsent = document.getElementById('admin-user-email-consent')?.checked || false;
    const smsConsent = document.getElementById('admin-user-sms-consent')?.checked || false;
    const accountStatus = document.getElementById('admin-user-account-status')?.value || ACCOUNT_STATUS.ACTIVE;
    const loginRestrictionDaysValue = document.getElementById('admin-user-login-restriction-days')?.value || '';
    const isLoginRestrictionPermanent = document.getElementById('admin-user-login-restriction-permanent')?.checked || false;
    const saveButton = document.getElementById('user-edit-save-btn');

    document.getElementById('admin-user-phone').value = phone;

    if (!nickname || nickname.length < 2) {
        setAdminUserHelpMessage('닉네임은 2글자 이상이어야 합니다.', '#dc3545');
        return;
    }

    if (password && password !== passwordConfirm) {
        setAdminUserHelpMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.', '#dc3545');
        return;
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
        setAdminUserHelpMessage('연락처 형식은 010-0000-0000으로 입력해 주세요.', '#dc3545');
        return;
    }

    if (!Number.isInteger(totalPoints) || totalPoints < 0) {
        setAdminUserHelpMessage('포인트는 0 이상의 정수만 입력할 수 있습니다.', '#dc3545');
        return;
    }

    if (accountStatus === ACCOUNT_STATUS.SUSPENDED && !isLoginRestrictionPermanent) {
        const loginRestrictionDays = Number.parseInt(loginRestrictionDaysValue, 10);
        if (!Number.isInteger(loginRestrictionDays) || loginRestrictionDays < 1) {
            setAdminUserHelpMessage('로그인 제한 일수는 1일 이상의 정수로 입력해주세요.', '#dc3545');
            return;
        }
    }

    const payload = {
        nickname,
        phone,
        totalPoints,
        role,
        memberType,
        accountStatus,
        loginRestrictionDays: accountStatus === ACCOUNT_STATUS.SUSPENDED && !isLoginRestrictionPermanent
            ? Number.parseInt(loginRestrictionDaysValue, 10)
            : null,
        isLoginRestrictionPermanent,
        emailConsent,
        smsConsent
    };

    if (password) payload.password = password;

    try {
        if (saveButton) saveButton.disabled = true;
        setAdminUserHelpMessage('저장 중입니다...');
        await APIClient.put(`/admin/users/${editingUserId}`, payload);
        closeUserEditModal();
        await loadUsers();
        alert('회원 정보가 저장되었습니다.');
    } catch (error) {
        setAdminUserHelpMessage(error.message || '회원 정보 저장에 실패했습니다.', '#dc3545');
    } finally {
        if (saveButton) saveButton.disabled = false;
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
        const articles = await fetchSupportArticles();
        const supportTotal = document.getElementById('support-total');
        if (supportTotal) supportTotal.textContent = articles.length;

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

async function fetchSupportArticles() {
    if (currentSupportCategory !== 'NOTICE') {
        const response = await APIClient.get('/admin/support', {
            category: currentSupportCategory,
            sourceType: 'SUPPORT'
        });
        return response.content || [];
    }

    const [postResponse, supportResponse] = await Promise.all([
        APIClient.get('/admin/support', { category: 'NOTICE', sourceType: 'POST' }),
        APIClient.get('/admin/support', { category: 'NOTICE', sourceType: 'SUPPORT' })
    ]);

    const merged = [...(postResponse.content || []), ...(supportResponse.content || [])];
    return merged.sort((a, b) => {
        const pinnedGap = Number(b.isPinned || 0) - Number(a.isPinned || 0);
        if (pinnedGap !== 0) return pinnedGap;

        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;

        return Number(b.id || 0) - Number(a.id || 0);
    });
}

async function openSupportModal(id = null, sourceType = 'SUPPORT') {
    const titleEl = document.getElementById('support-modal-title');
    const categoryEl = document.getElementById('support-form-category');
    const noticeOptionEl = document.getElementById('support-notice-options');
    const noticeTypeEl = document.getElementById('support-form-notice-type');
    const isPinnedEl = document.getElementById('support-form-is-pinned');
    const subjectEl = document.getElementById('support-form-title');
    const contentEl = document.getElementById('support-form-content');

    if (!categoryEl || !subjectEl || !contentEl) return;

    const syncNoticeOptionVisibility = () => {
        if (!noticeOptionEl) return;
        noticeOptionEl.classList.toggle('hidden', categoryEl.value !== 'NOTICE');
    };

    if (!id) {
        supportEditTarget = null;
        titleEl.textContent = '공지/FAQ 작성';
        categoryEl.value = currentSupportCategory;
        subjectEl.value = '';
        contentEl.value = '';
        if (noticeTypeEl) noticeTypeEl.value = 'NOTICE';
        if (isPinnedEl) isPinnedEl.checked = false;
    } else {
        let target;
        try {
            target = await APIClient.get(`/admin/support/article/${id}`, {
                sourceType
            });
        } catch (error) {
            alert(error.message || '글을 찾을 수 없습니다.');
            return;
        }

        supportEditTarget = { id: Number(target.sourceId || target.id), sourceType: String(target.sourceType || sourceType || 'SUPPORT') };
        titleEl.textContent = '공지/FAQ 수정';
        categoryEl.value = target.category || currentSupportCategory;
        subjectEl.value = target.title || '';
        contentEl.value = target.content || '';
        if (noticeTypeEl) noticeTypeEl.value = target.noticeType || 'NOTICE';
        if (isPinnedEl) isPinnedEl.checked = Boolean(target.isPinned);
    }

    categoryEl.onchange = syncNoticeOptionVisibility;
    syncNoticeOptionVisibility();

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
    const entryId = actionElement.dataset.entryId;
    const entryName = actionElement.dataset.entryName || '';

    if (action === 'delete' && targetType === 'entry' && entryId) {
        openAdminActionModal({
            action,
            type: targetType,
            entryId,
            entryName
        });
        return;
    }

    if (action === 'delete' && Number.isInteger(targetId) && targetType) {
        openAdminActionModal({
            action,
            type: targetType,
            id: targetId,
            sourceType
        });
        return;
    }

    if (action === 'edit-entry' && entryId) {
        startEntryEdit({ entryId, workerName: entryName });
        return;
    }

    if (action === 'edit-ad' && Number.isInteger(targetId)) {
        await openAdEditor(targetId);
        return;
    }

    if (action === 'edit-support' && Number.isInteger(targetId)) {
        const category = encodeURIComponent(currentSupportCategory || 'NOTICE');
        const query = `?id=${targetId}&sourceType=${encodeURIComponent(sourceType)}&category=${category}`;
        window.location.href = `/admin/support/create${query}`;
        return;
    }

    if (action === 'edit-user' && Number.isInteger(targetId)) {
        await openUserEditModal(targetId);
        return;
    }

    if (action === 'answer-inquiry' && Number.isInteger(targetId)) {
        await openInquiryAnswerModal(targetId);
        return;
    }

    if (action === 'edit-entry' && !entryId) {
        alert('엔트리 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
        return;
    }

    if (['delete', 'toggle-hide', 'edit-ad', 'edit-support', 'edit-user', 'answer-inquiry'].includes(action) && !entryId && !Number.isInteger(targetId)) {
        alert('대상 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
    }
}

function closeSupportModal() {
    supportEditTarget = null;
    document.getElementById('support-modal')?.classList.add('hidden');
}

async function saveSupportArticle() {
    const category = document.getElementById('support-form-category')?.value || 'NOTICE';
    const noticeType = document.getElementById('support-form-notice-type')?.value || 'NOTICE';
    const isPinned = document.getElementById('support-form-is-pinned')?.checked || false;
    const title = document.getElementById('support-form-title')?.value?.trim();
    const content = document.getElementById('support-form-content')?.value?.trim();

    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }

    try {
        if (supportEditTarget) {
            await APIClient.put(`/admin/support/${supportEditTarget.id}?sourceType=${encodeURIComponent(supportEditTarget.sourceType)}`, { category, title, content, noticeType, isPinned, sourceType: supportEditTarget.sourceType });
        } else {
            await APIClient.post('/admin/support', { category, title, content, noticeType, isPinned, sourceType: category === 'NOTICE' ? 'POST' : 'SUPPORT' });
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



function toInquiryTypeLabel(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'post_report') return '게시글 신고';
    if (normalized === 'comment_report') return '댓글 신고';
    if (normalized === 'question') return '일반 문의';
    if (normalized === 'account') return '계정 문의';
    if (normalized === 'service_error') return '서비스 오류';
    if (normalized === 'ad_inquiry') return '광고 문의';
    if (normalized === 'etc' || normalized === 'other') return '기타';
    return '기타';
}

function toInquiryStatusInfo(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'ANSWERED') return { text: '답변완료', className: 'is-completed' };
    return { text: '대기', className: '' };
}

async function loadInquiries() {
    toggleLoading('inquiries', true);
    try {
        const params = currentInquiryStatus ? { status: currentInquiryStatus } : {};
        const response = await APIClient.get('/admin/support/inquiries', params);
        const inquiries = response.content || [];

        const tbody = document.getElementById('inquiries-tbody');
        if (!inquiries.length) {
            tbody.innerHTML = '<tr><td colspan="7">접수된 문의가 없습니다.</td></tr>';
        } else {
            tbody.innerHTML = inquiries.map((inquiry) => {
                const status = toInquiryStatusInfo(inquiry.status);
                return `
                <tr>
                    <td>${inquiry.id}</td>
                    <td>${sanitizeHTML(inquiry.userNickname || inquiry.userEmail || `회원#${inquiry.userId}`)}</td>
                    <td>${toInquiryTypeLabel(inquiry.type)}</td>
                    <td>${sanitizeHTML(inquiry.title || '')}</td>
                    <td><span class="my-inquiry-status ${status.className}">${status.text}</span></td>
                    <td>${formatDate(inquiry.createdAt || inquiry.created_at)}</td>
                    <td><a class="btn btn-sm btn-primary" href="/admin/inquiries/${inquiry.id}/answer">답변</a></td>
                </tr>
                `;
            }).join('');
        }

        showContent('inquiries');
    } catch (error) {
        showError('inquiries', error.message || '문의 목록을 불러오지 못했습니다.');
    }
}

async function openInquiryAnswerModal(inquiryId) {
    try {
        const response = await APIClient.get('/admin/support/inquiries', currentInquiryStatus ? { status: currentInquiryStatus } : {});
        const target = (response.content || []).find((item) => Number(item.id) === Number(inquiryId));
        if (!target) {
            alert('문의를 찾을 수 없습니다.');
            return;
        }

        inquiryAnswerTarget = target;
        document.getElementById('inquiry-answer-modal-title').textContent = `문의 #${target.id} 답변`;
        document.getElementById('inquiry-answer-target').textContent = `${toInquiryTypeLabel(target.type)} · ${target.userNickname || target.userEmail || `회원#${target.userId}`} · ${target.title || ''}`;
        document.getElementById('inquiry-answer-content').value = target.answerContent || '';
        document.getElementById('inquiry-answer-modal')?.classList.remove('hidden');
    } catch (error) {
        alert(error.message || '문의 정보를 불러오지 못했습니다.');
    }
}

function closeInquiryAnswerModal() {
    inquiryAnswerTarget = null;
    document.getElementById('inquiry-answer-modal')?.classList.add('hidden');
}

async function saveInquiryAnswer() {
    if (!inquiryAnswerTarget) return;
    const answerContent = document.getElementById('inquiry-answer-content')?.value?.trim() || '';
    if (!answerContent) {
        alert('답변 내용을 입력해주세요.');
        return;
    }

    try {
        await APIClient.put(`/admin/support/inquiries/${inquiryAnswerTarget.id}/answer`, { answerContent });
        closeInquiryAnswerModal();
        await loadInquiries();
    } catch (error) {
        alert(error.message || '답변 저장에 실패했습니다.');
    }
}


function bindAdminHideToggleButtons(container) {
    if (!container) return;

    const buttons = container.querySelectorAll('[data-admin-action="toggle-hide"]');
    buttons.forEach((button) => {
        button.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const targetId = Number.parseInt(button.dataset.targetId || '', 10);
            const targetType = button.dataset.targetType;
            const isHidden = button.dataset.currentHidden === 'true';

            if (!Number.isInteger(targetId) || !targetType) {
                alert('대상 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
                return;
            }

            await toggleAdminHiddenState(button, {
                type: targetType,
                id: targetId,
                isHidden
            });
        };
    });
}

function renderAdminPostFlags(post) {
    const flags = [];
    if (isHiddenPost(post)) {
        flags.push('<span class="admin-comment-flag hidden">가려짐</span>');
    }
    return flags.join('');
}

function getAdminPostRowClass(post) {
    return isHiddenPost(post) ? 'admin-comment-row-hidden' : '';
}

function renderAdminCommentFlags(comment) {
    const flags = [];
    if (isHiddenComment(comment)) {
        flags.push('<span class="admin-comment-flag hidden">가려짐</span>');
    }
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
    if (isHiddenComment(comment)) classes.push('admin-comment-row-hidden');
    if (isDeletedComment(comment)) classes.push('admin-comment-row-deleted');
    if (isSecretComment(comment)) classes.push('admin-comment-row-secret');
    return classes.join(' ');
}

function isHiddenPost(post) {
    return Boolean(post.isHidden || post.is_hidden);
}

function isHiddenComment(comment) {
    return Boolean(comment.isHidden || comment.is_hidden);
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

function openAdminActionModal(target) {
    adminActionTarget = target;
    const modal = document.getElementById('delete-modal');
    const title = document.getElementById('delete-modal-title');
    const message = document.getElementById('delete-modal-message');
    const helpText = modal?.querySelector('.text-muted.text-sm');

    if (target.type === 'post') {
        if (title) title.textContent = '게시글 삭제';
        if (message) message.textContent = '이 게시글을 삭제하시겠습니까?';
    } else if (target.type === 'comment') {
        if (title) title.textContent = '댓글 삭제';
        if (message) message.textContent = '이 댓글을 삭제하시겠습니까?';
    } else if (target.type === 'user') {
        if (title) title.textContent = '회원 삭제';
        if (message) message.textContent = '이 회원을 삭제하시겠습니까?';
    } else if (target.type === 'ad') {
        if (title) title.textContent = '광고 삭제';
        if (message) message.textContent = '이 광고를 삭제하시겠습니까?';
        if (helpText) helpText.textContent = '삭제된 내용은 복구할 수 없습니다.';
    } else if (target.type === 'entry') {
        if (title) title.textContent = '엔트리 삭제';
        if (message) message.textContent = `"${target.entryName || '선택한 엔트리'}" 항목을 삭제하시겠습니까?`;
        if (helpText) helpText.textContent = '삭제된 엔트리 이름은 복구할 수 없습니다.';
    } else {
        if (title) title.textContent = '공지/FAQ 삭제';
        if (message) message.textContent = '이 글을 삭제하시겠습니까?';
        if (helpText) helpText.textContent = '삭제된 내용은 복구할 수 없습니다.';
    }

    if (helpText && target.type !== 'entry') helpText.textContent = '삭제된 내용은 복구할 수 없습니다.';
    modal?.classList.remove('hidden');
}

function closeDeleteModal() {
    adminActionTarget = null;
    document.getElementById('delete-modal')?.classList.add('hidden');
}

async function toggleAdminHiddenState(actionElement, target) {
    const nextHidden = !target.isHidden;
    const originalText = actionElement.textContent;
    const originalDisabled = actionElement.disabled;

    actionElement.disabled = true;
    actionElement.textContent = nextHidden ? '처리 중...' : '해제 중...';

    try {
        await APIClient.put(`/admin/${target.type === 'post' ? 'posts' : 'comments'}/${target.id}/hide`, { isHidden: nextHidden });
        if (target.type === 'post') await loadPosts();
        else await loadComments();
    } catch (error) {
        actionElement.disabled = originalDisabled;
        actionElement.textContent = originalText;
        alert(error.message || '가리기 설정 변경에 실패했습니다.');
    }
}

async function confirmDelete() {
    if (!adminActionTarget) return;

    try {
        if (adminActionTarget.type === 'post') {
            await APIClient.delete(`/admin/posts/${adminActionTarget.id}`);
            await loadPosts();
        } else if (adminActionTarget.type === 'comment') {
            await APIClient.delete(`/admin/comments/${adminActionTarget.id}`);
            await loadComments();
        } else if (adminActionTarget.type === 'user') {
            await APIClient.delete(`/admin/users/${adminActionTarget.id}`);
            await loadUsers();
        } else if (adminActionTarget.type === 'ad') {
            await APIClient.delete(`/admin/ads/${adminActionTarget.id}`);
            await loadAds();
        } else if (adminActionTarget.type === 'entry') {
            await APIClient.delete(`/admin/entries/${encodeURIComponent(adminActionTarget.entryId)}`);
            if (editingEntryId === adminActionTarget.entryId) resetEntryEditor();
            await loadEntries();
        } else {
            await APIClient.delete(`/admin/support/${adminActionTarget.id}?sourceType=${encodeURIComponent(adminActionTarget.sourceType || 'SUPPORT')}`);
            await loadSupportArticles();
        }
        closeDeleteModal();
    } catch (error) {
        const fallbackMessage = adminActionTarget.action === 'toggle-hide' ? '가리기 설정 변경에 실패했습니다.' : '삭제에 실패했습니다.';
        alert(error.message || fallbackMessage);
    }
}
