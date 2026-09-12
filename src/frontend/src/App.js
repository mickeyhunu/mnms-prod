/**
 * 파일 역할: 전체 화면 레이아웃과 라우팅 렌더링 흐름을 조합하는 최상위 앱 컴포넌트 파일.
 */
const TELEGRAM_CHAT_HIDDEN_PATHS = ['/play/live', '/board/terms', '/customer-service'];
const TELEGRAM_CHAT_HIDDEN_PATH_PREFIXES = ['/my-page', '/admin', '/support', '/my-inquiries'];

export default {
  computed: {
    shouldShowTelegramChatButton() {
      const currentPath = this.$route.path;
      const isHiddenPath = TELEGRAM_CHAT_HIDDEN_PATHS.includes(currentPath);
      const isHiddenPathPrefix = TELEGRAM_CHAT_HIDDEN_PATH_PREFIXES.some(
        (pathPrefix) => currentPath === pathPrefix || currentPath.startsWith(`${pathPrefix}/`)
      );

      return !isHiddenPath && !isHiddenPathPrefix;
    }
  },
  template: `
    <router-view />
    <a
      v-if="shouldShowTelegramChatButton"
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
