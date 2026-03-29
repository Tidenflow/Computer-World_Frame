import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RegisterRequest, LoginRequest, AuthData } from '@shared/contract';
import * as api from '../core/cwframe.api';

export const useUserStore = defineStore('user', () => {
  const userId = ref<number>(api.getCurrentUserId());
  const username = ref<string>('');
  const isAuthenticated = ref<boolean>(false);

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
