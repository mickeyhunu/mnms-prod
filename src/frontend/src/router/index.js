import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../pages/HomeView.js';
import LoginView from '../pages/LoginView.js';
import RegisterView from '../pages/RegisterView.js';
import CreatePostView from '../pages/CreatePostView.js';
import PostDetailView from '../pages/PostDetailView.js';
import BookmarksView from '../pages/BookmarksView.js';
import CommunityView from '../pages/CommunityView.js';
import MyPageView from '../pages/MyPageView.js';
import EditPostView from '../pages/EditPostView.js';
import AdminView from '../pages/AdminView.js';
import FindAccountView from '../pages/FindAccountView.js';
import BusinessInfoView from '../pages/BusinessInfoView.js';
import LiveView from '../pages/LiveView.js';

const routes = [
  { path: '/', component: HomeView },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/create', component: CreatePostView },
  { path: '/post-detail', component: PostDetailView },
  { path: '/bookmarks', component: BookmarksView },
  { path: '/community', component: CommunityView },
  { path: '/my-page', component: MyPageView },
  { path: '/edit-post', component: EditPostView },
  { path: '/admin', component: AdminView },
  { path: '/find-account', component: FindAccountView },
  { path: '/business-info', component: BusinessInfoView },
  { path: '/live', component: LiveView }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
