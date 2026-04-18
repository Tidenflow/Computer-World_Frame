import { describe, expect, test } from 'vitest'

import type { Node } from '../../types'
import { createStableNodePositions } from '../graph-layout'

describe('graph layout', () => {
  const nodes: Node[] = [
    { id: 'machine-learning', title: '机器学习', domain: 'ai', stage: 2 },
    { id: 'deep-learning', title: '深度学习', domain: 'ai', stage: 3, deps: ['machine-learning'] },
    { id: 'transformer', title: 'Transformer', domain: 'ai', stage: 4, deps: ['deep-learning'] },
    { id: 'llm', title: '大语言模型', domain: 'ai', stage: 5, deps: ['transformer'] },
  ]

  test('creates deterministic positions inside the canvas bounds', () => {
    const positions = createStableNodePositions({
      nodes,
      width: 900,
      height: 600,
    })

    expect(positions).toHaveLength(4)

    for (const position of positions) {
      expect(position.x).toBeGreaterThanOrEqual(50)
      expect(position.x).toBeLessThanOrEqual(850)
      expect(position.y).toBeGreaterThanOrEqual(50)
      expect(position.y).toBeLessThanOrEqual(550)
    }

    expect(positions.map(({ id, x, y }) => ({ id, x, y }))).toEqual(
      createStableNodePositions({
        nodes,
        width: 900,
        height: 600,
      }).map(({ id, x, y }) => ({ id, x, y })),
    )
  })

  test('keeps the same layout when only runtime unlocked state changes', () => {
    const unlockedNodes = nodes.map((node) => ({ ...node, unlocked: true }))

    expect(
      createStableNodePositions({
        nodes,
        width: 900,
        height: 600,
      }).map(({ id, x, y }) => ({ id, x, y })),
    ).toEqual(
      createStableNodePositions({
        nodes: unlockedNodes,
        width: 900,
        height: 600,
      }).map(({ id, x, y }) => ({ id, x, y })),
    )
  })
})
