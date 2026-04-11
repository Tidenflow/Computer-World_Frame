import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../backend/src/lib/prisma', () => ({
  prisma: {
    mapDocumentRecord: {
      findFirst: vi.fn()
    }
  }
}));

describe('mapRepo fallback loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the canonical default map JSON when no published record exists', async () => {
    const { prisma } = await import('../backend/src/lib/prisma');
    const { mapRepo } = await import('../backend/src/repositories/map.repo');

    vi.mocked(prisma.mapDocumentRecord.findFirst).mockResolvedValue(null);

    const result = await mapRepo.getDefaultMap();

    expect(result).not.toBeNull();
    expect(result?.document.mapId).toBe('computer-world');
    expect(result?.document.version).toBe('2026-04-11');
    expect(result?.document.nodes.length).toBeGreaterThanOrEqual(20);
    expect(result?.projection.roots.length).toBeGreaterThan(0);
    expect(result?.projection.topologicalOrder.length).toBe(result?.document.nodes.length);
  });
});
