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

interface SimulationNode extends StableNodePosition {
  fx: number
  fy: number
}

export function createStableNodePositions({ nodes, width, height }: LayoutInput): StableNodePosition[] {
  if (nodes.length === 0) {
    return []
  }

  const canvasWidth = Math.max(width, 200)
  const canvasHeight = Math.max(height, 200)
  const margin = 50
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.3

  const positionedNodes: SimulationNode[] = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2
    const stageOffset = ((node.stage ?? 1) - 3) * 18

    return {
      ...node,
      x: centerX + Math.cos(angle) * (baseRadius + stageOffset),
      y: centerY + Math.sin(angle) * (baseRadius + stageOffset),
      radius: 12,
      fx: 0,
      fy: 0,
    }
  })

  for (let iteration = 0; iteration < 220; iteration += 1) {
    for (const node of positionedNodes) {
      node.fx = 0
      node.fy = 0
    }

    for (let index = 0; index < positionedNodes.length; index += 1) {
      const nodeA = positionedNodes[index]

      for (let otherIndex = index + 1; otherIndex < positionedNodes.length; otherIndex += 1) {
        const nodeB = positionedNodes[otherIndex]
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        if (distance < 220) {
          const repulsion = (nodeA.radius + nodeB.radius + 56) / distance
          nodeA.fx -= (dx / distance) * repulsion * 1.8
          nodeA.fy -= (dy / distance) * repulsion * 1.8
          nodeB.fx += (dx / distance) * repulsion * 1.8
          nodeB.fy += (dy / distance) * repulsion * 1.8
        }
      }

      if (nodeA.deps) {
        for (const depId of nodeA.deps) {
          const depNode = positionedNodes.find((node) => node.id === depId)
          if (!depNode) {
            continue
          }

          const dx = depNode.x - nodeA.x
          const dy = depNode.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          const attraction = Math.max(distance - 120, 0) * 0.0035

          nodeA.fx += (dx / distance) * attraction
          nodeA.fy += (dy / distance) * attraction
        }
      }

      const centerPull = 0.003
      nodeA.fx += (centerX - nodeA.x) * centerPull
      nodeA.fy += (centerY - nodeA.y) * centerPull
    }

    for (const node of positionedNodes) {
      node.x = clamp(node.x + node.fx, margin, canvasWidth - margin)
      node.y = clamp(node.y + node.fy, margin, canvasHeight - margin)
    }
  }

  return positionedNodes.map(({ fx: _fx, fy: _fy, ...node }) => node)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
