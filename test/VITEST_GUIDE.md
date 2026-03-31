# Vitest 使用指南 (Vitest Usage Guide)

本文档旨在介绍如何在 `test` 目录下使用 Vitest 进行前端逻辑和集成测试。

---

## 1. 为什么使用 Vitest?

*   **极速**: 基于 Vite 开发，冷启动速度极快。
*   **兼容性**: 与 Jest 的 API 完全兼容（`describe`, `it`, `expect`）。
*   **全功能**: 内置强大的 Mock (模拟) 功能。
*   **浏览器环境**: 配合 `jsdom` 可以轻松测试需要 `localStorage` 或 `fetch` 的代码。

---

## 2. 常用命令 (Commands)

在 `test` 目录下执行：

*   **运行所有测试**: `npx vitest`
    *   *注: 默认进入 UI 模式或监听模式。*
*   **运行并立即退出**: `npx vitest run`
    *   *适用于流水线 CI 或只运行一次。*
*   **运行特定文件夹**: `npx vitest .\frontendToBackendTest\`
*   **展示测试面板 (UI)**: `npx vitest --ui`
    *   *可视化界面能直观查看测试覆盖率和进度。*

---

## 3. 核心 API 快速上手

### A. 测试套件与用例
```typescript
describe('描述一组功能', () => {
    it('描述一个具体的测试点', () => {
        // ...执行代码
        expect(1 + 1).toBe(2); // 断言
    });
});
```

### B. 常用的断言 (Expect)
*   `expect(a).toBe(b)`: 完全相等（引用也相等）。
*   `expect(a).toEqual(b)`: 对象内容相等（深比较）。
*   `expect(a).toBeDefined()`: 不是 undefined。
*   `expect(fn).rejects.toThrow()`: 断言异步函数会抛出异常。

### C. 强大的 Mock (模拟)
当测试需要隔离网络请求或浏览器 API 时：
```typescript
// 1. 模拟全局函数 (如 fetch)
vi.stubGlobal('fetch', vi.fn());

// 2. 模拟整个模块
vi.mock('../path/to/module', () => ({
    someFunction: vi.fn().mockResolvedValue('mocked_data')
}));

// 3. 拦截/监控某个组件库的方法 (Spies)
const spy = vi.spyOn(localStorage, 'setItem');
```

---

## 4. 最佳实践 (Best Practices)

1.  **数据隔离**: 每次测试前，在 `beforeEach` 中使用 `localStorage.clear()` 或清理 Mock 记录，防止测试用例互相干扰。
2.  **单一职责**: 每个 `it` 只测试一个具体的点（比如登录成功、登录失败各一个 `it`）。
3.  **命名清晰**: 用中文或英文清晰地描述测试行为，让失败时的信息一目了然。

---

**测试是代码的防腐剂。有了单元测试，你可以大胆地重构代码而不用担心破坏原有功能！**
