<script setup lang="ts">
import { useUserStore } from '../store/user.store';
import { useProgressStore } from '../store/progress.store';
import { useRouter } from 'vue-router';
import { User, LogOut, ShieldCheck, Calendar, Trophy } from 'lucide-vue-next';

const userStore = useUserStore();
const progressStore = useProgressStore();
const router = useRouter();

function handleLogout() {
  userStore.logout();
  router.push('/auth/login');
}
</script>

<template>
  <div class="profile-page">
    <div class="profile-container glass-panel shadow-glow">
      <header class="profile-header">
        <div class="avatar-box">
          <User :size="48" class="avatar-icon" />
        </div>
        <div class="user-meta">
          <h2>{{ userStore.username || '探险者' }}</h2>
          <p class="user-id">ID: #{{ userStore.userId }}</p>
        </div>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <Trophy :size="20" class="stat-icon" />
          <div class="stat-value">{{ progressStore.unlockedNodesCount }}</div>
          <div class="stat-label">点亮节点数</div>
        </div>
        <div class="stat-card">
          <Calendar :size="20" class="stat-icon" />
          <div class="stat-value">LV 1</div>
          <div class="stat-label">知识等级</div>
        </div>
        <div class="stat-card">
          <ShieldCheck :size="20" class="stat-icon" />
          <div class="stat-value">已实名</div>
          <div class="stat-label">账户状态</div>
        </div>
      </div>

      <div class="action-list">
        <button @click="handleLogout" class="logout-btn">
          <LogOut :size="20" />
          <span>退出登录</span>
        </button>
        <router-link to="/" class="back-link">返回探索图谱</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-dark);
}

.profile-container {
  width: 100%;
  max-width: 500px;
  padding: 48px;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.profile-header { display: flex; align-items: center; gap: 24px; }

.avatar-box {
  width: 80px;
  height: 80px;
  background: var(--bg-card);
  border: 2px solid var(--border-slate);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon { color: var(--blue-400); }

.user-meta h2 { font-size: 28px; font-weight: 800; color: var(--text-primary); }
.user-id { font-size: 14px; color: var(--text-weak); margin-top: 4px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-slate);
  padding: 20px 12px;
  border-radius: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stat-icon { color: var(--text-weak); opacity: 0.6; }
.stat-value { font-size: 20px; font-weight: 800; color: var(--text-primary); }
.stat-label { font-size: 11px; color: var(--text-weak); text-transform: uppercase; }

.action-list { display: flex; flex-direction: column; gap: 16px; align-items: center; }

.logout-btn {
  width: 100%;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.logout-btn:hover { background: rgba(239, 68, 68, 0.15); transform: translateY(-2px); }

.back-link {
  font-size: 14px;
  color: var(--text-weak);
  text-decoration: none;
  font-weight: 600;
}

.back-link:hover { color: var(--blue-400); text-decoration: underline; }
</style>
