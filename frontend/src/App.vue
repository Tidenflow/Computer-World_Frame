<template>
  <!-- 这个cwframe-app的div是整个应用的根容器，它占据了整个页面的宽度高度，并且没有外边距和内边距，溢出隐藏，背景是var(--bg) -->
  <div id="cwframe-app">
    <!-- 这个router-view是用来渲染路由视图的，它会在页面中显示当前路由的组件 -->
    <router-view v-slot="{ Component }">  <!-- Component是一个具名插槽，它会在页面中显示当前路由的组件 -->
      <!-- 这个transition是用来实现页面切换的过渡效果的，它会在页面切换时使用淡入淡出的效果 -->
      <transition mode="out-in">
        <!-- 这个component是用来渲染当前路由的组件的，它会在页面中显示当前路由的组件 -->
        <component :is="Component" />   <!-- 这里的Component就是当前路由的组件 -->
      </transition>
    </router-view>
  </div>
</template>

<style>
/* Global App Container */
#cwframe-app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--bg);
}

/* Page Transition: Fade Through */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.4s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
