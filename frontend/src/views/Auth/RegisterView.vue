<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../store/user.store';

const userStore = useUserStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    await userStore.register({ username: username.value, password: password.value });
    // After success, go to login
    router.push('/auth/login');
  } catch (err: any) {
    error.value = err.message || '注册失败，请检查填写内容';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card glass">
      <header>
        <h1 class="text-accent">注 册</h1>
        <p>加入宇宙，开启你的认知点亮之旅</p>
      </header>
      
      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="设置一个响亮的名称" required />
        </div>
        
        <div class="input-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="建议包含字母与数字" required />
        </div>
        
        <div class="input-group">
          <label>确认密码</label>
          <input v-model="confirmPassword" type="password" placeholder="再次输入密码" required />
        </div>
        
        <div v-if="error" class="error-msg">{{ error }}</div>
        
        <button type="submit" :disabled="loading" class="auth-btn">
          {{ loading ? '宇宙初始化中...' : '立即加入' }}
        </button>
      </form>
      
      <footer>
        已有账号？ <router-link to="/auth/login">去登录</router-link>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles reuse from LoginView for consistency */
.auth-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #1a1b26 0%, #0a0a0f 100%);
}

.auth-card {
  width: 400px;
  padding: 40px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.6s ease-out;
}

header {
  text-align: center;
}

header h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

header p {
  font-size: 14px;
  opacity: 0.6;
}

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}

input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  padding: 12px 16px;
  border-radius: 12px;
  color: #fff;
  outline: none;
  transition: all 0.3s;
}

input:focus {
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 15px rgba(79, 195, 247, 0.2);
}

.auth-btn {
  background: var(--accent);
  color: var(--bg);
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px var(--accent-glow);
}

.error-msg {
  color: var(--error);
  font-size: 13px;
  text-align: center;
}

footer {
  text-align: center;
  font-size: 14px;
  opacity: 0.7;
}

footer a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}
</style>
