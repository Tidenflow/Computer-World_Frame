import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CWFrameMap } from '@shared/contract';

export class MapRepo {
  private resolveCandidates(): string[] {
    return [
      path.resolve(process.cwd(), 'src/data/map.default.json'),
    ];
  }

  async getDefaultMap(): Promise<CWFrameMap | null> {
    const candidates = this.resolveCandidates();

    for (const filePath of candidates) {
      if (!existsSync(filePath)) continue;
      try {
        // 直接读取，不做任何 BOM 处理
        const raw = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as CWFrameMap;
        
        if (parsed && Array.isArray(parsed.nodes)) {
          return parsed;
        }
      } catch {
        // Try next candidate path.
      }
    }

    return null;
  }
}

export const mapRepo = new MapRepo();