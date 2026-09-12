/**
 * 파일 역할: 전체 화면 레이아웃과 라우팅 렌더링 흐름을 조합하는 최상위 앱 컴포넌트 파일.
 */
export default {
  template: `
    <router-view />
    <a
      v-if="!$route.meta.hideTelegramChatButton"
      class="telegram-chat-button"
      href="https://t.me/mnmens_official"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="텔레그램으로 문의하기 (@mnmens_official)"
      title="텔레그램 문의"
    >
      <img
        class="telegram-chat-button__image"
        src="/src/assets/image/telegram-chat-button.webp"
        alt=""
      />
    </a>
  `
};
