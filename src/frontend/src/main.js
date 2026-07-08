/**
 * 파일 역할: 프론트엔드 애플리케이션을 초기화하고 루트 컴포넌트를 마운트하는 진입점 파일.
 */
import { createApp } from 'vue';
import router from './router/index.js';
import App from './App.js';

const INTERACTION_ALLOWED_SELECTOR = 'input, textarea, select, [contenteditable], [role="textbox"], #post-content, #post-content *';
const ADMIN_INTERACTION_ALLOWED_PATH_PREFIX = '/admin';
let isDevToolsBlocked = false;

const isLocalEnvironment = () => window.MNMS_PUBLIC_CONFIG?.isLocalEnv === true;
const isDevToolsBypassAllowed = () => window.MNMS_PUBLIC_CONFIG?.allowDevtools === true;
const shouldBypassDevToolsProtection = () => isLocalEnvironment() || isDevToolsBypassAllowed();

const isAdminPage = () => {
  const { pathname } = window.location;
  return pathname === ADMIN_INTERACTION_ALLOWED_PATH_PREFIX || pathname.startsWith(`${ADMIN_INTERACTION_ALLOWED_PATH_PREFIX}/`);
};

const showDevToolsBlockedScreen = () => {
  if (shouldBypassDevToolsProtection() || isAdminPage() || document.getElementById('devtools-blocked-screen')) {
    return;
  }

  isDevToolsBlocked = true;

  const blockedScreen = document.createElement('div');
  blockedScreen.id = 'devtools-blocked-screen';
  blockedScreen.setAttribute('role', 'alert');
  blockedScreen.setAttribute('aria-live', 'assertive');
  blockedScreen.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:24px',
    'background:#0f172a',
    'color:#ffffff',
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'text-align:center'
  ].join(';');
  blockedScreen.innerHTML = `
    <div style="max-width:420px;line-height:1.6;">
      <strong style="display:block;font-size:22px;margin-bottom:12px;">접근이 제한되었습니다</strong>
      <span style="display:block;font-size:15px;color:#cbd5e1;">개발자 도구 사용이 감지되어 화면을 보호합니다.<br>개발자 도구를 닫은 뒤 새로고침해 주세요.</span>
    </div>
  `;

  if (document.body) {
    document.body.replaceChildren(blockedScreen);
  } else {
    document.documentElement.replaceChildren(document.head, blockedScreen);
  }
};

const bindDevToolsDetector = () => {
  if (shouldBypassDevToolsProtection()) {
    return;
  }

  const detector = window.devtoolsDetector;

  if (!detector || typeof detector.addListener !== 'function' || typeof detector.launch !== 'function') {
    return;
  }

  detector.addListener((isOpen) => {
    if (isOpen) {
      showDevToolsBlockedScreen();
    }
  });

  detector.launch();
};

bindDevToolsDetector();

const isInteractionAllowedTarget = (target) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(INTERACTION_ALLOWED_SELECTOR));
};

const isSelectionInAllowedTarget = () => {
  if (!window.getSelection) {
    return false;
  }

  const selection = window.getSelection();
  const selectedNode = selection?.anchorNode || selection?.focusNode;
  const selectedElement = selectedNode?.nodeType === Node.ELEMENT_NODE
    ? selectedNode
    : selectedNode?.parentElement;

  return isInteractionAllowedTarget(selectedElement);
};

const preventDefault = (event) => {
  if (isLocalEnvironment() || isAdminPage() || isInteractionAllowedTarget(event.target)) {
    return;
  }

  event.preventDefault();
};

document.addEventListener('contextmenu', preventDefault, true);
document.addEventListener('dragstart', preventDefault, true);
document.addEventListener('drop', preventDefault, true);
document.addEventListener('selectstart', preventDefault, true);
document.addEventListener('mousedown', (event) => {
  if (isLocalEnvironment() || isAdminPage() || isInteractionAllowedTarget(event.target)) {
    return;
  }

  if (event.detail > 1) {
    event.preventDefault();
  }
}, true);
document.addEventListener('selectionchange', (event) => {
  if (isLocalEnvironment() || isAdminPage() || isInteractionAllowedTarget(document.activeElement) || isSelectionInAllowedTarget()) {
    return;
  }

  if (window.getSelection) {
    const selection = window.getSelection();
    if (selection && selection.type === 'Range') {
      selection.removeAllRanges();
    }
  }
}, true);

if (!isDevToolsBlocked && document.getElementById('app')) {
  createApp(App).use(router).mount('#app');
}
