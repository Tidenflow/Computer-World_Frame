<script setup lang="ts">
import { Lightbulb, Github, Info, User } from 'lucide-vue-next';
import { useUserStore } from '../store/user.store';

const userStore = useUserStore();
</script>

<template>
  <header class="header glass-panel">
    <div class="container">
      <div class="header-left">
        <div class="logo-box bg-gradient-brand">
          <Lightbulb class="icon-white" :size="24" />
        </div>
        <div class="title-group">
          <h1 class="text-gradient">Computer World Frame</h1>
          <p class="subtitle">点亮你的计算机世界观</p>
        </div>
      </div>
      
      <div class="header-right">
        <router-link to="/profile" class="profile-link">
          <User :size="18" />
          <span>{{ userStore.username || 'Profile' }}</span>
        </router-link>
        <button class="nav-btn" @click="$emit('toggle-about')">
          <Info :size="20" />
        </button>
        <a href="https://github.com" target="_blank" class="nav-link">
          <Github :size="22" />
        </a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 72px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-slate);
}

.container {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
}

.icon-white {
  color: white;
}

.title-group h1 {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 11px;
  color: var(--text-weak);
  margin-top: -2px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-link {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-slate);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 999px;
  transition: var(--transition-smooth);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
}

.profile-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--border-highlight);
}

.nav-btn, .nav-link {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: var(--transition-smooth);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.nav-btn:hover, .nav-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}
</style>
