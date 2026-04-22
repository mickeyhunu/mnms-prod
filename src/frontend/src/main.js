/**
 * 파일 역할: 프론트엔드 애플리케이션을 초기화하고 루트 컴포넌트를 마운트하는 진입점 파일.
 */
import { createApp } from 'vue';
import router from './router/index.js';
import App from './App.js';

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

document.addEventListener('dragstart', (event) => {
  event.preventDefault();
});

document.addEventListener('drop', (event) => {
  event.preventDefault();
});

setInterval(() => {
  const devtoolsOpen = window.outerWidth - window.innerWidth > 100;
  if (devtoolsOpen) {
    document.body.innerHTML = '접근이 제한되었습니다';
  }
}, 1000);

createApp(App).use(router).mount('#app');
