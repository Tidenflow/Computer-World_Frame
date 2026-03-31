<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user.store';
import { LogIn, User, Lock, Loader2, Lightbulb } from 'lucide-vue-next';

const userStore = useUserStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    await userStore.login({ username: username.value, password: password.value });
    router.push('/');
  } catch (err: any) {
    error.value = err.message || '登录失败，请检查账号密码';
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
        <h1 class="text-gradient">欢迎回来</h1>
        <p>登录以继续点亮您的计算机世界观</p>
      </header>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="field-group">
          <label>用户名 / Username</label>
          <div class="input-wrapper">
            <User :size="18" class="field-icon" />
            <input v-model="username" type="text" placeholder="输入用户名" required />
          </div>
        </div>

        <div class="field-group">
          <label>密码 / Password</label>
          <div class="input-wrapper">
            <Lock :size="18" class="field-icon" />
            <input v-model="password" type="password" placeholder="••••••••" required />
          </div>
        </div>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="submit-btn bg-gradient-brand">
          <template v-if="loading">
            <Loader2 class="animate-spin" :size="20" />
            <span>同步状态中...</span>
          </template>
          <template v-else>
            <LogIn :size="20" />
            <span>进入世界</span>
          </template>
        </button>
      </form>

      <footer class="auth-footer">
        还没有账号？ <router-link to="/auth/register" class="link-text">立即注册</router-link>
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
  gap: 40px;
  animation: modal-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.auth-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }

.logo-box {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: 0 0 30px rgba(37, 99, 235, 0.3);
}

.icon-white { color: white; }

.auth-header h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; }
.auth-header p { font-size: 14px; color: var(--text-weak); }

.auth-form { display: flex; flex-direction: column; gap: 24px; }

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
  font-size: 15px;
  transition: var(--transition-smooth);
}

input:focus { border-color: var(--blue-400); background: rgba(255, 255, 255, 0.06); outline: none; }

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
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
