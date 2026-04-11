import { describe, expect, it } from 'vitest';
import { validateMapDocument } from '../backend/src/scripts/build-map-projection';

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
});
