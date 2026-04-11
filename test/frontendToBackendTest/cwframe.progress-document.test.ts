import { describe, expect, it } from 'vitest';
import { buildStatusMap } from '../../frontend/src/core/cwframe.status';

describe('buildStatusMap', () => {
  it('uses projection order with versioned progress documents', () => {
    const map = {
      document: {
        mapId: 'computer-world',
        version: '2026-04-11',
        domains: [],
        nodes: []
      },
      projection: {
        nodeById: {
          cpu: { id: 'cpu', title: 'CPU', domain: 'hardware', stage: 1, deps: [] }
        },
        childrenById: { cpu: [] },
        roots: ['cpu'],
        topologicalOrder: ['cpu']
      }
    };

    const progress = {
      userId: 1,
      mapId: 'computer-world',
      mapVersion: '2026-04-11',
      unlocked: {}
    };

    expect(buildStatusMap(map as any, progress as any).cpu).toBe('Discoverable');
  });
});
