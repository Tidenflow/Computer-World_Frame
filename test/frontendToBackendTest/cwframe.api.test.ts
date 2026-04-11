import { describe, it, expect, vi, beforeEach } from 'vitest';
/**
 * 注意：测试代码运行在 test/ 目录下，通过相对路径引用 frontend 的源代码
 * 这里的路径跳出了 test/ 目录，进入 root，再进入 frontend/src/core/
 */
import {
    login,
    fetchDefaultMap,
    getCurrentUserId,
    hasActiveSession,
    setCurrentUserId
} from '../../frontend/src/core/cwframe.api';

/**
 * [Vitest API: vi.stubGlobal]
 * 职责：由于测试是在 Node.js 环境下运行的，原本没有浏览器自带的 fetch。
 * 这里我们“强行”在全局对象上挂载一个模拟的 fetch 函数，防止报错。
 */
vi.stubGlobal('fetch', vi.fn());

/**
 * [Vitest API: describe]
 * 职责：定义一个测试套件（Suite），用于对测试用例进行分组，让逻辑更清晰。
 */
describe('cwframe.api (前端 API 封装层测试)', () => {

    /**
     * [Vitest API: beforeEach]
     * 职责：生命周期钩子。在当前作用域下的每一个 it() 执行前，都会先运行这段逻辑。
     * 作用：确保每个测试用例都在一个“干净”的环境下开始，避免互相干扰。
     */
    beforeEach(() => {
        // [vi.mocked(fetch).mockClear]: 清除 fetch 被调用的次数、参数记录
        vi.mocked(fetch).mockClear();
        // 清理浏览器模拟的本地存储
        localStorage.clear();
    });

    describe('LocalStorage 存储工具函数测试', () => {
        /**
         * [Vitest API: it]
         * 职责：定义一个具体的测试用例（Test Case）。描述一段特定的行为。
         */
        it('setCurrentUserId 应该正确地将用户 ID 存入 localStorage', () => {
            // 执行业务函数
            setCurrentUserId(99);
            // [Vitest API: expect(a).toBe(b)]
            // 断言：期望从存储中拿到的值是字符串 '99'
            expect(localStorage.getItem('cwframe_user_id')).toBe('99');
        });

        it('getCurrentUserId 应该在无任何存储时，默认返回 1', () => {
            expect(getCurrentUserId()).toBe(1);
        });

        it('getCurrentUserId 应该能正确读取并转换存储中的字符串 ID 为数字', () => {
            localStorage.setItem('cwframe_user_id', '123');
            expect(getCurrentUserId()).toBe(123);
        });

        it('hasActiveSession 应该只在 token 存在时返回 true，而不是只看 userId', () => {
            localStorage.setItem('cwframe_user_id', '123');
            expect(hasActiveSession()).toBe(false);

            localStorage.setItem('cwframe_token', 'fake-jwt');
            expect(hasActiveSession()).toBe(true);
        });
    });

    describe('核心 API 逻辑测试 (模拟网络请求)', () => {

        it('login() 登录成功后，应发送 POST 请求并自动设置当前用户 ID', async () => {
            // 准备模拟数据（Mock Data）
            const mockAuthData = { userId: 42, username: 'tester', token: 'fake-jwt' };

            /**
             * [Vitest API: mockResolvedValueOnce]
             * 职责：控制 Mock 函数（fetch）的下一次异步返回结果。
             * 这里模拟了后端返回的结构：{ success: true, data: ... }
             */
            vi.mocked(fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true, data: mockAuthData })
            } as any);

            // 调用实际的前端业务代码
            const result = await login({ username: 'tester', password: 'password123' });

            /**
             * [Vitest API: toHaveBeenCalledWith]
             * 职责：验证某个函数是否被带参数调用过。
             * [expect.stringContaining]: 部分匹配，只要 URL 里包含这段字符串即可。
             * [expect.objectContaining]: 部分匹配，只要对象里有 method: 'POST' 即可。
             */
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('tester')
                })
            );

            // 验证业务副作用：登录成功后，用户 ID 应该被自动更新到本地存储
            expect(localStorage.getItem('cwframe_user_id')).toBe('42');
            expect(result.userId).toBe(42);
        });

        it('当后端返回 success: false 时，前端应该敏锐地抛出异常', async () => {
            // 模拟后端业务逻辑报错的情景
            vi.mocked(fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: false,
                    error: { message: '用户名已占用' }
                })
            } as any);

            /**
             * [Vitest API: rejects.toThrow]
             * 职责：专门用于测试异步函数是否会“翻车”（报错）。
             */
            await expect(fetchDefaultMap()).rejects.toThrow('用户名已占用');
        });

        it('fetchDefaultMap() 应该发起一个 GET 请求到正确的地图路径', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    data: {
                        document: { mapId: 'computer-world', version: '2026-04-11', domains: [], nodes: [] },
                        projection: { nodeById: {}, childrenById: {}, roots: [], topologicalOrder: [] }
                    }
                })
            } as any);

            await fetchDefaultMap();

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/maps/default'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });
    });
});
