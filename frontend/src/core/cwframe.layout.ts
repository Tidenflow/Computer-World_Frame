import type { CWFrameNode } from '@shared/contract';

export interface GraphLayoutNode extends CWFrameNode {
  depth: number;
  x: number;
  y: number;
}

interface LayoutOptions {
  width?: number;
  height?: number;
  paddingX?: number;
  paddingY?: number;
  minVerticalGap?: number;
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 840;
const DEFAULT_PADDING_X = 150;
const DEFAULT_PADDING_Y = 96;
const DEFAULT_MIN_VERTICAL_GAP = 120;

export function layoutGraphNodes(
  nodes: CWFrameNode[],
  options: LayoutOptions = {}
): GraphLayoutNode[] {
  if (nodes.length === 0) return [];

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const paddingX = options.paddingX ?? DEFAULT_PADDING_X;
  const paddingY = options.paddingY ?? DEFAULT_PADDING_Y;
  const minVerticalGap = options.minVerticalGap ?? DEFAULT_MIN_VERTICAL_GAP;

  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const inputOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const childrenMap = new Map<number, number[]>();
  const depthCache = new Map<number, number>();

  for (const node of nodes) {
    childrenMap.set(node.id, []);
  }

  for (const node of nodes) {
    for (const dependencyId of node.dependencies) {
      const children = childrenMap.get(dependencyId);
      if (children) children.push(node.id);
    }
  }

  const resolveDepth = (nodeId: number, path = new Set<number>()): number => {
    const cachedDepth = depthCache.get(nodeId);
    if (cachedDepth !== undefined) return cachedDepth;
    if (path.has(nodeId)) return 0;

    const node = nodeMap.get(nodeId);
    if (!node || node.dependencies.length === 0) {
      depthCache.set(nodeId, 0);
      return 0;
    }

    path.add(nodeId);

    const depth =
      1 +
      Math.max(
        ...node.dependencies.map(dependencyId => resolveDepth(dependencyId, new Set(path)))
      );

    depthCache.set(nodeId, depth);
    return depth;
  };

  for (const node of nodes) {
    resolveDepth(node.id);
  }

  const maxDepth = Math.max(...Array.from(depthCache.values()), 0);
  const layers = Array.from({ length: maxDepth + 1 }, () => [] as CWFrameNode[]);

  for (const node of nodes) {
    layers[depthCache.get(node.id) ?? 0].push(node);
  }

  const orderIndex = new Map<number, number>();

  const getAverageOrder = (relatedIds: number[]): number | null => {
    const relatedOrders = relatedIds
      .map(relatedId => orderIndex.get(relatedId))
      .filter((value): value is number => value !== undefined);

    if (relatedOrders.length === 0) return null;

    return relatedOrders.reduce((sum, value) => sum + value, 0) / relatedOrders.length;
  };

  const getStableNodeRank = (node: CWFrameNode): [number, number, number] => [
    node.tier ?? 0,
    inputOrder.get(node.id) ?? Number.MAX_SAFE_INTEGER,
    node.id
  ];

  const sortByTuple = (left: [number, number, number], right: [number, number, number]): number => {
    if (left[0] !== right[0]) return left[0] - right[0];
    if (left[1] !== right[1]) return left[1] - right[1];
    return left[2] - right[2];
  };

  const sortLayer = (layer: CWFrameNode[], getReferenceIds: (node: CWFrameNode) => number[]): CWFrameNode[] =>
    [...layer].sort((left, right) => {
      const leftBarycenter = getAverageOrder(getReferenceIds(left));
      const rightBarycenter = getAverageOrder(getReferenceIds(right));

      if (leftBarycenter !== null && rightBarycenter !== null && leftBarycenter !== rightBarycenter) {
        return leftBarycenter - rightBarycenter;
      }

      if (leftBarycenter !== null && rightBarycenter === null) return -1;
      if (leftBarycenter === null && rightBarycenter !== null) return 1;

      return sortByTuple(getStableNodeRank(left), getStableNodeRank(right));
    });

  layers[0] = [...layers[0]].sort((left, right) =>
    sortByTuple(getStableNodeRank(left), getStableNodeRank(right))
  );
  layers[0].forEach((node, index) => orderIndex.set(node.id, index));

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    layers[depth] = sortLayer(layers[depth], node => node.dependencies);
    layers[depth].forEach((node, index) => orderIndex.set(node.id, index));
  }

  for (let depth = maxDepth - 1; depth >= 0; depth -= 1) {
    layers[depth] = sortLayer(layers[depth], node => childrenMap.get(node.id) ?? []);
    layers[depth].forEach((node, index) => orderIndex.set(node.id, index));
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    layers[depth] = sortLayer(layers[depth], node => node.dependencies);
    layers[depth].forEach((node, index) => orderIndex.set(node.id, index));
  }

  const xStep = maxDepth > 0 ? (width - paddingX * 2) / maxDepth : 0;
  const positionedNodes = new Map<number, GraphLayoutNode>();

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const layer = layers[depth];
    const count = layer.length;
    const availableHeight = Math.max(height - paddingY * 2, minVerticalGap * Math.max(count - 1, 1));
    const yStep = count > 1 ? availableHeight / (count - 1) : 0;
    const topY = height / 2 - (yStep * (count - 1)) / 2;

    layer.forEach((node, index) => {
      positionedNodes.set(node.id, {
        ...node,
        depth,
        x: paddingX + xStep * depth,
        y: count === 1 ? height / 2 : topY + yStep * index
      });
    });
  }

  return nodes.map(node => positionedNodes.get(node.id)!).filter(Boolean);
}
