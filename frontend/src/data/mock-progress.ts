import type { CWFrameProgress } from '@shared/contract';

export const mockProgress: CWFrameProgress = {
  userId: 1,
  unlockedNodes: {
    1: { unlockedAt: Date.now() }, // 你的 id=1 相当于 zero-and-one
    3: { unlockedAt: Date.now() }
  }
};
