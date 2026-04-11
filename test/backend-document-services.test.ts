import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../backend/src/repositories/map.repo', () => ({
  mapRepo: {
    getDefaultMap: vi.fn()
  }
}));

vi.mock('../backend/src/repositories/progress.repo', () => ({
  progressRepo: {
    findByUserMapVersion: vi.fn(),
    upsertProgress: vi.fn()
  }
}));

vi.mock('../backend/src/repositories/user.repo', () => ({
  userRepo: {
    findById: vi.fn()
  }
}));

describe('document-centered backend services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mapService.getDefaultMap returns document and projection payload', async () => {
    const { mapRepo } = await import('../backend/src/repositories/map.repo');
    const { mapService } = await import('../backend/src/services/map.service');

    vi.mocked(mapRepo.getDefaultMap).mockResolvedValue({
      document: {
        mapId: 'computer-world',
        version: '2026-04-11',
        domains: [],
        nodes: []
      },
      projection: {
        nodeById: {},
        childrenById: {},
        roots: [],
        topologicalOrder: []
      }
    });

    const result = await mapService.getDefaultMap();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.document.mapId).toBe('computer-world');
      expect(result.data.projection.nodeById).toEqual({});
    }
  });

  it('progressService.getProgress returns a versioned progress document', async () => {
    const { progressRepo } = await import('../backend/src/repositories/progress.repo');
    const { userRepo } = await import('../backend/src/repositories/user.repo');
    const { progressService } = await import('../backend/src/services/progress.service');

    vi.mocked(userRepo.findById).mockResolvedValue({
      id: 1,
      username: 'tester',
      password: 'secret',
      timeStamp: 1
    });

    vi.mocked(progressRepo.findByUserMapVersion).mockResolvedValue({
      userId: 1,
      mapId: 'computer-world',
      mapVersion: '2026-04-11',
      unlocked: {
        'cpu-basics': { unlockedAt: 1712800000000 }
      }
    });

    const result = await progressService.getProgress(1, 'computer-world', '2026-04-11');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mapVersion).toBe('2026-04-11');
      expect(result.data.unlocked['cpu-basics'].unlockedAt).toBe(1712800000000);
    }
  });
});
