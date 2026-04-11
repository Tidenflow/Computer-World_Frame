import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFrameMap } from '../../frontend/src/core/cwframe.loader';

vi.stubGlobal('fetch', vi.fn());

describe('cwframe.loader', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    localStorage.clear();
  });

  it('loadFrameMap returns document and projection payload from the backend response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
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
          }
        })
    } as any);

    const result = await loadFrameMap();

    expect(result.document.mapId).toBe('computer-world');
    expect(result.projection.topologicalOrder).toEqual([]);
  });
});
