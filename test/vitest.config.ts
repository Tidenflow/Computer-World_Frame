// E:\Github\Computer-World_Frame\test\vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // 开启浏览器模拟环境
        environment: 'jsdom',
        // 支持全局 API（如 describe, expect, it）
        globals: true,
        // 如果之后要用到环境变量，可以配置这里
    },
    resolve: {
        alias: {
            // 如果你觉得 ../../../ 这种路径太恶心，可以在这里配别名
            '@shared': path.resolve(__dirname, '../shared'),
            '@frontend': path.resolve(__dirname, '../frontend/src'),
        },
    },
});
