let pieceChatId = null;
let pieceChatRoom = null;
let pieceChatPollTimer = null;
let pieceChatPolling = false;
const PIECE_CHAT_DEFAULT_PROFILE_IMAGE_URL = '/src/assets/image/img_profile.png';

function chatEscape(value) { return sanitizeHTML(String(value || '')); }
function chatRoleLabel(role) { return ({ ADMIN: '관리자', LEADER: '조각장', ADVERTISER: '광고주', MEMBER: '조각원' })[role] || '구성원'; }
function chatMemberProfileHref(member) {
    const nickname = String(member?.nickname || '').trim();
    return nickname && nickname !== '익명' ? `/@${encodeURIComponent(nickname)}` : '';
}
function avatar(member) {
    const profileImageUrl = String(member.profileImageUrl || '').trim() || PIECE_CHAT_DEFAULT_PROFILE_IMAGE_URL;
    return `<img src="${chatEscape(profileImageUrl)}" alt="" onerror="this.onerror=null;this.src='${PIECE_CHAT_DEFAULT_PROFILE_IMAGE_URL}';">`;
}
function messageMarkup(message) {
    if (message.messageType === 'SYSTEM') {
        return `<div class="piece-chat-system-message" data-message-id="${Number(message.id) || ''}">${chatEscape(message.content)}</div>`;
    }
    const mine = Number(message.userId) === Number(pieceChatRoom.currentUserId);
    const member = pieceChatRoom.members.find((item) => Number(item.userId) === Number(message.userId)) || message;
    const profileHref = chatMemberProfileHref(member);
    const profileLabel = chatEscape(member.nickname || message.nickname);
    const profileAvatar = profileHref ? `<a class="piece-message-avatar" href="${profileHref}" aria-label="${profileLabel} 프로필 보기">${avatar(member)}</a>` : `<div class="piece-message-avatar">${avatar(member)}</div>`;
    const profileName = profileHref ? `<a class="piece-message-name" href="${profileHref}">${profileLabel}</a>` : `<span class="piece-message-name">${profileLabel}</span>`;
    return `<article class="piece-message ${mine ? 'is-mine' : ''}" data-message-id="${Number(message.id) || ''}">${mine ? '' : profileAvatar}<div>${mine ? '' : profileName}<div class="piece-message-row"><div class="piece-message-bubble">${chatEscape(message.content).replace(/\n/g, '<br>')}</div><time>${new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></div></div></article>`;
}
function chatDateKey(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function chatDateLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}
function messagesMarkup(messages) {
    let previousDate = '';
    return messages.map((message) => {
        const date = chatDateKey(message.createdAt);
        const separator = date && date !== previousDate ? `<div class="piece-chat-date"><span>${chatEscape(chatDateLabel(message.createdAt))}</span></div>` : '';
        previousDate = date || previousDate;
        return separator + messageMarkup(message);
    }).join('');
}
function renderMessages() {
    const root = document.getElementById('chat-messages');
    const list = document.getElementById('chat-message-list');
    list.innerHTML = messagesMarkup(pieceChatRoom.messages || []) || '<p class="piece-chat-empty">첫 메시지를 남겨보세요.</p>';
    root.scrollTop = root.scrollHeight;
}
function appendMessages() {
    renderMessages();
}
function renderMembers() {
    const visibleMembers = pieceChatRoom.members.filter((member) => member.roomRole !== 'ADMIN');
    const participants = new Map((pieceChatRoom.participants || []).map((member) => [Number(member.userId), member]));
    document.getElementById('chat-member-count').textContent = `참여자 ${visibleMembers.length}명`;
    document.getElementById('chat-member-list').innerHTML = visibleMembers.map((member) => {
        const mine = Number(member.userId) === Number(pieceChatRoom.currentUserId);
        const canRemove = pieceChatRoom.canManage && member.roomRole === 'MEMBER' && !mine;
        const participant = participants.get(Number(member.userId));
        const profileHref = chatMemberProfileHref(member);
        const profileLabel = chatEscape(member.nickname);
        const profileAvatar = profileHref ? `<a class="piece-chat-member-avatar" href="${profileHref}" aria-label="${profileLabel} 프로필 보기">${avatar(member)}</a>` : `<div class="piece-chat-member-avatar">${avatar(member)}</div>`;
        const profileName = profileHref ? `<a class="piece-chat-member-name" href="${profileHref}">${profileLabel}</a>` : profileLabel;
        const attendance = pieceChatRoom.canManage && participant ? `<button type="button" class="piece-chat-attendance ${participant.attendanceStatus === 'PRESENT' ? 'is-done' : ''}" data-attendance-member="${member.userId}" aria-pressed="${participant.attendanceStatus === 'PRESENT'}">${participant.attendanceStatus === 'PRESENT' ? '✓ 출석 완료' : '출석'}</button>` : '';
        const menu = mine ? '' : `<div class="piece-chat-member-menu">${attendance}<button class="piece-chat-member-more" type="button" data-member-menu aria-label="${chatEscape(member.nickname)} 메뉴" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="12" cy="19" r="1.4"></circle></svg></button><div class="piece-chat-member-actions hidden"><button type="button" data-report-member="${member.userId}" data-member-nickname="${chatEscape(member.nickname)}">신고</button>${canRemove ? `<button type="button" class="danger" data-remove-member="${member.userId}">내보내기</button>` : ''}</div></div>`;
        return `<div class="piece-chat-member">${profileAvatar}<div class="piece-chat-member-info"><strong>${mine ? '<span class="piece-chat-member-me">나</span>' : ''}${profileName}</strong><span>${chatRoleLabel(member.roomRole)}</span></div>${menu}</div>`;
    }).join('');
    document.getElementById('chat-cancel-participation').classList.toggle('hidden', pieceChatRoom.viewerRole !== 'MEMBER');
}
function renderRoom() {
    document.getElementById('chat-title').textContent = pieceChatRoom.post.title || '조각 채팅방';
    renderMessages(); renderMembers(); renderChatAvailability();
}
function renderChatAvailability() {
    const ended = Boolean(pieceChatRoom?.lifecycle?.isEnded);
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    form.classList.toggle('is-ended', ended);
    document.getElementById('chat-ended-notice').classList.toggle('hidden', !ended);
    input.disabled = ended;
    form.querySelector('button[type="submit"], button:not([type])').disabled = ended;
}
async function loadPieceChat() {
    try { pieceChatRoom = await PieceChatAPI.getRoom(pieceChatId); renderRoom(); }
    catch (error) { alert(error.message || '채팅방에 입장할 수 없습니다.'); window.location.href = '/community'; }
}
function latestMessageId() {
    return Math.max(0, ...(pieceChatRoom?.messages || []).map((message) => Number(message.id) || 0));
}
function addNewMessages(messages) {
    const knownIds = new Set((pieceChatRoom.messages || []).map((message) => Number(message.id)));
    const freshMessages = messages.filter((message) => !knownIds.has(Number(message.id)));
    if (!freshMessages.length) return;
    pieceChatRoom.messages.push(...freshMessages);
    appendMessages(freshMessages);
}
function memberStateKey(room) {
    return JSON.stringify({ members: room?.members || [], participants: room?.participants || [], canManage: room?.canManage, lifecycle: room?.lifecycle || null });
}
function updateMembers(memberState) {
    if (memberStateKey(pieceChatRoom) === memberStateKey(memberState)) return;
    Object.assign(pieceChatRoom, memberState);
    renderMembers();
    renderChatAvailability();
}
async function pollPieceChatUpdates() {
    if (pieceChatPolling || !pieceChatRoom || document.hidden) return;
    pieceChatPolling = true;
    try {
        const [messages, memberState] = await Promise.all([
            PieceChatAPI.getMessages(pieceChatId, latestMessageId()),
            PieceChatAPI.getMembers(pieceChatId)
        ]);
        addNewMessages(messages);
        updateMembers(memberState);
    } catch (error) {
        if (![401, 403, 404].includes(error.status)) console.warn('채팅방 정보를 다시 불러오지 못했습니다.', error);
    } finally {
        pieceChatPolling = false;
    }
}
function startPieceChatPolling() {
    clearInterval(pieceChatPollTimer);
    pieceChatPollTimer = setInterval(pollPieceChatUpdates, 2000);
    document.addEventListener('visibilitychange', pollPieceChatUpdates);
    window.addEventListener('pagehide', stopPieceChatPolling, { once: true });
}
function stopPieceChatPolling() {
    clearInterval(pieceChatPollTimer);
    pieceChatPollTimer = null;
    document.removeEventListener('visibilitychange', pollPieceChatUpdates);
}
function closeMemberMenus() {
    document.querySelectorAll('.piece-chat-member-actions').forEach((actions) => actions.classList.add('hidden'));
    document.querySelectorAll('[data-member-menu]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
}
function setMemberDrawerOpen(open) {
    const drawer = document.getElementById('chat-drawer');
    const trigger = document.getElementById('chat-members');
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    trigger.setAttribute('aria-expanded', String(open));
    drawer.querySelectorAll('[data-close-drawer]').forEach((button) => { button.tabIndex = open ? 0 : -1; });
    if (!open) closeMemberMenus();
}
function initPieceChatPage() {
    pieceChatId = window.location.pathname.split('/').filter(Boolean).pop();
    if (!Auth.isAuthenticated()) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return; }
    setMemberDrawerOpen(false);
    document.getElementById('chat-drawer').classList.add('is-ready');
    document.getElementById('chat-back').onclick = () => history.length > 1 ? history.back() : window.location.assign('/community');
    document.getElementById('chat-refresh').onclick = () => window.location.reload();
    document.getElementById('chat-members').onclick = () => setMemberDrawerOpen(true);
    document.querySelectorAll('[data-close-drawer]').forEach((button) => button.onclick = () => setMemberDrawerOpen(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.getElementById('chat-drawer').classList.contains('is-open')) {
            setMemberDrawerOpen(false);
            document.getElementById('chat-members').focus();
        }
    });
    document.getElementById('chat-cancel-participation').onclick = async () => {
        if (!confirm('이 조각 참여를 취소할까요?')) return;
        try { await PostAPI.cancelPieceJoin(pieceChatId); window.location.href = `/post-detail/${pieceChatId}`; }
        catch (error) { alert(error.message || '참여 취소 중 오류가 발생했습니다.'); }
    };
    document.getElementById('chat-member-list').onclick = async (event) => {
        const attendanceButton = event.target.closest('[data-attendance-member]');
        const menuButton = event.target.closest('[data-member-menu]');
        const reportButton = event.target.closest('[data-report-member]');
        const removeButton = event.target.closest('[data-remove-member]');
        if (attendanceButton) {
            const attendanceStatus = attendanceButton.classList.contains('is-done') ? 'ABSENT' : 'PRESENT';
            try { pieceChatRoom = await PieceChatAPI.attendance(pieceChatId, attendanceButton.dataset.attendanceMember, attendanceStatus); renderRoom(); }
            catch (error) { alert(error.message || '출석 처리 중 오류가 발생했습니다.'); }
        } else if (menuButton) {
            const actions = menuButton.nextElementSibling;
            const opening = actions.classList.contains('hidden');
            closeMemberMenus();
            actions.classList.toggle('hidden', !opening);
            menuButton.setAttribute('aria-expanded', String(opening));
        } else if (reportButton) {
            window.location.href = `/customer-service?type=member&targetId=${encodeURIComponent(reportButton.dataset.reportMember)}&nickname=${encodeURIComponent(reportButton.dataset.memberNickname)}`;
        } else if (removeButton && confirm('이 조각원을 조각에서 내보낼까요? 내보낸 회원은 다시 참여할 수 없습니다.')) {
            try { await PieceChatAPI.remove(pieceChatId, removeButton.dataset.removeMember); await loadPieceChat(); }
            catch (error) { alert(error.message || '내보내기 중 오류가 발생했습니다.'); }
        }
    };
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.piece-chat-member-menu')) closeMemberMenus();
    });
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    chatForm.onsubmit = async (event) => { event.preventDefault(); const content = chatInput.value.trim(); if (!content || pieceChatRoom?.lifecycle?.isEnded) return; try { const message = await PieceChatAPI.send(pieceChatId, content); addNewMessages([message]); chatInput.value = ''; } catch (error) { if (error.status === 409) { await loadPieceChat(); } alert(error.message || '메시지를 전송하지 못했습니다.'); } };
    chatInput.onkeydown = (event) => {
        const usesMobileInput = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 680px)').matches;
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229 || usesMobileInput) return;
        event.preventDefault();
        chatForm.requestSubmit();
    };
    loadPieceChat().then(startPieceChatPolling);
}
window.initPieceChatPage = initPieceChatPage;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPieceChatPage, { once: true });
else initPieceChatPage();
