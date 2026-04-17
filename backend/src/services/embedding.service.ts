/**
 * Embedding 预计算服务 — 运行时加载预计算的 embedding 数据
 *
 * 职责：读取预生成的 embedding JSON 文件，随地图数据一并下发给前端，
 * 减少前端的首次加载计算量。
 */

import fs from 'node:fs';
import path from 'node:path';

const EMBEDDINGS_DIR = path.resolve(__dirname, '../../src/data/embeddings');

export interface EmbeddingEntry {
  mapId: string;
  version: string;
  model: string;
  dimension: number;
  computedAt: string;
  embeddings: Record<string, number[]>;
}

export class EmbeddingService {
  /**
   * 加载指定地图的预计算 embedding 数据
   */
  loadEmbeddings(mapId: string): EmbeddingEntry | null {
    const filePath = path.join(EMBEDDINGS_DIR, `${mapId}.embeddings.json`);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw) as EmbeddingEntry;
    } catch {
      return null;
    }
  }

  /**
   * 获取所有已预计算的地图 ID 列表
   */
  getAvailableMapIds(): string[] {
    try {
      if (!fs.existsSync(EMBEDDINGS_DIR)) return [];
      return fs
        .readdirSync(EMBEDDINGS_DIR)
        .filter(f => f.endsWith('.embeddings.json'))
        .map(f => f.replace('.embeddings.json', ''));
    } catch {
      return [];
    }
  }
}

export const embeddingService = new EmbeddingService();
