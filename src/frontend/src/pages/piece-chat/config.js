import { createPageConfig } from '../shared/createPageConfig.js';

const template = `<main class="piece-chat-page">
  <section class="piece-chat-shell">
    <header class="piece-chat-header"><button id="chat-back" class="piece-chat-back" aria-label="뒤로가기">‹</button><h1 id="chat-title">조각 채팅방</h1><p id="chat-member-count">구성원을 불러오는 중</p><div></div><button id="chat-members" class="piece-chat-icon" aria-label="구성원 보기" aria-controls="chat-drawer" aria-expanded="false">☰</button></header>
    <div id="chat-messages" class="piece-chat-messages"><div id="chat-notice" class="piece-chat-notice">조각 채팅방이 시작되었습니다.
조각장, 조각원, 광고주와 관리자가 함께하는 채팅방입니다.
서로를 존중하고 배려하며 건강한 조각 문화를 만들어주세요!</div><div id="chat-message-list" aria-live="polite"></div></div>
    <form id="chat-form" class="piece-chat-compose"><textarea id="chat-input" rows="1" maxlength="1000" placeholder="메시지를 입력하세요"></textarea><button>전송</button></form>
  </section>
  <div id="chat-drawer" class="piece-chat-drawer" aria-hidden="true"><button class="piece-chat-drawer-backdrop" data-close-drawer aria-label="닫기" tabindex="-1"></button><aside><header><h2></h2><button data-close-drawer aria-label="구성원 보기 닫기" tabindex="-1">×</button></header><h3>참여자</h3><div id="chat-member-list"></div><button id="chat-cancel-participation" class="piece-chat-cancel hidden">참여 취소</button></aside></div>
</main>`;

export const pieceChatPageConfig = createPageConfig({
  template,
  styles: ['styles/common.css', 'styles/piece-chat.css'],
  scripts: ['scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/api/apiClient.js', 'scripts/js/api/authAPI.js', 'scripts/js/api/postAPI.js', 'scripts/js/api/pieceChatAPI.js', 'scripts/js/pages/pieceChat.js']
});
