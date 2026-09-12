/**
 * 파일 역할: header UI 상호작용을 담당하는 재사용 컴포넌트 스크립트 파일.
 */
const HeaderNotificationCenter = {
    refreshTimer: null,
    outsideClickHandler: null,
    viewMode: 'unread',
    currentMessages: [],

    async init() {
        const user = Auth.getUser();
        const button = document.getElementById('header-notification-button');
        const panel = document.getElementById('header-notification-panel');

        if (!user || !button || !panel || typeof APIClient === 'undefined') {
            this.teardown();
            return;
        }

        this.viewMode = 'unread';
        this.bindEvents();
        await this.refresh();
        this.startAutoRefresh();
    },

    teardown() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    },

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, 60000);
    },

    bindEvents() {
        const button = document.getElementById('header-notification-button');
        const readAllButton = document.getElementById('header-notification-read-all');

        if (button && button.dataset.boundNotification !== 'true') {
            button.dataset.boundNotification = 'true';
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const panel = document.getElementById('header-notification-panel');
                if (!panel) {
                    return;
                }
                const willOpen = panel.classList.contains('hidden');
                this.setOpenState(willOpen);
                if (willOpen) {
                    this.viewMode = 'unread';
                    if (typeof HeaderUserMenu !== 'undefined' && typeof HeaderUserMenu.setOpenState === 'function') {
                        HeaderUserMenu.setOpenState(false);
                    }
                    await this.refresh();
                }
            });
        }

        if (readAllButton && readAllButton.dataset.boundNotificationReadAll !== 'true') {
            readAllButton.dataset.boundNotificationReadAll = 'true';
            readAllButton.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this.viewMode !== 'unread') {
                    this.viewMode = 'unread';
                    this.renderCurrentState();
                    return;
                }
                this.markAllAsRead();
            });
        }

        const list = document.getElementById('header-notification-list');
        if (list && list.dataset.boundNotificationList !== 'true') {
            list.dataset.boundNotificationList = 'true';
            list.addEventListener('click', async (event) => {
                event.stopPropagation();
                const item = event.target.closest('[data-notification-key]');
                if (!item) return;
                const notificationKey = item.dataset.notificationKey;
                if (item.dataset.notificationType === 'admin_message') {
                    await this.openAdminMessage(item.dataset.notificationId);
                    return;
                }
                await this.markAsRead(notificationKey);
                const targetUrl = item.dataset.notificationUrl;
                if (targetUrl) {
                    window.location.href = targetUrl;
                }
            });
        }

        const inboxActions = document.querySelector('.header-notification-inbox-actions');
        if (inboxActions && inboxActions.dataset.boundInboxActions !== 'true') {
            inboxActions.dataset.boundInboxActions = 'true';
            inboxActions.addEventListener('click', async (event) => {
                event.stopPropagation();
                const action = event.target.closest('[data-notification-action]')?.dataset.notificationAction;
                if (action === 'view-all') {
                    this.viewMode = 'notifications';
                    this.renderCurrentState();
                } else if (action === 'view-messages') {
                    await this.showMessageInbox();
                }
            });
        }

        if (!this.outsideClickHandler) {
            this.outsideClickHandler = (event) => {
                const wrapper = document.querySelector('.header-notification-wrapper');
                const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : [];
                const clickedInsideWrapper = wrapper && (
                    wrapper.contains(event.target) || eventPath.includes(wrapper)
                );

                if (!wrapper || clickedInsideWrapper) {
                    return;
                }
                this.setOpenState(false);
            };
            document.addEventListener('click', this.outsideClickHandler);
        }
    },

    setOpenState(isOpen) {
        const button = document.getElementById('header-notification-button');
        const panel = document.getElementById('header-notification-panel');
        if (!button || !panel) return;

        panel.classList.toggle('hidden', !isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
    },

    async markAsRead(notificationKey) {
        if (!notificationKey) return;
        try {
            await APIClient.post('/users/me/notifications/read', {
                notificationKeys: [notificationKey]
            });
            if (Array.isArray(this.currentNotifications)) {
                this.currentNotifications = this.currentNotifications.map((item) => (
                    item.notificationKey === notificationKey
                        ? { ...item, isRead: true, readAt: new Date().toISOString() }
                        : item
                ));
            }
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },

    async openAdminMessage(messageId) {
        if (!messageId) return;
        try {
            const response = await APIClient.post(`/users/me/admin-messages/${messageId}/read`, {});
            this.currentMessages = this.currentMessages.map((item) => (
                Number(item.sourceId) === Number(messageId)
                    ? { ...item, isRead: true, readAt: response.message?.readAt || new Date().toISOString() }
                    : item
            ));
            this.showAdminMessageModal(response.message);
            await this.refresh();
        } catch (error) {
            console.error('Failed to open admin message:', error);
        }
    },

    showAdminMessageModal(message) {
        document.getElementById('admin-message-view-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'admin-message-view-modal';
        modal.className = 'admin-message-view-modal';
        modal.innerHTML = `
            <div class="admin-message-view-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-message-view-title">
                <div class="admin-message-view-header"><strong id="admin-message-view-title">${this.escapeHtml(message.title || '관리자 쪽지')}</strong><button type="button" aria-label="쪽지 닫기">&times;</button></div>
                <div class="admin-message-view-meta">${this.escapeHtml(message.senderNickname || '운영팀')} · ${this.formatDate(message.createdAt)}</div>
                <div class="admin-message-view-content">${this.escapeHtml(message.content || '')}</div>
                <div class="admin-message-view-footer"><button type="button" class="btn btn-primary">확인</button></div>
            </div>`;
        const close = () => modal.remove();
        modal.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('.admin-message-view-header button, .admin-message-view-footer button')) close(); });
        document.body.appendChild(modal);
        modal.querySelector('.admin-message-view-footer button')?.focus();
    },

    async markAllAsRead() {
        try {
            await APIClient.post('/users/me/notifications/read-all', { limit: 100 });
            if (Array.isArray(this.currentNotifications)) {
                const readAt = new Date().toISOString();
                this.currentNotifications = this.currentNotifications.map((item) => (
                    item.type === 'admin_message'
                        ? item
                        : { ...item, isRead: true, readAt }
                ));
            }
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    },

    async refresh() {
        try {
            const response = await APIClient.get('/users/me/notifications', { limit: 30 });
            this.currentNotifications = Array.isArray(response.content) ? response.content : [];
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            this.currentNotifications = [];
            this.renderErrorState();
        }
    },

    async showMessageInbox() {
        this.viewMode = 'messages';
        this.renderLoadingState('쪽지를 불러오는 중입니다.');
        try {
            const messages = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const response = await APIClient.get('/users/me/admin-messages', { page, limit: 50 });
                messages.push(...(Array.isArray(response.content) ? response.content : []));
                hasMore = Boolean(response.pagination?.hasMore);
                page += 1;
            }
            this.currentMessages = messages.map((item) => ({
                notificationKey: `admin-message-${item.id}`,
                type: 'admin_message',
                sourceId: item.id,
                title: item.title,
                content: item.content,
                actorNickname: item.senderNickname,
                message: item.title,
                createdAt: item.createdAt,
                readAt: item.readAt,
                isRead: Boolean(item.readAt)
            }));
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            this.renderErrorState('쪽지를 불러오지 못했습니다.');
        }
    },

    renderLoadingState(message) {
        const list = document.getElementById('header-notification-list');
        if (list) list.innerHTML = `<div class="header-notification-empty">${this.escapeHtml(message)}</div>`;
    },

    renderCurrentState() {
        const list = document.getElementById('header-notification-list');
        const dot = document.getElementById('header-notification-dot');
        const readAllButton = document.getElementById('header-notification-read-all');
        if (!list || !dot || !readAllButton) return;

        const allNotifications = (this.currentNotifications || []).filter((item) => item.type !== 'admin_message');
        const unreadNotifications = allNotifications.filter((item) => !item.isRead);
        const unreadMessages = (this.currentNotifications || []).filter((item) => item.type === 'admin_message' && !item.isRead);
        const hasUnread = unreadNotifications.length > 0 || unreadMessages.length > 0;

        dot.classList.toggle('hidden', !hasUnread);
        readAllButton.textContent = this.viewMode === 'unread' ? '모두 확인' : '새 알림';
        readAllButton.classList.toggle('hidden', this.viewMode === 'messages' || (this.viewMode === 'unread' && !unreadNotifications.length));

        const notifications = this.viewMode === 'messages'
            ? this.currentMessages
            : this.viewMode === 'notifications' ? allNotifications : unreadNotifications;
        document.querySelectorAll('.header-notification-view-all').forEach((button) => {
            const active = (this.viewMode === 'notifications' && button.dataset.notificationAction === 'view-all')
                || (this.viewMode === 'messages' && button.dataset.notificationAction === 'view-messages');
            button.classList.toggle('is-active', active);
        });

        if (!notifications.length) {
            const message = this.viewMode === 'messages' ? '받은 쪽지가 없습니다.'
                : this.viewMode === 'notifications' ? '알림 내역이 없습니다.' : '새로운 알림이 없습니다.';
            list.innerHTML = `<div class="header-notification-empty"><div>${message}</div></div>`;
            return;
        }

        list.innerHTML = notifications.map((item) => {
            const isUnread = !item.isRead;
            return `
                <button type="button" class="header-notification-item ${isUnread ? 'is-unread' : ''}" data-notification-key="${item.notificationKey}" data-notification-url="${item.targetUrl || ''}" data-notification-type="${item.type || ''}" data-notification-id="${item.sourceId || ''}">
                    <div class="header-notification-item-top">
                        <span class="header-notification-item-type">${this.getTypeLabel(item.type)}</span>
                        <span class="header-notification-item-date">${this.formatDate(item.createdAt)}</span>
                    </div>
                    <div class="header-notification-item-message">${this.escapeHtml(item.message || '')}</div>
                    <div class="header-notification-item-sub">${this.buildSubText(item)}</div>
                </button>
            `;
        }).join('');
    },

    renderErrorState(message = '알림을 불러오지 못했습니다.') {
        const list = document.getElementById('header-notification-list');
        if (!list) return;
        list.innerHTML = `<div class="header-notification-empty">${this.escapeHtml(message)}</div>`;
        const dot = document.getElementById('header-notification-dot');
        if (dot) {
            dot.classList.add('hidden');
        }
    },

    getTypeLabel(type) {
        if (type === 'post_comment') return '내 글 댓글';
        if (type === 'comment_reply') return '내 댓글 대댓글';
        if (type === 'piece_chat_message') return '조각 채팅';
        if (type === 'piece_created_for_ad') return '내 광고 조각';
        if (type === 'stamp_event_request') return '스탬프 이벤트';
        if (type === 'admin_notice') return '관리자 알림';
        if (type === 'admin_message') return '관리자 쪽지';
        if (type === 'admin_attendance_comment_report') return '코멘트 신고';
        if (type === 'inquiry_answer') return '1:1 문의 답변';
        return '알림';
    },

    buildSubText(item) {
        const chunks = [];
        const contentFirstLine = this.getContentFirstLine(item.content);
        if (item.actorNickname) chunks.push(this.escapeHtml(item.actorNickname));
        if (contentFirstLine) chunks.push(this.escapeHtml(contentFirstLine));
        return chunks.join(' · ');
    },

    getContentFirstLine(value) {
        return String(value || '')
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .split(/\r?\n/)
            .map((line) => line.trim().replace(/\s+/g, ' '))
            .find(Boolean) || '';
    },

    formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};


const HeaderUserMenu = {
    outsideClickHandler: null,

    init() {
        const button = document.getElementById('user-nickname');
        const dropdown = document.getElementById('header-user-dropdown');
        const menu = document.getElementById('header-user-menu');

        if (!button || !dropdown || !menu) {
            this.teardown();
            return;
        }

        if (button.dataset.boundUserMenu !== 'true') {
            button.dataset.boundUserMenu = 'true';
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = dropdown.classList.contains('hidden');
                this.setOpenState(willOpen);
            });
        }

        if (!this.outsideClickHandler) {
            this.outsideClickHandler = (event) => {
                if (menu.contains(event.target)) {
                    return;
                }
                this.setOpenState(false);
            };
            document.addEventListener('click', this.outsideClickHandler);
        }
    },

    setOpenState(isOpen) {
        const button = document.getElementById('user-nickname');
        const dropdown = document.getElementById('header-user-dropdown');
        if (!button || !dropdown) return;

        if (isOpen && typeof HeaderNotificationCenter !== 'undefined' && typeof HeaderNotificationCenter.setOpenState === 'function') {
            HeaderNotificationCenter.setOpenState(false);
        }

        dropdown.classList.toggle('hidden', !isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
    },

    teardown() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    }
};

async function initHeader() {
    if (typeof Auth.restoreSessionIfNeeded === 'function') {
        await Auth.restoreSessionIfNeeded();
    }

    Auth.updateHeaderUI();
    Auth.bindLogoutButton();
    HeaderUserMenu.init();
    HeaderNotificationCenter.init();
}

function autoInitHeader() {
    const hasHeaderAuthTargets = document.getElementById('nav-guest')
        || document.getElementById('nav-user')
        || document.getElementById('logout-btn')
        || document.getElementById('user-nickname')
        || document.getElementById('header-user-dropdown');

    if (!hasHeaderAuthTargets || typeof Auth === 'undefined') {
        return;
    }

    initHeader().catch((error) => {
        console.error('Header initialization failed:', error);
        Auth.updateHeaderUI();
    });
}

function updateHeaderForUser(user) {
    const navGuest = document.getElementById('nav-guest');
    const navUser = document.getElementById('nav-user');
    const userNickname = (typeof Auth !== 'undefined' && typeof Auth.resolveNicknameDisplayElement === 'function')
        ? Auth.resolveNicknameDisplayElement()
        : document.getElementById('user-nickname-label');
    const adminLink = document.getElementById('admin-link');

    if (user) {
        hideElement(navGuest);
        showElement(navUser);

        if (userNickname) {
            Auth.applyNicknameDisplay(userNickname, user);
        }

        HeaderUserMenu.setOpenState(false);

        if (adminLink) {
            toggleElement(adminLink, typeof Auth !== 'undefined' && typeof Auth.isAdminAccount === 'function'
                ? Auth.isAdminAccount(user)
                : user.isAdmin);
        }
    } else {
        HeaderUserMenu.setOpenState(false);
        showElement(navGuest);
        hideElement(navUser);
    }
}


autoInitHeader();
