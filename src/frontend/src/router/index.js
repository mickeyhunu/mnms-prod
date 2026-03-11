import { createRouter, createWebHistory } from 'vue-router';
import LegacyHtmlView from '../views/LegacyHtmlView.js';

const routes = [
  { path: '/', component: LegacyHtmlView, props: { page: 'index' } },
  { path: '/login', component: LegacyHtmlView, props: { page: 'login' } },
  { path: '/register', component: LegacyHtmlView, props: { page: 'register' } },
  { path: '/create', component: LegacyHtmlView, props: { page: 'create-post' } },
  { path: '/post-detail', component: LegacyHtmlView, props: { page: 'post-detail' } },
  { path: '/bookmarks', component: LegacyHtmlView, props: { page: 'bookmarks' } },
  { path: '/community', component: LegacyHtmlView, props: { page: 'community' } },
  { path: '/my-page', component: LegacyHtmlView, props: { page: 'my-page' } },
  { path: '/edit-post', component: LegacyHtmlView, props: { page: 'edit-post' } },
  { path: '/admin', component: LegacyHtmlView, props: { page: 'admin' } },
  { path: '/find-account', component: LegacyHtmlView, props: { page: 'find-account' } },
  { path: '/business-info', component: LegacyHtmlView, props: { page: 'business-info' } },
  { path: '/live', component: LegacyHtmlView, props: { page: 'live' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
