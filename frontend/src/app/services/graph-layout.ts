import type { Node } from '../types'

interface LayoutInput {
  nodes: Node[]
  width: number
  height: number
}

export interface StableNodePosition extends Node {
  x: number
  y: number
  radius: number
}

export interface TreeEdgeCurve {
  start: { x: number; y: number }
  control1: { x: number; y: number }
  control2: { x: number; y: number }
  end: { x: number; y: number }
}

interface SimulationNode extends StableNodePosition {
  preferredX: number
}

interface LayerGroup {
  centerX: number
  nodes: SimulationNode[]
  width: number
}

export function createStableNodePositions({ nodes, width, height }: LayoutInput): StableNodePosition[] {
  if (nodes.length === 0) {
    return []
  }

  const canvasWidth = Math.max(width, 200)
  const canvasHeight = Math.max(height, 200)
  const margin = 50
  const centerX = canvasWidth / 2
  const treeDepthById = createTreeDepthMap(nodes)
  const usesTreeRows = nodes.some((node) => node.parentId)
  const rowValues = usesTreeRows
    ? Array.from(new Set(nodes.map((node) => treeDepthById.get(node.id) ?? 0))).sort((a, b) => a - b)
    : Array.from(new Set(nodes.map((node) => node.stage ?? 1))).sort((a, b) => a - b)
  const rowToIndex = new Map<number, number>(
    rowValues.map((rowValue, index) => [rowValue, rowValues.length - index - 1]),
  )
  const availableHeight = Math.max(canvasHeight - margin * 2, 120)
  const idealRowGap =
    rowValues.length === 1 ? 0 : availableHeight / Math.max(rowValues.length - 1, 1)
  const rowGap = rowValues.length <= 2 ? Math.min(idealRowGap, 180) : Math.min(idealRowGap, 210)
  const usedHeight = rowGap * Math.max(rowValues.length - 1, 0)
  const topOffset = margin + (availableHeight - usedHeight) / 2

  const positionsById = new Map<string, StableNodePosition>()
  const layers = new Map<number, SimulationNode[]>()

  for (const rowValue of rowValues) {
    const layerNodes = nodes
      .filter((node) =>
        usesTreeRows ? (treeDepthById.get(node.id) ?? 0) === rowValue : (node.stage ?? 1) === rowValue,
      )
      .map((node) => ({
        ...node,
        x: centerX,
        y: topOffset + (rowToIndex.get(rowValue) ?? 0) * rowGap,
        radius: 12,
        preferredX: centerX,
      }))

    layers.set(rowValue, layerNodes)
  }

  for (const rowValue of rowValues) {
    const layerNodes = layers.get(rowValue) ?? []

    for (const node of layerNodes) {
      const dependencyPositions = (node.deps ?? [])
        .map((depId) => positionsById.get(depId))
        .filter((position): position is StableNodePosition => Boolean(position))

      node.preferredX =
        dependencyPositions.length > 0
          ? dependencyPositions.reduce((sum, position) => sum + position.x, 0) / dependencyPositions.length
          : centerX + stableJitter(node.id) * 140
    }

    const orderedLayer = [...layerNodes].sort((left, right) => {
      if (left.preferredX !== right.preferredX) {
        return left.preferredX - right.preferredX
      }

      return left.id.localeCompare(right.id)
    })

    const slottedXs = createLayerSlots({
      nodes: orderedLayer,
      width: canvasWidth,
      margin,
    })

    orderedLayer.forEach((node, index) => {
      const positionedNode: StableNodePosition = {
        ...node,
        x: slottedXs[index],
        y: node.y,
        radius: node.radius,
      }

      positionsById.set(node.id, positionedNode)
    })
  }

  return nodes.map((node) => positionsById.get(node.id) ?? createFallbackPosition(node, centerX, canvasHeight / 2))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createLayerSlots({
  nodes,
  width,
  margin,
}: {
  nodes: SimulationNode[]
  width: number
  margin: number
}) {
  const count = nodes.length

  if (count === 1) {
    return [clamp(nodes[0]?.preferredX ?? width / 2, margin, width - margin)]
  }

  const availableWidth = Math.max(width - margin * 2, 120)
  const spacing = Math.min(180, Math.max(110, availableWidth / count))
  const hasTreeGroups = nodes.some((node) => node.parentId)

  if (!hasTreeGroups) {
    const totalWidth = spacing * (count - 1)
    const startX = width / 2 - totalWidth / 2

    return Array.from({ length: count }, (_, index) =>
      clamp(startX + index * spacing, margin, width - margin),
    )
  }

  const groups = createLayerGroups(nodes, spacing)
  positionGroups(groups, spacing, width, margin)
  const slotsById = new Map<string, number>()

  for (const group of groups) {
    group.nodes.forEach((node, index) => {
      slotsById.set(
        node.id,
        clamp(group.centerX - group.width / 2 + index * spacing, margin, width - margin),
      )
    })
  }

  return nodes.map((node) => slotsById.get(node.id) ?? clamp(node.preferredX, margin, width - margin))
}

function createLayerGroups(nodes: SimulationNode[], spacing: number): LayerGroup[] {
  const groupedNodes = new Map<string, SimulationNode[]>()

  for (const node of nodes) {
    const groupKey = node.parentId ?? `solo:${node.id}`
    const group = groupedNodes.get(groupKey) ?? []
    group.push(node)
    groupedNodes.set(groupKey, group)
  }

  return Array.from(groupedNodes.values())
    .map((groupNodes) => {
      const orderedNodes = [...groupNodes].sort((left, right) => {
        if (left.preferredX !== right.preferredX) {
          return left.preferredX - right.preferredX
        }

        return left.id.localeCompare(right.id)
      })

      return {
        centerX: orderedNodes.reduce((sum, node) => sum + node.preferredX, 0) / orderedNodes.length,
        nodes: orderedNodes,
        width: spacing * Math.max(orderedNodes.length - 1, 0),
      }
    })
    .sort((left, right) => left.centerX - right.centerX)
}

function positionGroups(groups: LayerGroup[], spacing: number, width: number, margin: number) {
  if (groups.length === 0) {
    return
  }

  const minGap = Math.max(24, spacing * 0.35)
  let previousRight = margin - minGap

  for (const group of groups) {
    const desiredLeft = group.centerX - group.width / 2
    const minLeft = previousRight + minGap
    const left = Math.max(desiredLeft, minLeft)
    group.centerX = left + group.width / 2
    previousRight = left + group.width
  }

  const maxRight = width - margin
  const overflow = previousRight - maxRight

  if (overflow <= 0) {
    return
  }

  groups[groups.length - 1]!.centerX -= overflow

  for (let index = groups.length - 2; index >= 0; index -= 1) {
    const currentGroup = groups[index]!
    const nextGroup = groups[index + 1]!
    const currentRight = currentGroup.centerX + currentGroup.width / 2
    const nextLeft = nextGroup.centerX - nextGroup.width / 2
    const allowedRight = nextLeft - minGap

    if (currentRight > allowedRight) {
      currentGroup.centerX -= currentRight - allowedRight
    }
  }

  const firstGroup = groups[0]!
  const firstLeft = firstGroup.centerX - firstGroup.width / 2

  if (firstLeft < margin) {
    const correction = margin - firstLeft

    for (const group of groups) {
      group.centerX += correction
    }
  }
}

function stableJitter(input: string) {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }

  return hash / 0xffffffff - 0.5
}

function createTreeDepthMap(nodes: Node[]) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const depthById = new Map<string, number>()

  const resolveDepth = (node: Node): number => {
    const cachedDepth = depthById.get(node.id)
    if (cachedDepth !== undefined) {
      return cachedDepth
    }

    if (!node.parentId) {
      depthById.set(node.id, 0)
      return 0
    }

    const parentNode = nodesById.get(node.parentId)
    const depth = parentNode ? resolveDepth(parentNode) + 1 : 1
    depthById.set(node.id, depth)
    return depth
  }

  for (const node of nodes) {
    resolveDepth(node)
  }

  return depthById
}

function createFallbackPosition(node: Node, x: number, y: number): StableNodePosition {
  return {
    ...node,
    x,
    y,
    radius: 12,
  }
}

export function createTreeEdgeCurve({
  child,
  parent,
}: {
  child: Pick<StableNodePosition, 'x' | 'y' | 'radius'>
  parent: Pick<StableNodePosition, 'x' | 'y' | 'radius'>
}): TreeEdgeCurve {
  const start = {
    x: child.x,
    y: child.y + child.radius,
  }
  const end = {
    x: parent.x,
    y: parent.y - parent.radius,
  }
  const verticalDistance = Math.max(end.y - start.y, 40)
  const bend = Math.max(30, Math.min(verticalDistance * 0.45, 90))

  return {
    start,
    control1: {
      x: start.x,
      y: start.y + bend,
    },
    control2: {
      x: end.x,
      y: end.y - bend,
    },
    end,
  }
}
