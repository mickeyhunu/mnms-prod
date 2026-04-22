/**
 * 파일 역할: 프론트엔드 애플리케이션을 초기화하고 루트 컴포넌트를 마운트하는 진입점 파일.
 */
import { createApp } from 'vue';
import router from './router/index.js';
import App from './App.js';

const preventDefault = (event) => {
  event.preventDefault();
};

document.addEventListener('contextmenu', preventDefault, true);
document.addEventListener('dragstart', preventDefault, true);
document.addEventListener('drop', preventDefault, true);
document.addEventListener('selectstart', preventDefault, true);

const dragBlockStyle = document.createElement('style');
dragBlockStyle.textContent = `
  * {
    -webkit-user-drag: none;
    user-select: none;
  }
`;
document.head.appendChild(dragBlockStyle);

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
