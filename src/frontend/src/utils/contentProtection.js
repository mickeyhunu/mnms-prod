/**
 * 파일 역할: 전역 텍스트 복사, 드래그, 개발자 도구 단축키를 제한하는 보호 유틸리티 파일.
 */
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
  }
}

export function initializeContentProtection() {
  if (!isContentProtectionEnabled()) {
    return;
  }

  document.documentElement.classList.add('content-protection-enabled');
  document.body.classList.add('content-protection-enabled');

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
}
