import { createRouter, createWebHistory } from 'vue-router';
import PageView from '../views/PageView.js';

const routes = [
  { path: '/', component: PageView, meta: { pageKey: 'index' } },
  { path: '/login', component: PageView, meta: { pageKey: 'login' } },
  { path: '/register', component: PageView, meta: { pageKey: 'register' } },
  { path: '/create', component: PageView, meta: { pageKey: 'create-post' } },
  { path: '/post-detail', component: PageView, meta: { pageKey: 'post-detail' } },
  { path: '/bookmarks', component: PageView, meta: { pageKey: 'bookmarks' } },
  { path: '/community', component: PageView, meta: { pageKey: 'community' } },
  { path: '/my-page', component: PageView, meta: { pageKey: 'my-page' } },
  { path: '/edit-post', component: PageView, meta: { pageKey: 'edit-post' } },
  { path: '/admin', component: PageView, meta: { pageKey: 'admin' } },
  { path: '/find-account', component: PageView, meta: { pageKey: 'find-account' } },
  { path: '/business-info', component: PageView, meta: { pageKey: 'business-info' } },
  { path: '/live', component: PageView, meta: { pageKey: 'live' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
