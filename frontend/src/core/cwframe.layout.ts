import type { CWFrameNode } from '@shared/contract';

export interface GraphTreeInstance extends CWFrameNode {
  instanceKey: string;
  sourceNodeId: number;
  parentInstanceKey: string | null;
  branchPath: number[];
  depth: number;
  x: number;
  y: number;
}

export interface GraphTreeLink {
  key: string;
  sourceInstanceKey: string;
  targetInstanceKey: string;
  sourceNodeId: number;
  targetNodeId: number;
}

interface LayoutOptions {
  activeNodeIds?: Iterable<number>;
  width?: number;
  height?: number;
  paddingX?: number;
  paddingY?: number;
  siblingGap?: number;
}

interface TreeProjectionNode {
  node: CWFrameNode;
  instanceKey: string;
  parentInstanceKey: string | null;
  branchPath: number[];
  depth: number;
  children: TreeProjectionNode[];
}

interface TreeLayoutResult {
  instances: GraphTreeInstance[];
  links: GraphTreeLink[];
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 840;
const DEFAULT_PADDING_X = 150;
const DEFAULT_PADDING_Y = 96;
const DEFAULT_SIBLING_GAP = 152;

export function layoutGraphTree(
  nodes: CWFrameNode[],
  options: LayoutOptions = {}
): TreeLayoutResult {
  const activeNodeIdSet = options.activeNodeIds
    ? new Set(Array.from(options.activeNodeIds))
    : null;
  const visibleNodes = activeNodeIdSet
    ? nodes.filter(node => activeNodeIdSet.has(node.id))
    : nodes;

  if (visibleNodes.length === 0) {
    return { instances: [], links: [] };
  }

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const paddingX = options.paddingX ?? DEFAULT_PADDING_X;
  const paddingY = options.paddingY ?? DEFAULT_PADDING_Y;
  const siblingGap = options.siblingGap ?? DEFAULT_SIBLING_GAP;

  const nodeMap = new Map(visibleNodes.map(node => [node.id, node]));
  const childrenMap = buildVisibleChildrenMap(visibleNodes, nodeMap);
  const sortedRoots = getVisibleRoots(visibleNodes, nodeMap);
  const roots = sortedRoots.length > 0 ? sortedRoots : [...visibleNodes].sort(compareNodes);

  let instanceCounter = 0;
  const expandedSourceNodeIds = new Set<number>();
  const createTreeNode = (
    node: CWFrameNode,
    depth: number,
    parentInstanceKey: string | null,
    branchPath: number[],
    pathSet: Set<number>
  ): TreeProjectionNode => {
    const instanceKey = `${node.id}:${instanceCounter++}`;
    const nextBranchPath = [...branchPath, node.id];
    const nextPathSet = new Set(pathSet);
    nextPathSet.add(node.id);

    const shouldExpandChildren = !expandedSourceNodeIds.has(node.id);
    if (shouldExpandChildren) {
      expandedSourceNodeIds.add(node.id);
    }

    const children = shouldExpandChildren
      ? (childrenMap.get(node.id) ?? [])
          .filter(child => !nextPathSet.has(child.id))
          .sort(compareNodes)
          .map(child => createTreeNode(child, depth + 1, instanceKey, nextBranchPath, nextPathSet))
      : [];

    return {
      node,
      instanceKey,
      parentInstanceKey,
      branchPath: nextBranchPath,
      depth,
      children
    };
  };

  const treeRoots = roots.map(root => createTreeNode(root, 0, null, [], new Set<number>()));
  const leafWeights = new Map<string, number>();
  const rootBands = allocateRootBands(treeRoots, leafWeights, height, paddingY, siblingGap);
  const globalMaxDepth = Math.max(...treeRoots.map(root => getMaxDepth(root)), 0);
  const xStep = globalMaxDepth > 0 ? (width - paddingX * 2) / globalMaxDepth : 0;

  const instances: GraphTreeInstance[] = [];
  const links: GraphTreeLink[] = [];

  const assignCoordinates = (
    treeNode: TreeProjectionNode,
    topY: number,
    bottomY: number
  ): void => {
    const centerY = (topY + bottomY) / 2;
    const { node } = treeNode;

    instances.push({
      ...node,
      instanceKey: treeNode.instanceKey,
      sourceNodeId: node.id,
      parentInstanceKey: treeNode.parentInstanceKey,
      branchPath: treeNode.branchPath,
      depth: treeNode.depth,
      x: paddingX + xStep * treeNode.depth,
      y: centerY
    });

    if (treeNode.parentInstanceKey) {
      links.push({
        key: `${treeNode.parentInstanceKey}->${treeNode.instanceKey}`,
        sourceInstanceKey: treeNode.parentInstanceKey,
        targetInstanceKey: treeNode.instanceKey,
        sourceNodeId: treeNode.branchPath[treeNode.branchPath.length - 2] ?? node.id,
        targetNodeId: node.id
      });
    }

    if (treeNode.children.length === 0) return;

    let cursor = topY;
    treeNode.children.forEach(child => {
      const childWeight = leafWeights.get(child.instanceKey) ?? 1;
      const childHeight = childWeight * siblingGap;
      assignCoordinates(child, cursor, cursor + childHeight);
      cursor += childHeight;
    });
  };

  rootBands.forEach(({ root, topY, bottomY }) => {
    assignCoordinates(root, topY, bottomY);
  });

  return { instances, links };
}

function buildVisibleChildrenMap(
  nodes: CWFrameNode[],
  nodeMap: Map<number, CWFrameNode>
): Map<number, CWFrameNode[]> {
  const childrenMap = new Map<number, CWFrameNode[]>();

  for (const node of nodes) {
    childrenMap.set(node.id, []);
  }

  for (const node of nodes) {
    for (const dependencyId of node.dependencies) {
      if (!nodeMap.has(dependencyId)) continue;
      childrenMap.get(dependencyId)?.push(node);
    }
  }

  return childrenMap;
}

function getVisibleRoots(
  nodes: CWFrameNode[],
  nodeMap: Map<number, CWFrameNode>
): CWFrameNode[] {
  return nodes
    .filter(node => node.dependencies.filter(dependencyId => nodeMap.has(dependencyId)).length === 0)
    .sort(compareNodes);
}

function compareNodes(left: CWFrameNode, right: CWFrameNode): number {
  if ((left.tier ?? 0) !== (right.tier ?? 0)) {
    return (left.tier ?? 0) - (right.tier ?? 0);
  }

  if (left.weight !== right.weight) {
    return right.weight - left.weight;
  }

  const labelCompare = left.label.localeCompare(right.label);
  if (labelCompare !== 0) return labelCompare;

  return left.id - right.id;
}

function computeLeafWeight(
  node: TreeProjectionNode,
  leafWeights: Map<string, number>
): number {
  if (node.children.length === 0) {
    leafWeights.set(node.instanceKey, 1);
    return 1;
  }

  const weight = node.children.reduce(
    (sum, child) => sum + computeLeafWeight(child, leafWeights),
    0
  );

  leafWeights.set(node.instanceKey, weight);
  return weight;
}

function allocateRootBands(
  roots: TreeProjectionNode[],
  leafWeights: Map<string, number>,
  height: number,
  paddingY: number,
  siblingGap: number
): Array<{ root: TreeProjectionNode; topY: number; bottomY: number }> {
  roots.forEach(root => computeLeafWeight(root, leafWeights));

  const totalLeafWeight = roots.reduce(
    (sum, root) => sum + (leafWeights.get(root.instanceKey) ?? 1),
    0
  );
  const availableHeight = Math.max(height - paddingY * 2, siblingGap);
  const totalGap = Math.max(roots.length - 1, 0) * Math.min(56, siblingGap * 0.45);
  const usableHeight = Math.max(availableHeight - totalGap, siblingGap);
  const unitHeight = usableHeight / Math.max(totalLeafWeight, 1);
  const gap = roots.length > 1 ? totalGap / (roots.length - 1) : 0;

  let cursor = paddingY;

  return roots.map(root => {
    const rootWeight = leafWeights.get(root.instanceKey) ?? 1;
    const bandHeight = Math.max(rootWeight * unitHeight, siblingGap);
    const band = {
      root,
      topY: cursor,
      bottomY: cursor + bandHeight
    };
    cursor += bandHeight + gap;
    return band;
  });
}

function getMaxDepth(node: TreeProjectionNode): number {
  if (node.children.length === 0) return node.depth;
  return Math.max(...node.children.map(child => getMaxDepth(child)));
}
