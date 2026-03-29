import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/Auth/LoginView.vue';
import RegisterView from '../views/Auth/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import { useUserStore } from '../store/user.store';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/auth/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/auth/register',
    name: 'register',
    component: RegisterView,
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation Guard: Strict session-only access for MVP 0.1
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  
  // Routes that can be accessed without login
  const publicPages = ['login', 'register'];
  const authRequired = !publicPages.includes(to.name as string);

  if (authRequired && !userStore.isAuthenticated) {
    // If trying to access a restricted page without being logged in -> go to login
    next({ name: 'login' });
  } else if (userStore.isAuthenticated && publicPages.includes(to.name as string)) {
    // If already logged in and trying to go to login/register -> go to home
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;
