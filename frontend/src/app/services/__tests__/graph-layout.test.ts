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

  test('places more advanced stages above foundational stages in visible layers', () => {
    const layeredNodes: Node[] = [
      { id: 'scratch', title: 'Scratch', domain: 'programming', stage: 1 },
      { id: 'html', title: 'HTML', domain: 'programming', stage: 1 },
      { id: 'javascript', title: 'JavaScript', domain: 'programming', stage: 2, deps: ['html'] },
      { id: 'python', title: 'Python', domain: 'programming', stage: 2 },
      { id: 'react', title: 'React', domain: 'programming', stage: 3, deps: ['javascript'] },
      { id: 'django', title: 'Django', domain: 'programming', stage: 3, deps: ['python'] },
      { id: 'nextjs', title: 'Next.js', domain: 'programming', stage: 4, deps: ['react'] },
    ]

    const positions = createStableNodePositions({
      nodes: layeredNodes,
      width: 1000,
      height: 700,
    })

    const stageOneY = averageYForStage(positions, 1)
    const stageTwoY = averageYForStage(positions, 2)
    const stageThreeY = averageYForStage(positions, 3)
    const stageFourY = averageYForStage(positions, 4)

    expect(stageFourY).toBeLessThan(stageThreeY)
    expect(stageThreeY).toBeLessThan(stageTwoY)
    expect(stageTwoY).toBeLessThan(stageOneY)
  })
})

function averageYForStage(
  positions: Array<{
    stage?: number
    y: number
  }>,
  stage: number,
) {
  const stagePositions = positions.filter((position) => position.stage === stage)
  return stagePositions.reduce((sum, position) => sum + position.y, 0) / stagePositions.length
}
