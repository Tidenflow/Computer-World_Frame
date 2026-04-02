import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RegisterRequest, LoginRequest, AuthData } from '@shared/contract';
import * as api from '../core/cwframe.api';

/**
 * 用户状态仓库（MVP 版会话）。
 *
 * 说明：当前项目用 localStorage 的 `cwframe_user_id` 来恢复/维持“登录态”。
 * - `api.login` 会在成功后写入 localStorage
 * - `register` 成功后也会对齐 login 行为写入 localStorage
 */
export const useUserStore = defineStore('user', () => {
  // 仓库里的数据 userId username isAuthenticated
  const userId = ref<number>(api.getCurrentUserId());
  const username = ref<string>('');
  // localStorage 就是浏览器端 Web Storage，属于网页环境提供的本地存储。
  // 用 localStorage 中是否存在 userId 来恢复登录态（避免刷新/直达路由被守卫踢回登录页）
  const isAuthenticated = ref<boolean>(localStorage.getItem('cwframe_user_id') !== null);

  /**
   * 登录。
   *
   * @param payload - 登录请求体（username/password）
   * @returns 后端返回的凭证载体（userId/username）
   *
   * @sideEffects
   * - 会更新 `userId/username/isAuthenticated`
   * - `api.login` 内部会写入 localStorage（`cwframe_user_id`）
   */
  async function login(payload: LoginRequest): Promise<AuthData> {
    const data = await api.login(payload);
    userId.value = data.userId;
    username.value = data.username;
    isAuthenticated.value = true;
    return data;
  }

  /**
   * 注册。
   *
   * @param payload - 注册请求体（username/password）
   * @returns 后端返回的凭证载体（userId/username）
   *
   * @sideEffects
   * - 会更新 `userId/username/isAuthenticated`
   * - 会写入 localStorage（`cwframe_user_id`），以便路由守卫恢复登录态
   */
  async function register(payload: RegisterRequest): Promise<AuthData> {
    const data = await api.register(payload);
    // 注册成功后直接建立会话（与 Login 行为对齐）
    userId.value = data.userId;
    username.value = data.username;
    isAuthenticated.value = true;
    api.setCurrentUserId(data.userId);
    return data;
  }

  /**
   * 退出登录（本地）。
   *
   * @returns void
   *
   * @sideEffects
   * - 清空 `username` 并置 `isAuthenticated=false`
   * - 将 `userId` 重置为 `1`（MVP 默认用户）
   * - 移除 localStorage 的 `cwframe_user_id`
   */
  function logout(): void {
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
