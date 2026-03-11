import { createRouter, createWebHistory } from 'vue-router';
import LegacyView from '../views/LegacyView.js';

const routes = [
  { path: '/', component: LegacyView, meta: { pageKey: 'index' } },
  { path: '/login', component: LegacyView, meta: { pageKey: 'login' } },
  { path: '/register', component: LegacyView, meta: { pageKey: 'register' } },
  { path: '/create', component: LegacyView, meta: { pageKey: 'create-post' } },
  { path: '/post-detail', component: LegacyView, meta: { pageKey: 'post-detail' } },
  { path: '/bookmarks', component: LegacyView, meta: { pageKey: 'bookmarks' } },
  { path: '/community', component: LegacyView, meta: { pageKey: 'community' } },
  { path: '/my-page', component: LegacyView, meta: { pageKey: 'my-page' } },
  { path: '/edit-post', component: LegacyView, meta: { pageKey: 'edit-post' } },
  { path: '/admin', component: LegacyView, meta: { pageKey: 'admin' } },
  { path: '/find-account', component: LegacyView, meta: { pageKey: 'find-account' } },
  { path: '/business-info', component: LegacyView, meta: { pageKey: 'business-info' } },
  { path: '/live', component: LegacyView, meta: { pageKey: 'live' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
