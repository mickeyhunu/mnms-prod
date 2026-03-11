import AppNav from './components/AppNav.js';

export default {
  components: { AppNav },
  template: `
    <div>
      <AppNav />
      <main class="container">
        <router-view />
      </main>
    </div>
  `
};
