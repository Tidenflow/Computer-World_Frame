import { describe, expect, it } from 'vitest';
import { buildMapProjection, type MapDocument } from '@shared/map-document';

describe('buildMapProjection', () => {
  it('builds projection data from a minimal map document', () => {
    const doc: MapDocument = {
      mapId: 'computer-world',
      version: '2026-04-11',
      domains: [{ id: 'hardware', title: 'Hardware', order: 1 }],
      nodes: [
        { id: 'cpu-basics', title: 'CPU Basics', domain: 'hardware', stage: 1, deps: [] },
        { id: 'binary', title: 'Binary', domain: 'hardware', stage: 2, deps: ['cpu-basics'] }
      ]
    };

    const projection = buildMapProjection(doc);

    expect(projection.roots).toEqual(['cpu-basics']);
    expect(projection.childrenById['cpu-basics']).toEqual(['binary']);
    expect(projection.nodeById['binary'].stage).toBe(2);
  });
});
