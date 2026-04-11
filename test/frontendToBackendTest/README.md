# 前端到后端集成与逻辑测试 (Frontend-to-Backend Test Guide)

本项目已经完成了从 **静态 Mock** 到 **文档化地图 API** 的整体架构升级。为了确保 `MapDocument + MapProjection + UserProgressDocument` 这套链路稳定，我们设计了这套测试方案。

---

## 1. 测试工具 (Tools)

*   **测试运行器 (Test Runner)**: [**Vitest**](https://vitest.dev/)
    *   *选择理由*: Vite 原生支持，速度极快，且与当前前端构建工具链完美契合。
*   **运行时环境 (Runtime Environment)**: [**jsdom**](https://github.com/jsdom/jsdom)
    *   *选择理由*: 模拟浏览器环境，使测试代码能够访问 `fetch`、`localStorage` 和 DOM API。
*   **异常拦截 (Mocks)**:
    *   使用 `vi.stubGlobal('fetch', ...)` 来模拟网络请求，避开对真实后端服务的依赖，专注于前端逻辑正确性。

---

## 2. 测试步骤 (Test Steps)

### 第一步：准备测试环境
确保在 `test` 目录下安装了必要的依赖包：
```bash
cd test
npm install -D vitest jsdom
```

### 第二步：配置 Vitest
已经在 `test/vitest.config.ts` 中完成了浏览器环境 (jsdom) 的模拟配置。

### 第三步：运行测试
在 `test` 目录下执行以下命令：
```bash
# 运行前端到后端契约测试
npx vitest .\frontendToBackendTest\

# 或运行文档化地图相关的核心回归
npm test -- cwframe.api.test.ts cwframe.loader.test.ts cwframe.progress-document.test.ts
```

---

## 3. 测试覆盖内容 (What's Covered)

### A. API 封装层 (`cwframe.api.ts`)
*   **登录注册 (Login/Register)**: 验证请求是否包含正确的 Body、Headers，且成功后是否能自动将 `userId` 存入 `localStorage`。
*   **地图载入 (Map Payload)**: 验证默认地图接口返回的是 `document + projection` 结构，而不是旧的 `version + nodes`。
*   **错误拦截 (Error Handling)**: 验证当后端返回 `{ success: false }` 时，前端是否能正确转化为 `Error` 对象并抛出，而不是直接崩溃。

### B. 业务加载层 (`cwframe.loader.ts`)
*   **地图装载 (Map Loader)**: 验证 `loadFrameMap` 会直接透传后端返回的 `CWFrameMapPayload`。
*   **状态文档 (Progress Document)**: 验证 `UserProgressDocument` 会按 `mapId + mapVersion + unlocked` 的新结构流转，而不是旧的 `unlockedNodes`。

---

## 4. 预期效果 (Expected Results)

1.  **终端输出**: 所有测试用例（Test Passes）应显示为 ✅ 状态。
2.  **不依赖后端**: 即使你关闭后端 Server (localhost:3000)，这些测试依然可以运行通过，因为我们 Mock 了所有的 Fetch 网络请求。
3.  **开发信心**: 之后如果你修改了 `cwframe.api.ts` 的接口地址或逻辑，只要运行一下这些测试，几秒钟内就能知道你的改动是否破坏了现有功能。

---

**测试不仅仅是检查错误，更是为了让你的“实战级项目”具备可持续维护的能力！**
