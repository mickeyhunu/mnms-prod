import { createPageConfig } from '../shared/createPageConfig.js';

const template = `<main class="piece-chat-page">
  <section class="piece-chat-shell">
    <header class="piece-chat-header"><button id="chat-back" class="piece-chat-back" aria-label="뒤로가기">‹</button><div><h1 id="chat-title">조각 채팅방</h1><p id="chat-member-count">구성원을 불러오는 중</p></div><button id="chat-members" class="piece-chat-icon" aria-label="구성원 보기">☰</button></header>
    <div id="chat-notice" class="piece-chat-notice">조각장, 조각원, 광고주와 관리자가 함께하는 채팅방입니다.</div>
    <div id="chat-messages" class="piece-chat-messages" aria-live="polite"></div>
    <form id="chat-form" class="piece-chat-compose"><textarea id="chat-input" rows="1" maxlength="1000" placeholder="메시지를 입력하세요"></textarea><button>전송</button></form>
  </section>
  <div id="chat-drawer" class="piece-chat-drawer hidden"><button class="piece-chat-drawer-backdrop" data-close-drawer aria-label="닫기"></button><aside><header><h2>채팅방 정보</h2><button data-close-drawer>×</button></header><div id="chat-manager-actions"></div><h3>참여자</h3><div id="chat-member-list"></div><button id="chat-report" class="piece-chat-report">신고하기</button></aside></div>
  <div id="attendance-modal" class="piece-chat-modal hidden"><section><header><h2>출석 체크</h2><button data-close-attendance>×</button></header><p>참여한 조각원의 출석 상태를 기록해주세요.</p><div id="attendance-list"></div></section></div>
</main>`;

export const pieceChatPageConfig = createPageConfig({
  template,
  styles: ['styles/common.css', 'styles/piece-chat.css'],
  scripts: ['scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/api/apiClient.js', 'scripts/js/api/authAPI.js', 'scripts/js/api/pieceChatAPI.js', 'scripts/js/pages/pieceChat.js']
});
