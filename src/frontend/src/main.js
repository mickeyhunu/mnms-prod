import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import router from './router/index.js';
import App from './App.js';

createApp(App).use(router).mount('#app');
