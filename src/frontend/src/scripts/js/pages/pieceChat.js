let pieceChatId = null;
let pieceChatRoom = null;
let pieceChatPollTimer = null;
let pieceChatPolling = false;
const PIECE_CHAT_DEFAULT_PROFILE_IMAGE_URL = '/src/assets/image/img_profile.png';

function chatEscape(value) { return sanitizeHTML(String(value || '')); }
function chatRoleLabel(role) { return ({ ADMIN: '관리자', LEADER: '조각장', ADVERTISER: '광고주', MEMBER: '조각원' })[role] || '구성원'; }
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
    return `<article class="piece-message ${mine ? 'is-mine' : ''}" data-message-id="${Number(message.id) || ''}">${mine ? '' : `<div class="piece-message-avatar">${avatar(member)}</div>`}<div><span class="piece-message-name">${mine ? '' : chatEscape(message.nickname)}</span><div class="piece-message-row"><div class="piece-message-bubble">${chatEscape(message.content).replace(/\n/g, '<br>')}</div><time>${new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></div></div></article>`;
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
    document.getElementById('chat-member-count').textContent = `참여자 ${pieceChatRoom.members.length}명`;
    document.getElementById('chat-member-list').innerHTML = pieceChatRoom.members.map((member) => {
        const mine = Number(member.userId) === Number(pieceChatRoom.currentUserId);
        return `<div class="piece-chat-member"><div class="piece-chat-member-avatar">${avatar(member)}</div><div><strong>${mine ? '<span class="piece-chat-member-me">나</span>' : ''}${chatEscape(member.nickname)}</strong><span>${chatRoleLabel(member.roomRole)}</span></div></div>`;
    }).join('');
    document.getElementById('chat-manager-actions').innerHTML = pieceChatRoom.canManage ? '<button id="open-attendance" class="piece-chat-manage">✓ <span>출석 체크</span></button>' : '';
    document.getElementById('open-attendance')?.addEventListener('click', openAttendance);
}
function renderRoom() {
    document.getElementById('chat-title').textContent = pieceChatRoom.post.title || '조각 채팅방';
    renderMessages(); renderMembers();
}
function openAttendance() {
    const list = document.getElementById('attendance-list');
    list.innerHTML = pieceChatRoom.participants.map((member) => `<div class="attendance-member"><div class="piece-chat-member-avatar">${avatar(member)}</div><strong>${chatEscape(member.nickname)}</strong><div class="attendance-controls"><button data-attendance="PRESENT" data-user-id="${member.userId}" class="${member.attendanceStatus === 'PRESENT' ? 'is-done' : ''}">${member.attendanceStatus === 'PRESENT' ? '✓ 완료' : '출석'}</button><button data-attendance="ABSENT" data-user-id="${member.userId}" class="absent ${member.attendanceStatus === 'ABSENT' ? 'is-done' : ''}">${member.attendanceStatus === 'ABSENT' ? '✓ 미출석' : '미출석'}</button>${pieceChatRoom.canManage ? `<button data-remove="${member.userId}" class="remove">내보내기</button>` : ''}</div></div>`).join('') || '<p>참여한 조각원이 없습니다.</p>';
    document.getElementById('attendance-modal').classList.remove('hidden');
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
async function pollPieceChatMessages() {
    if (pieceChatPolling || !pieceChatRoom || document.hidden) return;
    pieceChatPolling = true;
    try {
        addNewMessages(await PieceChatAPI.getMessages(pieceChatId, latestMessageId()));
    } catch (error) {
        if (![401, 403, 404].includes(error.status)) console.warn('채팅 메시지를 다시 불러오지 못했습니다.', error);
    } finally {
        pieceChatPolling = false;
    }
}
function startPieceChatPolling() {
    clearInterval(pieceChatPollTimer);
    pieceChatPollTimer = setInterval(pollPieceChatMessages, 2000);
    document.addEventListener('visibilitychange', pollPieceChatMessages);
    window.addEventListener('pagehide', stopPieceChatPolling, { once: true });
}
function stopPieceChatPolling() {
    clearInterval(pieceChatPollTimer);
    pieceChatPollTimer = null;
    document.removeEventListener('visibilitychange', pollPieceChatMessages);
}
function initPieceChatPage() {
    pieceChatId = window.location.pathname.split('/').filter(Boolean).pop();
    if (!Auth.isAuthenticated()) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return; }
    document.getElementById('chat-back').onclick = () => history.length > 1 ? history.back() : window.location.assign('/community');
    document.getElementById('chat-members').onclick = () => document.getElementById('chat-drawer').classList.remove('hidden');
    document.querySelectorAll('[data-close-drawer]').forEach((button) => button.onclick = () => document.getElementById('chat-drawer').classList.add('hidden'));
    document.querySelector('[data-close-attendance]').onclick = () => document.getElementById('attendance-modal').classList.add('hidden');
    document.getElementById('chat-report').onclick = () => { const reason = prompt('신고 사유를 입력해주세요.'); if (reason?.trim()) alert('신고가 접수되었습니다. 관리자가 확인하겠습니다.'); };
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    chatForm.onsubmit = async (event) => { event.preventDefault(); const content = chatInput.value.trim(); if (!content) return; const message = await PieceChatAPI.send(pieceChatId, content); addNewMessages([message]); chatInput.value = ''; };
    chatInput.onkeydown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        chatForm.requestSubmit();
    };
    document.getElementById('attendance-list').onclick = async (event) => { const attendance = event.target.closest('[data-attendance]'); const remove = event.target.closest('[data-remove]'); try { if (attendance) { pieceChatRoom = await PieceChatAPI.attendance(pieceChatId, attendance.dataset.userId, attendance.dataset.attendance); renderRoom(); openAttendance(); } else if (remove && confirm('이 조각원을 채팅방과 조각에서 내보낼까요?')) { await PieceChatAPI.remove(pieceChatId, remove.dataset.remove); await loadPieceChat(); openAttendance(); } } catch (error) { alert(error.message); } };
    loadPieceChat().then(startPieceChatPolling);
}
window.initPieceChatPage = initPieceChatPage;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPieceChatPage, { once: true });
else initPieceChatPage();
