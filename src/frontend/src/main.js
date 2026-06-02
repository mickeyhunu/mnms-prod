/**
 * 파일 역할: 프론트엔드 애플리케이션을 초기화하고 루트 컴포넌트를 마운트하는 진입점 파일.
 */
import { createApp } from 'vue';
import router from './router/index.js';
import App from './App.js';

const INTERACTION_ALLOWED_SELECTOR = 'input, textarea, select, [contenteditable], [role="textbox"], #post-content, #post-content *';
const ADMIN_INTERACTION_ALLOWED_PATH_PREFIX = '/admin';

const isAdminPage = () => {
  const { pathname } = window.location;
  return pathname === ADMIN_INTERACTION_ALLOWED_PATH_PREFIX || pathname.startsWith(`${ADMIN_INTERACTION_ALLOWED_PATH_PREFIX}/`);
};

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
  if (isAdminPage() || isInteractionAllowedTarget(event.target)) {
    return;
  }

  event.preventDefault();
};

document.addEventListener('contextmenu', preventDefault, true);
document.addEventListener('dragstart', preventDefault, true);
document.addEventListener('drop', preventDefault, true);
document.addEventListener('selectstart', preventDefault, true);
document.addEventListener('mousedown', (event) => {
  if (isAdminPage() || isInteractionAllowedTarget(event.target)) {
    return;
  }

  if (event.detail > 1) {
    event.preventDefault();
  }
}, true);
document.addEventListener('selectionchange', (event) => {
  if (isAdminPage() || isInteractionAllowedTarget(document.activeElement) || isSelectionInAllowedTarget()) {
    return;
  }

  if (window.getSelection) {
    const selection = window.getSelection();
    if (selection && selection.type === 'Range') {
      selection.removeAllRanges();
    }
  }
}, true);

const isLocalEnv = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if (!isLocalEnv) {
  setInterval(() => {
    const devtoolsOpen = window.outerWidth - window.innerWidth > 100;
    if (devtoolsOpen) {
      document.body.innerHTML = '접근이 제한되었습니다';
    }
  }, 1000);
}

createApp(App).use(router).mount('#app');
