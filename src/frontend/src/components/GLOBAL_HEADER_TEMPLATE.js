import { createBrandLogoMarkup } from '../brandAssets.js';

export const GLOBAL_HEADER_TEMPLATE = `<header class="header">
  <div class="header-container">
    ${createBrandLogoMarkup()}
    <nav class="nav" id="navigation">
      <div class="nav-guest" id="nav-guest">
        <a href="/login" class="btn btn-outline btn-sm">로그인</a>
        <a href="/register" class="btn btn-outline btn-sm">회원가입</a>
      </div>
      <div class="nav-user hidden" id="nav-user">
        <div class="header-user-menu" id="header-user-menu">
          <button class="user-nickname-button" id="user-nickname" type="button" aria-haspopup="menu" aria-expanded="false">
            <span class="user-nickname-text" id="user-nickname-label"></span>
            <span class="user-nickname-caret" aria-hidden="true">▾</span>
          </button>
          <div class="header-user-dropdown hidden" id="header-user-dropdown" role="menu" aria-label="사용자 메뉴">
            <a href="/my-page" class="header-user-dropdown-link" role="menuitem">내 정보</a>
            <a href="/admin" class="header-user-dropdown-link hidden" id="admin-link" role="menuitem">관리자</a>
            <button class="header-user-dropdown-link header-user-dropdown-action" id="logout-btn" type="button" role="menuitem">로그아웃</button>
          </div>
        </div>
        <div class="header-notification-wrapper">
          <button class="header-notification-button" id="header-notification-button" type="button" aria-label="알림 열기" aria-haspopup="dialog" aria-expanded="false">
            <span class="header-notification-icon" aria-hidden="true">🔔</span>
            <span class="header-notification-label">알림</span>
            <span class="header-notification-dot hidden" id="header-notification-dot"></span>
          </button>
          <section class="header-notification-panel hidden" id="header-notification-panel" aria-label="알림 목록">
            <div class="header-notification-panel-header">
              <strong>알림</strong>
              <button class="header-notification-read-all" id="header-notification-read-all" type="button">모두 확인</button>
            </div>
            <div class="header-notification-list" id="header-notification-list"></div>
          </section>
        </div>
      </div>
    </nav>
  </div>
</header>`;

const LEGACY_HEADER_REGEX = /^\s*<header\b[^>]*class=["'][^"']*\bheader\b[^"']*["'][^>]*>[\s\S]*?<\/header>\s*/i;

export function stripLegacyHeaderTemplate(template = '') {
  if (typeof template !== 'string' || template.length === 0) {
    return '';
  }

  if (typeof document === 'undefined') {
    return template.replace(LEGACY_HEADER_REGEX, '');
  }

  const container = document.createElement('template');
  container.innerHTML = template;

  const legacyHeaderContainer = container.content.querySelector('.header-container');
  const legacyHeader = legacyHeaderContainer?.closest('header');

  if (!legacyHeader) {
    return template.replace(LEGACY_HEADER_REGEX, '');
  }

  legacyHeader.remove();
  return container.innerHTML.trimStart();
}
