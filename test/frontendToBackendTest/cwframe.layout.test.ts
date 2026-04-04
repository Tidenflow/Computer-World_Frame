import type { CWFrameNode } from '@shared/contract';
import { describe, expect, it } from 'vitest';
import { layoutGraphNodes } from '@frontend/core/cwframe.layout';

function makeNode(
  id: number,
  label: string,
  dependencies: number[],
  weight = 3
): CWFrameNode {
  return {
    id,
    label,
    description: `${label} description`,
    category: 'fundamentals',
    dependencies,
    weight
  };
}

describe('cwframe.layout', () => {
  it('places dependency layers from left to right', () => {
    const nodes = [
      makeNode(1, 'root', []),
      makeNode(2, 'middle', [1]),
      makeNode(3, 'leaf', [2])
    ];

    const positioned = layoutGraphNodes(nodes);
    const byId = new Map(positioned.map(node => [node.id, node]));

    expect(byId.get(1)?.x).toBeLessThan(byId.get(2)?.x ?? 0);
    expect(byId.get(2)?.x).toBeLessThan(byId.get(3)?.x ?? 0);
  });

  it('orders same-layer nodes by parent barycenter to reduce crossings', () => {
    const nodes = [
      makeNode(1, 'top-root', []),
      makeNode(2, 'bottom-root', []),
      makeNode(3, 'top-child', [1]),
      makeNode(4, 'bottom-child', [2]),
      makeNode(5, 'merge-a', [3]),
      makeNode(6, 'merge-b', [4])
    ];

    const positioned = layoutGraphNodes(nodes);
    const byId = new Map(positioned.map(node => [node.id, node]));

    expect(byId.get(1)?.y).toBeLessThan(byId.get(2)?.y ?? 0);
    expect(byId.get(3)?.y).toBeLessThan(byId.get(4)?.y ?? 0);
    expect(byId.get(5)?.y).toBeLessThan(byId.get(6)?.y ?? 0);
  });

  it('keeps independent roots vertically separated', () => {
    const nodes = [
      makeNode(1, 'alpha', []),
      makeNode(2, 'beta', []),
      makeNode(3, 'gamma', [])
    ];

    const positioned = layoutGraphNodes(nodes);
    const yPositions = positioned.map(node => node.y);
    const uniqueYPositions = new Set(yPositions);

    expect(uniqueYPositions.size).toBe(positioned.length);
  });
});
