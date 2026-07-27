import { createPageConfig } from '../shared/createPageConfig.js';

const template = `<main class="piece-chat-page">
  <section class="piece-chat-shell">
    <header class="piece-chat-header"><button id="chat-back" class="piece-chat-back" aria-label="뒤로가기">‹</button><h1 id="chat-title">조각 채팅방</h1><p id="chat-member-count">구성원을 불러오는 중</p><div></div><button id="chat-refresh" class="piece-chat-refresh" type="button" aria-label="채팅 새로고침">↻</button><button id="chat-members" class="piece-chat-icon" type="button" aria-label="구성원 보기" aria-controls="chat-drawer" aria-expanded="false">☰</button></header>
    <div id="chat-messages" class="piece-chat-messages"><div id="chat-message-list" aria-live="polite"></div></div>
    <form id="chat-form" class="piece-chat-compose"><p id="chat-ended-notice" class="piece-chat-ended-notice hidden">종료된 조각에서는 더 이상 채팅할 수 없습니다.</p><textarea id="chat-input" rows="1" maxlength="1000" placeholder="메시지를 입력하세요"></textarea><button>전송</button></form>
  </section>
  <div id="chat-drawer" class="piece-chat-drawer" aria-hidden="true"><button class="piece-chat-drawer-backdrop" data-close-drawer aria-label="닫기" tabindex="-1"></button><aside><header><h2></h2><button data-close-drawer aria-label="구성원 보기 닫기" tabindex="-1">×</button></header><h3>참여자</h3><div id="chat-member-list"></div><button type="button" class="btn piece-join-btn btn-secondary hidden" id="chat-cancel-participation" data-piece-action="cancel">참여 취소</button></aside></div>
</main>`;

export const pieceChatPageConfig = createPageConfig({
  template,
  styles: ['styles/common.css', 'styles/piece-chat.css'],
  scripts: ['scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/api/apiClient.js', 'scripts/js/api/authAPI.js', 'scripts/js/api/postAPI.js', 'scripts/js/api/pieceChatAPI.js', 'scripts/js/pages/pieceChat.js']
});
