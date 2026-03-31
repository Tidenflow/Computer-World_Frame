# 数据加载接口设计方案

## 核心目标

设计 `cwframe-loader.ts` 接口，实现：
1. 读取 `world-data.json` → CWFrameMap
2. 读取 `mock-progress.ts` → CWFrameProgress
3. 预留数据库切换能力

---

## 接口设计

```typescript
// 数据源类型
type DataSource = 'mock' | 'database';

interface LoaderConfig {
  source: DataSource;
  userId?: number;
}

// 统一的加载函数
async function loadFrameData(config: LoaderConfig): Promise<{
  map: CWFrameMap;
  progress: CWFrameProgress;
}>;

// 分层加载（可选）
async function loadMap(source: DataSource): Promise<CWFrameMap>;
async function loadProgress(userId: number, source: DataSource): Promise<CWFrameProgress>;
```

---

## 实现策略

### 1. 抽象数据获取层

```typescript
// data-provider.ts - 数据源抽象
interface DataProvider {
  getMap(): Promise<CWFrameMap>;
  getProgress(userId: number): Promise<CWFrameProgress>;
}

// Mock 实现
class MockDataProvider implements DataProvider {
  async getMap() { return worldDataJson; }
  async getProgress(userId: number) { return mockProgress; }
}

// 数据库实现（未来）
class DatabaseDataProvider implements DataProvider {
  async getMap() { return await api.get('/frame/map'); }
  async getProgress(userId: number) { return await api.get(`/user/${userId}/progress`); }
}
```

### 2. 工厂函数创建 provider

```typescript
function createDataProvider(source: DataSource): DataProvider {
  switch (source) {
    case 'mock': return new MockDataProvider();
    case 'database': return new DatabaseDataProvider();
  }
}
```

---

## 切换数据库时只需修改

1. 新增 `DatabaseDataProvider` 实现
2. 修改配置 `source: 'database'`

调用方代码无需改动。