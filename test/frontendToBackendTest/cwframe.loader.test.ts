import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProgress, saveProgress } from '../../frontend/src/core/cwframe.loader';
import * as api from '../../frontend/src/core/cwframe.api';

// 1. Mock api 模块的导出函数
vi.mock('../../frontend/src/core/cwframe.api', async () => {
    const actual = await vi.importActual<typeof import('../../frontend/src/core/cwframe.api')>('../../frontend/src/core/cwframe.api');
    return {
        ...actual,
        fetchProgress: vi.fn(),
        updateProgress: vi.fn(),
        getCurrentUserId: vi.fn()
    };
});

describe('cwframe.loader (Frontend Business Logic)', () => {

    beforeEach(() => {
        // 每个测试前清理 Mock
        vi.restoreAllMocks();
    });

    it('loadProgress 应该正确识别当前 ID 并请求进度', async () => {
        const mockUserId = 123;
        const mockProgressData = { userId: 123, unlockedNodes: { 1: { unlockedAt: 12345 } } };

        // 设置 Mock 返回值
        (api.getCurrentUserId as any).mockReturnValue(mockUserId);
        (api.fetchProgress as any).mockResolvedValue(mockProgressData);

        const result = await loadProgress();

        // 断言：loader 调用了 api 的 getCurrentUserId
        expect(api.getCurrentUserId).toHaveBeenCalled();
        // 断言：loader 调用了 api 的 fetchProgress
        expect(api.fetchProgress).toHaveBeenCalledWith(mockUserId);
        // 断言：返回值透传
        expect(result).toEqual(mockProgressData);
    });

    it('saveProgress 应该调用异步 API 更新进度', async () => {
        const mockProg = { userId: 456, unlockedNodes: { 1: { unlockedAt: 67890 } } };
        (api.updateProgress as any).mockResolvedValue(mockProg);

        const result = await saveProgress(mockProg);

        // 断言：loader 调用了 api 的 updateProgress
        expect(api.updateProgress).toHaveBeenCalledWith(456, mockProg);
        expect(result).toBe(mockProg);
    });
});
