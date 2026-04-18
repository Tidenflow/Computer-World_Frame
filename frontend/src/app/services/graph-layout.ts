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

export function createStableNodePositions({ nodes, width, height }: LayoutInput): StableNodePosition[] {
  if (nodes.length === 0) {
    return []
  }

  const canvasWidth = Math.max(width, 200)
  const canvasHeight = Math.max(height, 200)
  const margin = 50
  const centerX = canvasWidth / 2
  const stageValues = Array.from(new Set(nodes.map((node) => node.stage ?? 1))).sort((a, b) => a - b)
  const stageToRow = new Map<number, number>(
    stageValues.map((stage, index) => [stage, stageValues.length - index - 1]),
  )
  const availableHeight = Math.max(canvasHeight - margin * 2, 120)
  const idealRowGap =
    stageValues.length === 1 ? 0 : availableHeight / Math.max(stageValues.length - 1, 1)
  const rowGap = stageValues.length <= 2 ? Math.min(idealRowGap, 180) : Math.min(idealRowGap, 210)
  const usedHeight = rowGap * Math.max(stageValues.length - 1, 0)
  const topOffset = margin + (availableHeight - usedHeight) / 2

  const positionsById = new Map<string, StableNodePosition>()
  const layers = new Map<number, SimulationNode[]>()

  for (const stage of stageValues) {
    const layerNodes = nodes
      .filter((node) => (node.stage ?? 1) === stage)
      .map((node) => ({
        ...node,
        x: centerX,
        y: topOffset + (stageToRow.get(stage) ?? 0) * rowGap,
        radius: 12,
        preferredX: centerX,
      }))

    layers.set(stage, layerNodes)
  }

  for (const stage of stageValues) {
    const layerNodes = layers.get(stage) ?? []

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
      count: orderedLayer.length,
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
  count,
  width,
  margin,
}: {
  count: number
  width: number
  margin: number
}) {
  if (count === 1) {
    return [width / 2]
  }

  const availableWidth = Math.max(width - margin * 2, 120)
  const spacing = Math.min(180, Math.max(110, availableWidth / count))
  const totalWidth = spacing * (count - 1)
  const startX = width / 2 - totalWidth / 2

  return Array.from({ length: count }, (_, index) => clamp(startX + index * spacing, margin, width - margin))
}

function stableJitter(input: string) {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }

  return hash / 0xffffffff - 0.5
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
