import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateMapDocument } from '../backend/src/scripts/build-map-projection';
import { buildMapProjection, type MapDocument } from '../shared/map-document';

describe('validateMapDocument', () => {
  it('rejects nodes that reference missing dependencies', () => {
    expect(() =>
      validateMapDocument({
        mapId: 'computer-world',
        version: '2026-04-11',
        domains: [{ id: 'software', title: 'Software', order: 1 }],
        nodes: [
          {
            id: 'api',
            title: 'API',
            domain: 'software',
            stage: 1,
            deps: ['missing-node']
          }
        ]
      })
    ).toThrow(/missing dependency/i);
  });

  it('ships a non-empty canonical default map document that can be projected', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../backend/src/data/maps/default.map.json'),
      'utf8'
    );
    const doc = JSON.parse(raw) as MapDocument;

    expect(doc.domains.length).toBeGreaterThanOrEqual(5);
    expect(doc.nodes.length).toBeGreaterThanOrEqual(20);

    expect(() => validateMapDocument(doc)).not.toThrow();

    const projection = buildMapProjection(doc);
    expect(projection.roots.length).toBeGreaterThan(0);
    expect(projection.topologicalOrder.length).toBe(doc.nodes.length);
  });
});
