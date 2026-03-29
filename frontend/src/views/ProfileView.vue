<template>
  <div class="profile-page">
    <div class="glass card">
      <h1 class="text-accent">个人成就中心</h1>
      <p>模块正在开发中，敬请期待...</p>
      <router-link to="/" class="back-btn">回到宇宙中心</router-link>
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
}
.card {
  padding: 60px;
  border-radius: 30px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.back-btn {
  color: var(--accent);
  text-decoration: none;
  margin-top: 20px;
}
</style>
