import { describe, it, expect, vi, beforeEach } from 'vitest';
// 注意：如果 Vitest 运行在 frontend 目录下，路径需要根据实际运行环境调整
import { login, fetchDefaultMap, getCurrentUserId, setCurrentUserId } from '../../frontend/src/core/cwframe.api';

// 1. 全局 Mock fetch
vi.stubGlobal('fetch', vi.fn());

describe('cwframe.api (Frontend API Wrapper)', () => {
    
    beforeEach(() => {
        // 每个测试前清理 Mock 调用记录和 localStorage
        vi.mocked(fetch).mockClear();
        localStorage.clear();
    });

    describe('LocalStorage 存储工具', () => {
        it('setCurrentUserId 应该正确存入 ID', () => {
            setCurrentUserId(99);
            expect(localStorage.getItem('cwframe_user_id')).toBe('99');
        });

        it('getCurrentUserId 应该在无存储时返回默认值 1', () => {
            expect(getCurrentUserId()).toBe(1);
        });

        it('getCurrentUserId 应该返回存储的有效 ID', () => {
            localStorage.setItem('cwframe_user_id', '123');
            expect(getCurrentUserId()).toBe(123);
        });
    });

    describe('API 核心逻辑 (Mock Fetch)', () => {
        
        it('login 应该发送 POST 请求并自动设置当前用户 ID', async () => {
            // 模拟后端成功的响应
            const mockAuthData = { userId: 42, username: 'tester', token: 'fake-jwt' };
            vi.mocked(fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true, data: mockAuthData })
            } as any);

            const result = await login({ username: 'tester', password: 'password123' });

            // 断言：fetch 被调用过，且参数包含 POST 和正确的 body
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('tester')
                })
            );

            // 断言：成功存入了 localStorage
            expect(localStorage.getItem('cwframe_user_id')).toBe('42');
            expect(result.userId).toBe(42);
        });

        it('当后端返回失败 (success: false) 时应该抛出错误', async () => {
            // 模拟后端业务报错
            vi.mocked(fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({ 
                    success: false, 
                    error: { message: '用户名已占用' } 
                })
            } as any);

            await expect(fetchDefaultMap()).rejects.toThrow('用户名已占用');
        });

        it('fetchDefaultMap 应该发起 GET 请求到正确的路径', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true, data: { nodes: [] } })
            } as any);

            await fetchDefaultMap();

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/maps/default'),
                undefined // GET 请求通常不需要额外的 init 参数
            );
        });
    });
});
