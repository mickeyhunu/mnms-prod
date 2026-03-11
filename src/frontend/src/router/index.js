import { createRouter, createWebHistory } from 'https://unpkg.com/vue-router@4/dist/vue-router.esm-browser.prod.js';
import HomeView from '../views/HomeView.js';
import LoginView from '../views/LoginView.js';
import RegisterView from '../views/RegisterView.js';
import CreatePostView from '../views/CreatePostView.js';
import PostDetailView from '../views/PostDetailView.js';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/login', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/create', component: CreatePostView },
    { path: '/posts/:id', component: PostDetailView }
  ]
});

export default router;
