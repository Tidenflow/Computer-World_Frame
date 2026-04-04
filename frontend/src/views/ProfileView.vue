<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Calendar, LogOut, ShieldCheck, Trophy, User } from 'lucide-vue-next';
import { useProgressStore } from '../store/progress.store';
import { useUserStore } from '../store/user.store';

const userStore = useUserStore();
const progressStore = useProgressStore();
const router = useRouter();

const explorerName = computed(() => userStore.username || 'Explorer');
const explorerLevel = computed(() => Math.max(1, Math.floor(progressStore.unlockedNodesCount / 5) + 1));
const accountStatus = computed(() => (userStore.isAuthenticated ? 'Active' : 'Guest'));
const completionText = computed(() => `${progressStore.unlockedNodesCount} unlocked`);

function handleLogout(): void {
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
          <h2>{{ explorerName }}</h2>
          <p class="user-id">ID: #{{ userStore.userId }}</p>
        </div>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <Trophy :size="20" class="stat-icon" />
          <div class="stat-value">{{ progressStore.unlockedNodesCount }}</div>
          <div class="stat-label">Unlocked Nodes</div>
        </div>
        <div class="stat-card">
          <Calendar :size="20" class="stat-icon" />
          <div class="stat-value">LV {{ explorerLevel }}</div>
          <div class="stat-label">Explorer Level</div>
        </div>
        <div class="stat-card">
          <ShieldCheck :size="20" class="stat-icon" />
          <div class="stat-value">{{ accountStatus }}</div>
          <div class="stat-label">Account Status</div>
        </div>
      </div>

      <div class="profile-summary glass-panel">
        <div class="summary-item">
          <span class="summary-label">Current User</span>
          <span class="summary-value">{{ explorerName }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Progress</span>
          <span class="summary-value">{{ completionText }}</span>
        </div>
      </div>

      <div class="action-list">
        <button @click="handleLogout" class="logout-btn">
          <LogOut :size="20" />
          <span>Logout</span>
        </button>
        <router-link to="/" class="back-link">Back To Home</router-link>
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

.profile-summary {
  border-radius: 20px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-label {
  font-size: 11px;
  color: var(--text-weak);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.summary-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

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
