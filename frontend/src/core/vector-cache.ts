/**
 * ========================================================================
 * 向量缓存模块 — Phase 2
 *
 * 职责：
 * 1. 管理节点文本 → 向量（embeddings）的存储
 * 2. 通过 IndexedDB 持久化，跨会话复用
 * 3. 以 mapVersion 为失效条件，自动重建
 * 4. 提供 rerank 接口：对候选列表按语义相关性重排
 *
 * 设计决策：
 * - 使用 @huggingface/transformers（WebAssembly + WebGPU 加速）
 * - 模型：Xenova/all-MiniLM-L6-v2（~80MB，量化版 ~22MB）
 * - 嵌入文本：节点 title + aliases.join(', ') + description（如果有）
 * - 最大向量维度：384（all-MiniLM-L6-v2 输出）
 * ========================================================================
 */

import { pipeline, env } from '@huggingface/transformers';
import { openDB, type IDBPDatabase } from 'idb';
import type { MapNodeDocument } from '@shared/contract';
import type { MatchCandidate } from './matching';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 单个节点的向量记录 */
interface NodeVectorRecord {
  nodeId: string;
  /** 384维归一化向量（Float32Array） */
  embedding: Float32Array;
  /** 嵌入文本（用于调试 / 缓存校验） */
  text: string;
  /** 向量计算时间戳 */
  computedAt: number;
}

/** IndexedDB 中存储的完整向量缓存 */
interface VectorCacheEntry {
  mapVersion: string;
  records: NodeVectorRecord[];
  computedAt: number;
}

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const DB_NAME = 'cwframe-vectors';
const DB_VERSION = 1;
const STORE_NAME = 'vector-cache';
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/** 向量维度（all-MiniLM-L6-v2 输出） */
export const EMBEDDING_DIM = 384;

// 允许在浏览器中使用危险的跨域资源（模型权重）
env.allowLocalModels = true;
env.useBrowserCache = true;

// ---------------------------------------------------------------------------
// 数据库操作
// ---------------------------------------------------------------------------

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'mapVersion' });
      }
    }
  });

  return _db;
}

/** 根据 mapVersion 从 IndexedDB 读取缓存（命中则返回记录，miss 则返回 null） */
async function readCache(mapVersion: string): Promise<VectorCacheEntry | null> {
  try {
    const db = await getDb();
    const entry = await db.get(STORE_NAME, mapVersion);
    return entry ?? null;
  } catch {
    // IndexedDB 不可用（隐私模式 / 权限拒绝），静默降级
    return null;
  }
}

/** 将向量缓存写入 IndexedDB */
async function writeCache(entry: VectorCacheEntry): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, entry);
  } catch {
    // IndexedDB 写入失败不影响主流程
  }
}

/**
 * 清理旧版本的缓存（只保留最新版本）
 * 避免 IndexedDB 无限膨胀
 */
async function pruneOldCache(keepVersion: string): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let cursor = await store.openCursor();
    while (cursor) {
      if (cursor.key !== keepVersion) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch {
    // 静默降级
  }
}

// ---------------------------------------------------------------------------
// 向量计算（主线程 + WASM）
// ---------------------------------------------------------------------------

/**
 * 文本嵌入管道（单例）
 * Transformers.js 会自动选择最佳后端：WebGPU > WASM > WebAssembly
 * 首次调用时懒加载模型，之后复用同一个 pipeline 实例
 */
type EmbeddingTensor = {
  data: ArrayLike<number>;
};

type EmbeddingPipeline = (
  text: string | string[],
  options?: {
    pooling?: 'none' | 'mean' | 'cls' | 'first_token' | 'eos' | 'last_token';
    normalize?: boolean;
    quantize?: boolean;
    precision?: 'binary' | 'ubinary';
  }
) => Promise<EmbeddingTensor>;
let _embeddingPipeline: EmbeddingPipeline | null = null;

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (_embeddingPipeline) return _embeddingPipeline;

  _embeddingPipeline = await pipeline(
    'feature-extraction',
    MODEL_NAME,
    {
      device: 'wasm', // 浏览器环境使用 WebAssembly（兼容性好）
      // progress_callback 用于追踪模型下载进度
    }
  ) as EmbeddingPipeline;

  return _embeddingPipeline;
}

/**
 * 计算单段文本的向量
 *
 * @param text - 要嵌入的文本（通常为节点 title + aliases）
 * @returns 384维归一化 Float32Array 向量
 */
async function computeEmbedding(text: string): Promise<Float32Array> {
  const extractor = await getEmbeddingPipeline();
  if (!extractor) {
    throw new Error('[vector-cache] Failed to initialize embedding pipeline');
  }

  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true, // L2 归一化，余弦相似度 = 点积
  });

  // output 是一个 2D 张量，shape [1, 384]
  const arr = new Float32Array(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    arr[i] = output.data[i];
  }

  return arr;
}

/**
 * 批量计算多个节点的向量（后台预计算时使用）
 *
 * @param nodes - 节点列表
 * @param onProgress - 进度回调 (done, total)
 */
async function computeNodeEmbeddings(
  nodes: MapNodeDocument[],
  onProgress?: (done: number, total: number) => void
): Promise<NodeVectorRecord[]> {
  const records: NodeVectorRecord[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const text = buildNodeText(node);

    try {
      const embedding = await computeEmbedding(text);
      records.push({
        nodeId: node.id,
        embedding,
        text,
        computedAt: Date.now(),
      });
    } catch (err) {
      // 单节点计算失败不影响整体，跳过该节点
      console.warn(`[vector-cache] Failed to embed node "${node.id}":`, err);
    }

    onProgress?.(i + 1, nodes.length);
  }

  return records;
}

/**
 * 构建节点的嵌入文本
 *
 * 格式：title (aliases.join(', ')) — type — tags — description
 * 例如：Docker — docker, Docker, 容器虚拟化 — tool — containerization, image, registry, dockerfile — 轻量级容器化工具
 */
function buildNodeText(node: MapNodeDocument): string {
  const parts: string[] = [node.title];
  if (node.aliases && node.aliases.length > 0) {
    parts.push(node.aliases.join(', '));
  }
  if (node.type) {
    parts.push(node.type);
  }
  if (node.tags && node.tags.length > 0) {
    parts.push(node.tags.join(', '));
  }
  if (node.description) {
    parts.push(node.description);
  }
  return parts.join(' — ');
}

// ---------------------------------------------------------------------------
// 向量相似度计算
// ---------------------------------------------------------------------------

/**
 * 计算两个向量的余弦相似度（O(384)）
 * 由于向量已归一化，余弦相似度 = 点积
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/** 全局缓存实例（单例） */
class VectorCache {
  /** 当前地图版本的缓存数据 */
  private cache: Map<string, Float32Array> = new Map();

  /** 缓存所属的 mapVersion */
  private mapVersion: string = '';

  /** 是否已初始化完成 */
  private initialized: boolean = false;

  /** 当前是否正在初始化 */
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化向量缓存
   *
   * 策略：
   * 1. 先从 IndexedDB 读取缓存（命中则跳过计算）
   * 2. 若无缓存，后台计算所有节点向量并存入 IndexedDB
   *
   * @param nodes - 当前地图所有节点
   * @param mapVersion - 地图版本（用于缓存失效判断）
   * @param onProgress - 预计算进度回调
   */
  async init(
    nodes: MapNodeDocument[],
    mapVersion: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<void> {
    // 如果已经用相同的 mapVersion 初始化过，直接返回
    if (this.initialized && this.mapVersion === mapVersion) return;

    // 如果正在初始化，等待它完成
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this._initInternal(nodes, mapVersion, onProgress);
    await this.initPromise;
    this.initialized = true;
  }

  private async _initInternal(
    nodes: MapNodeDocument[],
    mapVersion: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<void> {
    this.mapVersion = mapVersion;
    this.cache.clear();

    // Step 1: 尝试从 IndexedDB 读取缓存
    const cached = await readCache(mapVersion);
    if (cached) {
      for (const record of cached.records) {
        this.cache.set(record.nodeId, record.embedding);
      }
      console.info(`[vector-cache] IndexedDB hit for mapVersion="${mapVersion}" (${cached.records.length} nodes)`);
      return;
    }

    // Step 2: 无缓存，计算所有节点向量
    console.info(`[vector-cache] IndexedDB miss for mapVersion="${mapVersion}", computing embeddings...`);

    const records = await computeNodeEmbeddings(nodes, onProgress);

    for (const record of records) {
      this.cache.set(record.nodeId, record.embedding);
    }

    // Step 3: 写入 IndexedDB
    await writeCache({
      mapVersion,
      records,
      computedAt: Date.now(),
    });

    // Step 4: 清理旧缓存（只保留最新版本）
    await pruneOldCache(mapVersion);
  }

  /**
   * 判断是否已初始化
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取指定节点的向量（未缓存则返回 null）
   */
  getEmbedding(nodeId: string): Float32Array | null {
    return this.cache.get(nodeId) ?? null;
  }

  /**
   * 对候选列表进行语义重排
   *
   * 当 mapVersion 匹配且模型已初始化时：
   * 1. 计算用户输入 term 的向量
   * 2. 计算每个候选节点与 term 的余弦相似度
   * 3. 将相似度作为新的排序依据（与原有 score 加权合并）
   *
   * 降级策略：
   * - 模型未初始化 / 计算失败 → 返回原始顺序
   * - 向量缓存未命中（节点无 embedding）→ 保留原始分数
   *
   * @param candidates - 原始候选列表（来自 keywordMatch / fuzzyFallback）
   * @param term - 用户输入词
   * @returns 重排后的候选列表（same array, mutated in-place + sorted）
   */
  async rerank(candidates: MatchCandidate[], term: string): Promise<void> {
    if (!this.initialized || candidates.length === 0) return;

    // Step 1: 计算用户输入 term 的向量
    let termEmbedding: Float32Array | null = null;
    try {
      termEmbedding = await computeEmbedding(term.trim().toLowerCase());
    } catch {
      console.warn('[vector-cache] Failed to embed query term, skipping rerank');
      return;
    }

    // Step 2: 计算每个候选的语义相似度并加权合并
    const withSimilarity = candidates.map(c => {
      if (!c.node) return { candidate: c, semanticScore: 0 };

      const nodeEmbedding = this.getEmbedding(c.node.id);
      if (!nodeEmbedding) return { candidate: c, semanticScore: 0 };

      const semanticScore = cosineSimilarity(termEmbedding!, nodeEmbedding);
      return { candidate: c, semanticScore };
    });

    // Step 3: 加权排序
    // 原始 keyword score 权重 0.4，语义相似度权重 0.6
    const K1 = 0.4;  // keyword score 权重
    const K2 = 0.6;  // semantic score 权重

    withSimilarity.sort((a, b) => {
      const combinedA = K1 * a.candidate.score + K2 * a.semanticScore;
      const combinedB = K1 * b.candidate.score + K2 * b.semanticScore;
      return combinedB - combinedA;
    });

    // Step 4: 写回原数组（保留原始对象引用）
    for (let i = 0; i < withSimilarity.length; i++) {
      candidates[i] = withSimilarity[i].candidate;
    }
  }

  /**
   * 纯语义搜索：给定 term，在全量节点中找语义最相关的候选
   *
   * 与 rerank 的区别：rerank 是对已有候选重排，search 是无候选时从零搜索。
   *
   * @param term - 用户输入词
   * @param nodes - 全量节点列表（用于根据 nodeId 找到节点对象）
   * @param topK - 返回最多 topK 个结果，默认 5
   * @returns 按语义相似度降序排列的结果
   */
  async search(term: string, nodes: MapNodeDocument[], topK = 5): Promise<Array<{ node: MapNodeDocument; score: number }>> {
    if (!this.initialized || nodes.length === 0) return [];

    // 计算 term 的向量
    let termEmbedding: Float32Array | null = null;
    try {
      termEmbedding = await computeEmbedding(term.trim().toLowerCase());
    } catch {
      console.warn('[vector-cache] Failed to embed query term for search');
      return [];
    }

    // 计算所有节点的语义相似度
    const scored: Array<{ node: MapNodeDocument; score: number }> = [];

    for (const node of nodes) {
      const embedding = this.cache.get(node.id);
      if (!embedding) continue;

      const score = cosineSimilarity(termEmbedding!, embedding);
      // 余弦相似度通常在 [-1, 1]，归一化向量下基本 [0, 1]
      // 阈值：只保留 score > 0.3 的（语义正相关且有意义的匹配）
      if (score > 0.3) {
        scored.push({ node, score });
      }
    }

    // 按相似度降序，取 topK
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * 重置缓存（地图切换时调用）
   */
  reset(): void {
    this.initialized = false;
    this.mapVersion = '';
    this.cache.clear();
    this.initPromise = null;
  }
}

/** 全局单例 */
export const vectorCache = new VectorCache();
