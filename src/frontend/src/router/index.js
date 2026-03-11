import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/pages/HomeView.js';
import LoginView from '../views/pages/LoginView.js';
import RegisterView from '../views/pages/RegisterView.js';
import CreatePostView from '../views/pages/CreatePostView.js';
import PostDetailView from '../views/pages/PostDetailView.js';
import BookmarksView from '../views/pages/BookmarksView.js';
import CommunityView from '../views/pages/CommunityView.js';
import MyPageView from '../views/pages/MyPageView.js';
import EditPostView from '../views/pages/EditPostView.js';
import AdminView from '../views/pages/AdminView.js';
import FindAccountView from '../views/pages/FindAccountView.js';
import BusinessInfoView from '../views/pages/BusinessInfoView.js';
import LiveView from '../views/pages/LiveView.js';

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
