import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CWFrameProgress } from '@shared/contract';

// 进度存储解构
type ProgressStore = Record<string, CWFrameProgress>;

// 核心类 ：ProgressRepo
export class ProgressRepo {
  // 定义进度数据文件路径
  private readonly filePath = path.resolve(process.cwd(), 'src/data/progress.json');

  // 从 progress.json 读取所有用户的进度数据
  private async readStore(): Promise<ProgressStore> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as ProgressStore;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  // 把用户进度写入文件（保存）
  private async writeStore(store: ProgressStore): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }

  // 根据用户 ID 查询他的进度
  async findByUserId(userId: number): Promise<CWFrameProgress | undefined> {
    const store = await this.readStore();
    return store[String(userId)];
  }

  // 更新或插入用户进度（没有就新建，有就覆盖）
  async upsertByUserId(progress: CWFrameProgress): Promise<CWFrameProgress> {
    const store = await this.readStore();
    store[String(progress.userId)] = progress;
    await this.writeStore(store);
    return progress;
  }
}

export const progressRepo = new ProgressRepo();
