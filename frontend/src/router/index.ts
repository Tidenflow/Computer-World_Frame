// 引入 createRouter 和 createWebHistory 用于创建 Vue Router 实例
import { createRouter, createWebHistory } from 'vue-router';
// 引入各个页面组件
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/Auth/LoginView.vue';
import RegisterView from '../views/Auth/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import { useUserStore } from '../store/user.store';

// 定义一个路由数组，里面放所有页面的“地址→页面”对应关系
// routes 就是路由表，所有页面规则都写在这里
const routes = [
  {
    path: '/',  // 网址路径：根目录（就是首页）
    name: 'home',  // 路由名字：方便代码里跳转用，也可以不写
    component: HomeView,  // 要显示的页面组件：首页组件
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

// 创建 Vue Router 实例（生成一个路由管理器）
const router = createRouter({
  // 使用 Web 历史模式：通过浏览器 URL 历史记录来管理导航
  // 下面这个history唯一的意义就是：告诉 Vue 项目「根目录在哪里」，仅此而已
  // 上面的 / 会拼接在history后面，变成 /xxx/xxx/xxx
  history: createWebHistory(import.meta.env.BASE_URL),  //这个meta是Vite的特殊变量，用来读取环境变量
  routes,  // 使用上面定义的路由表,其实应该写成routes: routes,但是因为同名可以省略
});

// 导航守卫：严格会话访问，仅 MVP 0.1 版本需要
// 这个beforeEach是Vue Router的一个钩子函数，会在每次路由切换时执行
// to：即将进入的路由对象
// from：当前路由对象
// next：一个函数，用来决定是否继续导航
// 这个函数的作用是：在每次路由切换时，检查用户是否登录，如果未登录，则跳转到登录页，如果已登录，则继续导航
/**
 * 全局前置守卫（MVP 版“会话”访问控制）。
 *
 * @param to - 即将进入的路由对象（目标路由）
 * @param from - 当前正要离开的路由对象（来源路由）
 * @param next - 导航控制函数：调用 `next()` 继续；或 `next({ name: ... })` 重定向
 * @returns void（通过 next 控制流程）
 *
 * @sideEffects 可能触发重定向到 `login` / `home`
 */
router.beforeEach((to, from, next) => {
  // 获取用户状态管理器
  const userStore = useUserStore();
  
  // 定义可以访问的公共页面
  const publicPages = ['login', 'register'];  //只有 登录、注册 这两个页面是任何人都能看的
  // 判断是否需要登录  就是看to的页面的名称在不在publicPages里面
  const authRequired = !publicPages.includes(to.name as string);
  // 如果需要登录，但是用户未登录，则跳转到登录页 
  if (authRequired && !userStore.isAuthenticated) {
    next({ name: 'login' });
  } else if (userStore.isAuthenticated && publicPages.includes(to.name as string)) {
    // 如果已经登录，并且尝试访问公共页面，则跳转到首页
    next({ name: 'home' });
  } else {
    // 如果已经登录，并且尝试访问需要登录的页面，则继续导航
    next();
  }
});

export default router;
