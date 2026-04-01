import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RegisterRequest, LoginRequest, AuthData } from '@shared/contract';
import * as api from '../core/cwframe.api';

export const useUserStore = defineStore('user', () => {
  const userId = ref<number>(api.getCurrentUserId());
  const username = ref<string>('');
  // 用 localStorage 中是否存在 userId 来恢复登录态（避免刷新/直达路由被守卫踢回登录页）
  const isAuthenticated = ref<boolean>(localStorage.getItem('cwframe_user_id') !== null);

  // Auth: Login
  async function login(payload: LoginRequest) {
    const data = await api.login(payload);
    userId.value = data.userId;
    username.value = data.username;
    isAuthenticated.value = true;
    return data;
  }

  // Auth: Register
  async function register(payload: RegisterRequest) {
    const data = await api.register(payload);
    // 注册成功后直接建立会话（与 Login 行为对齐）
    userId.value = data.userId;
    username.value = data.username;
    isAuthenticated.value = true;
    api.setCurrentUserId(data.userId);
    return data;
  }

  // Auth: Logout
  function logout() {
    userId.value = 1; // Reset to default or null
    username.value = '';
    isAuthenticated.value = false;
    localStorage.removeItem('cwframe_user_id');
  }

  return {
    userId,
    username,
    isAuthenticated,
    login,
    register,
    logout
  };
});
