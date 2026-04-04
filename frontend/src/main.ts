// 从 Vue 核心库引入 createApp，用于创建整个前端应用实例
import { createApp } from 'vue'
// 从 Pinia 库引入 createPinia，用于创建 Pinia 实例
import { createPinia } from 'pinia'
// 从 Vue Router 库引入 createRouter，用于创建 Vue Router 实例
import router from './router'
// 引入全局样式文件
import './style.css'
// 引入根组件
import App from './App.vue'

// 创建 Vue 应用实例
const app = createApp(App)   // --->这里的App就是App.vue文件

// 注册 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 注册 Vue Router
app.use(router)
// 为什么没有 const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes,
// });
// app.use(router)
// 因为 router/index.ts 文件已经创建了 router 实例，所以这个就是我们自己写的

// 将应用挂载到页面 #app 节点
app.mount('#app')
