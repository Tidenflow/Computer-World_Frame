import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProgress, saveProgress } from '../../frontend/src/core/cwframe.loader';
// 导入完整的 api 模块，为了后续对他进行监控 (Spy)
import * as api from '../../frontend/src/core/cwframe.api';

/**
 * [Vitest API: vi.mock]
 * 职责：模拟（劫持）整个模块。
 * 当 loader.ts 去引用 cwframe.api 时，它拿到的不是原始文件，而是这里定义的“冒牌货”。
 * 这样我们可以精确控制 API 层的返回，而不需要真的去发请求。
 */
vi.mock('../../frontend/src/core/cwframe.api', async () => {
    // [vi.importActual]: 获取原始模块的内容，这样我们可以只 Mock 其中的一部分，保留其他工具函数。
    const actual = await vi.importActual<typeof import('../../frontend/src/core/cwframe.api')>('../../frontend/src/core/cwframe.api');
    return {
        ...actual,
        fetchProgress: vi.fn(),  // 变为一个可追踪的 Mock 函数
        updateProgress: vi.fn(), // 同上
        getCurrentUserId: vi.fn() // 同上
    };
});

describe('cwframe.loader (业务逻辑加载层测试)', () => {

    beforeEach(() => {
        // [vi.restoreAllMocks]: 每次测试前把所有 Mock 函数状态重置（清空调用次数等）
        vi.restoreAllMocks();
    });

    it('loadProgress() 应该能正确识别当前用户 ID 并发起进度请求', async () => {
        // 准备测试数据
        const mockUserId = 123;
        const mockProgressData = { userId: 123, unlockedNodes: { 1: { unlockedAt: 12345 } } };

        /**
         * 设置 Mock 行为：
         * 让 getCurrentUserId 假装返回 123
         * 让 fetchProgress 假装返回上面那个进度对象
         */
        (api.getCurrentUserId as any).mockReturnValue(mockUserId);
        (api.fetchProgress as any).mockResolvedValue(mockProgressData);

        // 执行被测函数
        const result = await loadProgress();

        // 断言：loader 是否真的按照预期去调用了 api 层的方法？
        expect(api.getCurrentUserId).toHaveBeenCalled();
        expect(api.fetchProgress).toHaveBeenCalledWith(mockUserId);

        // 断言：返回的结果是否就是我们 mock 的那个对象？
        expect(result).toEqual(mockProgressData);
    });

    it('saveProgress() 应该调用底层的异步 API 将进度持久化', async () => {
        const mockProg = { userId: 456, unlockedNodes: { 1: { unlockedAt: 67890 } } };
        
        // 模拟 API 保存成功
        (api.updateProgress as any).mockResolvedValue(mockProg);

        const result = await saveProgress(mockProg);

        // 断言：验证逻辑透传。loader 应该把参数原样传给底层 API
        expect(api.updateProgress).toHaveBeenCalledWith(456, mockProg);
        expect(result).toBe(mockProg);
    });
});
