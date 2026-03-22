/**
 * 파일 역할: 전역 텍스트 복사, 스크롤, 개발자 도구 단축키를 제한하는 보호 유틸리티 파일.
 */
const SCROLL_BLOCK_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar'
]);

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]')
  );
}

function blockEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function isContentProtectionEnabled() {
  return window.__APP_CONFIG__?.contentProtectionEnabled !== false;
}

function handleProtectionKeydown(event) {
  const key = event.key;
  const loweredKey = typeof key === 'string' ? key.toLowerCase() : '';
  const modifierKeyPressed = event.ctrlKey || event.metaKey;
  const devtoolsShortcutPressed =
    key === 'F12' ||
    (modifierKeyPressed && event.shiftKey && ['i', 'j', 'c'].includes(loweredKey)) ||
    (modifierKeyPressed && loweredKey === 'u');

  if (devtoolsShortcutPressed) {
    blockEvent(event);
    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  if (SCROLL_BLOCK_KEYS.has(key)) {
    blockEvent(event);
  }
}

export function initializeContentProtection() {
  if (!isContentProtectionEnabled()) {
    return;
  }

  const rootElement = document.documentElement;
  const bodyElement = document.body;

  rootElement.classList.add('content-protection-enabled');
  bodyElement.classList.add('content-protection-enabled');

  rootElement.style.overflow = 'hidden';
  bodyElement.style.overflow = 'hidden';
  bodyElement.style.touchAction = 'none';

  const blockedEvents = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'];

  blockedEvents.forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      blockEvent(event);
    }, { capture: true });
  });

  document.addEventListener('keydown', handleProtectionKeydown, { capture: true });
  window.addEventListener('wheel', blockEvent, { passive: false });
  window.addEventListener('touchmove', blockEvent, { passive: false });
}
