import type { CWFrameNode } from '@shared/contract';
import { describe, expect, it } from 'vitest';
import { layoutGraphTree } from '@frontend/core/cwframe.layout';

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

describe('cwframe.layout tree projection', () => {
  it('places child instances to the right of parent instances', () => {
    const nodes = [
      makeNode(1, 'root', []),
      makeNode(2, 'child', [1]),
      makeNode(3, 'leaf', [2])
    ];

    const { instances } = layoutGraphTree(nodes);
    const root = instances.find(instance => instance.sourceNodeId === 1)!;
    const child = instances.find(instance => instance.sourceNodeId === 2)!;
    const leaf = instances.find(instance => instance.sourceNodeId === 3)!;

    expect(root.x).toBeLessThan(child.x);
    expect(child.x).toBeLessThan(leaf.x);
  });

  it('duplicates a node when it belongs to multiple visible parent branches', () => {
    const nodes = [
      makeNode(1, 'root-a', []),
      makeNode(2, 'root-b', []),
      makeNode(3, 'shared-node', [1, 2])
    ];

    const { instances } = layoutGraphTree(nodes);
    const sharedInstances = instances.filter(instance => instance.sourceNodeId === 3);

    expect(sharedInstances).toHaveLength(2);
    expect(new Set(sharedInstances.map(instance => instance.parentInstanceKey)).size).toBe(2);
  });

  it('does not duplicate an entire descendant subtree for every shared parent branch', () => {
    const nodes = [
      makeNode(1, 'root-a', []),
      makeNode(2, 'root-b', []),
      makeNode(3, 'shared-node', [1, 2]),
      makeNode(4, 'deep-child', [3]),
      makeNode(5, 'deep-leaf', [4])
    ];

    const { instances } = layoutGraphTree(nodes);

    expect(instances.filter(instance => instance.sourceNodeId === 3)).toHaveLength(2);
    expect(instances.filter(instance => instance.sourceNodeId === 4)).toHaveLength(1);
    expect(instances.filter(instance => instance.sourceNodeId === 5)).toHaveLength(1);
  });

  it('treats visible nodes with hidden dependencies as local roots', () => {
    const nodes = [
      makeNode(1, 'hidden-root', []),
      makeNode(2, 'visible-node', [1]),
      makeNode(3, 'visible-child', [2])
    ];

    const { instances } = layoutGraphTree(nodes, {
      activeNodeIds: [2, 3]
    });

    expect(instances.map(instance => instance.sourceNodeId)).toEqual([2, 3]);
    expect(instances[0]?.parentInstanceKey).toBeNull();
    expect(instances[0]?.x).toBeLessThan(instances[1]?.x ?? 0);
  });

  it('creates links between tree instances instead of raw nodes', () => {
    const nodes = [
      makeNode(1, 'root', []),
      makeNode(2, 'child', [1]),
      makeNode(3, 'shared', [1, 2])
    ];

    const { instances, links } = layoutGraphTree(nodes);
    const childInstances = instances.filter(instance => instance.sourceNodeId === 3);

    expect(childInstances.length).toBeGreaterThan(1);
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.every(link => link.sourceInstanceKey !== link.targetInstanceKey)).toBe(true);
  });

  it('keeps separate root trees in different vertical bands', () => {
    const nodes = [
      makeNode(1, 'root-a', []),
      makeNode(2, 'leaf-a', [1]),
      makeNode(3, 'root-b', []),
      makeNode(4, 'leaf-b', [3])
    ];

    const { instances } = layoutGraphTree(nodes);
    const aNodes = instances.filter(instance => instance.branchPath[0] === 1);
    const bNodes = instances.filter(instance => instance.branchPath[0] === 3);
    const aCenter = aNodes.reduce((sum, node) => sum + node.y, 0) / aNodes.length;
    const bCenter = bNodes.reduce((sum, node) => sum + node.y, 0) / bNodes.length;

    expect(Math.abs(aCenter - bCenter)).toBeGreaterThan(80);
  });
});
