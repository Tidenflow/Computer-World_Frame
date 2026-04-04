import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 如果报错，运行 npm install -D @types/node

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared') // 同步 TS 配置的别名
    }
  }
})
