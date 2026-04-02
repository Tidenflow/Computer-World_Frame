<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user.store';
import { UserPlus, User, Lock, Loader2, Lightbulb, ArrowRight } from 'lucide-vue-next';

const userStore = useUserStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

/**
 * 注册表单提交处理函数。
 *
 * @returns Promise<void>
 * @sideEffects
 * - 调用 `userStore.register`（会发起后端请求并写入 localStorage）
 * - 注册成功后通过 `router.push('/')` 跳转（当前实现与 store 行为对齐：注册会直接视为登录）
 * - 失败后写入 `error` 以供 UI 展示
 */
async function handleRegister(): Promise<void> {
  if (!username.value || !password.value) return;
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    await userStore.register({ username: username.value, password: password.value });
    router.push('/');   //当前注册之后状态是登录状态，所以会跳转到首页,这里改成跳转到登录页也没用
  } catch (err: any) {
    error.value = err.message || '注册失败，用户名可能已存在';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-box glass-panel shadow-glow">
      <header class="auth-header">
        <div class="logo-box bg-gradient-brand">
          <Lightbulb class="icon-white" :size="32" />
        </div>
        <h1 class="text-gradient">加入我们</h1>
        <p>开启属于您的计算机世界探索之旅</p>
      </header>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="field-group">
          <label>用户名 / Username</label>
          <div class="input-wrapper">
            <User :size="18" class="field-icon" />
            <input v-model="username" type="text" placeholder="设置您的用户名" required />
          </div>
        </div>

        <div class="field-group">
          <label>密码 / Password</label>
          <div class="input-wrapper">
            <Lock :size="18" class="field-icon" />
            <input v-model="password" type="password" placeholder="设置您的密码" required />
          </div>
        </div>

        <div class="field-group">
          <label>确认密码 / Confirm Password</label>
          <div class="input-wrapper">
            <Lock :size="18" class="field-icon" />
            <input v-model="confirmPassword" type="password" placeholder="再次输入密码" required />
          </div>
        </div>

        <div v-if="error" class="error-banner">{{ error }}</div>

        <button type="submit" :disabled="loading" class="submit-btn bg-gradient-brand">
          <template v-if="loading">
            <Loader2 class="animate-spin" :size="20" />
            <span>注册中...</span>
          </template>
          <template v-else>
            <UserPlus :size="20" />
            <span>创建账户</span>
          </template>
        </button>
      </form>

      <footer class="auth-footer">
        已有账号？ <router-link to="/auth/login" class="link-text">点击登录</router-link>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-dark);
}

.auth-box {
  width: 100%;
  max-width: 440px;
  padding: 48px;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: modal-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }

.logo-box {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: 0 0 30px rgba(37, 99, 235, 0.25);
}

.icon-white { color: white; }

.auth-header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
.auth-header p { font-size: 13px; color: var(--text-weak); }

.auth-form { display: flex; flex-direction: column; gap: 20px; }

.field-group { display: flex; flex-direction: column; gap: 10px; }
.field-group label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-weak); letter-spacing: 0.1em; }

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon { position: absolute; left: 16px; color: var(--text-weak); }

input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-slate);
  padding: 14px 14px 14px 48px;
  border-radius: 12px;
  color: var(--text-primary);
  font-family: var(--sans);
  font-size: 14px;
  transition: var(--transition-smooth);
}

input:focus { border-color: var(--blue-400); background: rgba(255, 255, 255, 0.06); outline: none; }

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  padding: 12px;
  border-radius: 10px;
  font-size: 12px;
  text-align: center;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.submit-btn {
  padding: 16px;
  border-radius: 14px;
  border: none;
  color: white;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.submit-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.auth-footer { text-align: center; font-size: 14px; color: var(--text-muted); }
.link-text { color: var(--blue-400); text-decoration: none; font-weight: 700; }
.link-text:hover { text-decoration: underline; }

@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
