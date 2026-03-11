import { createRouter, createWebHistory } from 'vue-router';
import LegacyPageView from '../legacy/LegacyPageView.js';

const routes = [
  { path: '/', component: LegacyPageView, props: { page: 'index' } },
  { path: '/login', component: LegacyPageView, props: { page: 'login' } },
  { path: '/register', component: LegacyPageView, props: { page: 'register' } },
  { path: '/create', component: LegacyPageView, props: { page: 'create-post' } },
  { path: '/post-detail', component: LegacyPageView, props: { page: 'post-detail' } },
  { path: '/bookmarks', component: LegacyPageView, props: { page: 'bookmarks' } },
  { path: '/community', component: LegacyPageView, props: { page: 'community' } },
  { path: '/my-page', component: LegacyPageView, props: { page: 'my-page' } },
  { path: '/edit-post', component: LegacyPageView, props: { page: 'edit-post' } },
  { path: '/admin', component: LegacyPageView, props: { page: 'admin' } },
  { path: '/find-account', component: LegacyPageView, props: { page: 'find-account' } },
  { path: '/business-info', component: LegacyPageView, props: { page: 'business-info' } },
  { path: '/live', component: LegacyPageView, props: { page: 'live' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
