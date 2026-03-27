import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CWFrameMap } from '@shared/contract';

// 当前仅实现默认图，后续可以扩展为多图
// 后续扩展存储图到数据库

export class MapRepo {
  //采用固定路径
  private readonly filePath = path.resolve(process.cwd(), 'src/data/map.default.json');

  async getDefaultMap(): Promise<CWFrameMap | null> {
    try {
      // 直接读取路径
      const raw = await readFile(this.filePath, 'utf-8');
      // 解析json
      const parsed = JSON.parse(raw) as CWFrameMap;
      // 返回
      return (parsed && Array.isArray(parsed.nodes)) ? parsed : null;
    } catch {
      return null;
    }
  }
}


export const mapRepo = new MapRepo();