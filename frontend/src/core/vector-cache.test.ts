import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EMBEDDING_DIM, vectorCache } from './vector-cache';
import type { MapNodeDocument } from '@shared/contract';

// ---------------------------------------------------------------------------
// Mock transformers.js pipeline
// ---------------------------------------------------------------------------

function makeMockEmbedding(text: string): Float32Array {
  const arr = new Float32Array(EMBEDDING_DIM);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  const factor = 1 / Math.sqrt(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    arr[i] = ((hash * (i + 1)) & 0xFFFF) / 0xFFFF * factor;
  }
  return arr;
}

const mockEmbeddingCache = new Map<string, Float32Array>();
function getOrCreate(text: string): Float32Array {
  if (!mockEmbeddingCache.has(text)) {
    mockEmbeddingCache.set(text, makeMockEmbedding(text));
  }
  return mockEmbeddingCache.get(text)!;
}

vi.mock('@huggingface/transformers', () => {
  // pipeline 返回的是一个可调用的异步函数（模拟 feature-extraction 管道）
  const mockExtractor = async (text: string) => ({
    data: getOrCreate(text),
    dims: [1, EMBEDDING_DIM] as [number, number],
  });
  return {
    pipeline: vi.fn().mockResolvedValue(mockExtractor),
    env: {
      allowLocalModels: true,
      useBrowserCache: true,
    },
  };
});

// ---------------------------------------------------------------------------
// Mock idb
// ---------------------------------------------------------------------------

const dbStore = new Map<string, object>();

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    get: vi.fn().mockImplementation((_name: string, key: string) => dbStore.get(key) ?? null),
    put: vi.fn().mockImplementation((_name: string, value: object) => {
      dbStore.set((value as { mapVersion: string }).mapVersion, value);
      return Promise.resolve();
    }),
    transaction: vi.fn().mockReturnValue({
      objectStore: vi.fn().mockReturnValue({
        openCursor: vi.fn().mockResolvedValue(null),
      }),
      done: Promise.resolve(),
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockNodes: MapNodeDocument[] = [
  {
    id: 'http',
    title: 'HTTP',
    domain: 'network',
    stage: 3,
    deps: ['tcp-ip'],
    aliases: ['HyperText Transfer Protocol'],
  },
  {
    id: 'web-api',
    title: 'Web API',
    domain: 'network',
    stage: 4,
    deps: ['http'],
    aliases: ['API', 'api'],
  },
  {
    id: 'docker',
    title: 'Docker',
    domain: 'programming',
    stage: 4,
    deps: ['linux'],
    aliases: ['docker'],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('vectorCache.init', () => {
  beforeEach(() => {
    vectorCache.reset();
    dbStore.clear();
    mockEmbeddingCache.clear();
  });

  it('初始化后 isReady 返回 true', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    expect(vectorCache.isReady()).toBe(true);
  });

  it('相同 mapVersion 重复 init 不报错', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    await vectorCache.init(mockNodes, 'v1-test');
    expect(vectorCache.isReady()).toBe(true);
  });

  it('不同 mapVersion 正常初始化', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    vectorCache.reset();
    await vectorCache.init(mockNodes, 'v2-test');
    expect(vectorCache.isReady()).toBe(true);
  });

  it('初始化后 getEmbedding 返回非 null', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    expect(vectorCache.getEmbedding('http')).not.toBeNull();
  });

  it('未知节点 getEmbedding 返回 null', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    expect(vectorCache.getEmbedding('non-existent')).toBeNull();
  });
});

describe('vectorCache.reset', () => {
  it('reset 后 isReady 返回 false', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    vectorCache.reset();
    expect(vectorCache.isReady()).toBe(false);
  });
});

describe('vectorCache.rerank', () => {
  beforeEach(() => {
    vectorCache.reset();
    dbStore.clear();
    mockEmbeddingCache.clear();
  });

  it('空候选列表不报错', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    await expect(vectorCache.rerank([], 'http')).resolves.not.toThrow();
  });

  it('单候选 rerank 后长度不变', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    const candidates = [{
      node: mockNodes[0],
      matchType: 'exact' as const,
      contextHints: [],
      score: 1.0,
    }];
    await vectorCache.rerank(candidates, 'http');
    expect(candidates).toHaveLength(1);
  });

  it('null 节点候选保留在结果中', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    const candidates = [
      { node: null, matchType: 'non-tech' as const, contextHints: ['提示'], score: 0 },
      { node: mockNodes[0], matchType: 'exact' as const, contextHints: [], score: 1.0 },
      { node: mockNodes[1], matchType: 'partial' as const, contextHints: [], score: 0.8 },
    ];
    await vectorCache.rerank(candidates, 'test');
    expect(candidates.some(c => c.node === null)).toBe(true);
    expect(candidates.filter(c => c.node !== null)).toHaveLength(2);
  });

  it('rerank 保留所有 node 引用', async () => {
    await vectorCache.init(mockNodes, 'v1-test');
    const nodeA = mockNodes[0];
    const nodeB = mockNodes[1];
    const candidates = [
      { node: nodeA, matchType: 'partial' as const, contextHints: [], score: 0.8 },
      { node: nodeB, matchType: 'partial' as const, contextHints: [], score: 0.8 },
    ];
    await vectorCache.rerank(candidates, 'web');
    const nodeIds = candidates.map(c => c.node?.id).filter(Boolean);
    expect(nodeIds).toContain('http');
    expect(nodeIds).toContain('web-api');
  });
});

describe('EMBEDDING_DIM', () => {
  it('向量维度为 384 (all-MiniLM-L6-v2)', () => {
    expect(EMBEDDING_DIM).toBe(384);
  });
});
