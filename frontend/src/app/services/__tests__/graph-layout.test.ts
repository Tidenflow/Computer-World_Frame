import { describe, expect, test } from 'vitest'

import type { Node } from '../../types'
import { createStableNodePositions, createTreeEdgeCurve } from '../graph-layout'

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

  test('keeps two-level tree layouts compact instead of stretching across the full canvas height', () => {
    const treeNodes: Node[] = [
      { id: 'software-root', title: '软件系统', domain: 'software', stage: 1 },
      { id: 'operating-systems', title: '操作系统', domain: 'software', stage: 2, parentId: 'software-root', deps: ['software-root'] },
      { id: 'application-software', title: '应用软件', domain: 'software', stage: 2, parentId: 'software-root', deps: ['software-root'] },
    ]

    const positions = createStableNodePositions({
      nodes: treeNodes,
      width: 1200,
      height: 900,
    })

    const root = positions.find((node) => node.id === 'software-root')
    const child = positions.find((node) => node.id === 'operating-systems')

    expect(root).toBeTruthy()
    expect(child).toBeTruthy()
    expect(Math.abs((root?.y ?? 0) - (child?.y ?? 0))).toBeLessThanOrEqual(220)
  })

  test('keeps sibling nodes centered around their parent instead of collapsing toward the global midpoint', () => {
    const treeNodes: Node[] = [
      { id: 'programming-root', title: '程序开发', domain: 'programming', stage: 1 },
      { id: 'architecture-design', title: '架构设计', domain: 'programming', stage: 2, parentId: 'programming-root', deps: ['programming-root'] },
      { id: 'web-frontend', title: 'Web 前端', domain: 'programming', stage: 2, parentId: 'programming-root', deps: ['programming-root'] },
      { id: 'design-patterns', title: '设计模式', domain: 'programming', stage: 3, parentId: 'architecture-design', deps: ['architecture-design'] },
      { id: 'frontend-backend-separation', title: '前后端分离', domain: 'programming', stage: 3, parentId: 'architecture-design', deps: ['architecture-design'] },
      { id: 'layered-architecture', title: '分层架构', domain: 'programming', stage: 3, parentId: 'architecture-design', deps: ['architecture-design'] },
      { id: 'restful-api', title: 'RESTful API', domain: 'programming', stage: 3, parentId: 'architecture-design', deps: ['architecture-design'] },
    ]

    const positions = createStableNodePositions({
      nodes: treeNodes,
      width: 1200,
      height: 900,
    })

    const parent = positions.find((node) => node.id === 'architecture-design')
    const siblings = positions.filter((node) => node.parentId === 'architecture-design')
    const siblingCenter =
      siblings.reduce((sum, node) => sum + node.x, 0) / Math.max(siblings.length, 1)

    expect(parent).toBeTruthy()
    expect(siblings).toHaveLength(4)
    expect(Math.abs(siblingCenter - (parent?.x ?? 0))).toBeLessThanOrEqual(35)
  })

  test('keeps direct children of the same parent on the same horizontal row even if their stages differ', () => {
    const treeNodes: Node[] = [
      { id: 'programming-root', title: '程序开发', domain: 'programming', stage: 1 },
      { id: 'architecture-design', title: '架构设计', domain: 'programming', stage: 2, parentId: 'programming-root', deps: ['programming-root'] },
      { id: 'design-patterns', title: '设计模式', domain: 'programming', stage: 3, parentId: 'architecture-design', deps: ['architecture-design'] },
      { id: 'restful-api', title: 'RESTful API', domain: 'programming', stage: 3, parentId: 'architecture-design', deps: ['architecture-design'] },
      { id: 'jwt', title: 'JWT', domain: 'programming', stage: 4, parentId: 'architecture-design', deps: ['architecture-design'] },
      { id: 'oauth2', title: 'OAuth 2.0', domain: 'programming', stage: 4, parentId: 'architecture-design', deps: ['architecture-design'] },
    ]

    const positions = createStableNodePositions({
      nodes: treeNodes,
      width: 1200,
      height: 900,
    })

    const directChildren = positions.filter((node) => node.parentId === 'architecture-design')
    const childRows = new Set(directChildren.map((node) => node.y))

    expect(directChildren).toHaveLength(4)
    expect(childRows.size).toBe(1)
  })

  test('uses vertical-first tree edge curves instead of wide sideways arcs', () => {
    const curve = createTreeEdgeCurve({
      child: { x: 140, y: 120, radius: 12 },
      parent: { x: 520, y: 300, radius: 12 },
    })

    expect(curve.start).toEqual({ x: 140, y: 132 })
    expect(curve.end).toEqual({ x: 520, y: 288 })
    expect(curve.control1.x).toBe(curve.start.x)
    expect(curve.control2.x).toBe(curve.end.x)
    expect(curve.control1.y).toBeGreaterThan(curve.start.y)
    expect(curve.control2.y).toBeLessThan(curve.end.y)
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
