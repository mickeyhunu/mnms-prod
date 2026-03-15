/**
 * 파일 역할: URL 경로를 페이지 렌더러와 연결하는 클라이언트 라우터 파일.
 */
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
  { path: '/my-page/profile', component: PageView, meta: { pageKey: 'my-page-profile' } },
  { path: '/my-page/activity', component: PageView, meta: { pageKey: 'my-page-activity' } },
  { path: '/my-page/points', component: PageView, meta: { pageKey: 'my-page-points' } },
  { path: '/my-page/support', component: PageView, meta: { pageKey: 'my-page-support' } },
  { path: '/my-page/policy', component: PageView, meta: { pageKey: 'my-page-policy' } },
  { path: '/edit-post', component: PageView, meta: { pageKey: 'edit-post' } },
  { path: '/admin', component: PageView, meta: { pageKey: 'admin' } },
  { path: '/find-account', component: PageView, meta: { pageKey: 'find-account' } },
  { path: '/business-info', component: PageView, meta: { pageKey: 'business-info' } },
  { path: '/live', component: PageView, meta: { pageKey: 'live' } },
  { path: '/support', component: PageView, meta: { pageKey: 'support-board' } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
