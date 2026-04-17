import { describe, expect, test } from 'vitest'

import { allMaps } from '../../data'
import type { Node } from '../../types'
import {
  buildBreadcrumbs,
  buildNodesWithUnlockedStatus,
  computeUnlockedStats,
  filterNodesByQuery,
  searchNodesAcrossMaps,
} from '../app-services'

describe('app services', () => {
  const currentMap = allMaps.root
  const unlockedNodes = new Set<string>(['fundamentals', 'hardware'])

  test('builds nodes with unlocked status for the current map', () => {
    const nodes = buildNodesWithUnlockedStatus(currentMap, unlockedNodes)

    expect(nodes.find((node) => node.id === 'fundamentals')?.unlocked).toBe(true)
    expect(nodes.find((node) => node.id === 'software')?.unlocked).toBe(false)
  })

  test('filters nodes by title, tags, or aliases using a case-insensitive query', () => {
    const nodes = [
      { id: 'a', title: 'Python', domain: 'programming', tags: ['language'] },
      { id: 'b', title: 'CSS', domain: 'programming', aliases: ['styles'] },
    ] as Node[]

    expect(filterNodesByQuery(nodes, 'python')).toHaveLength(1)
    expect(filterNodesByQuery(nodes, 'LANGUAGE')).toHaveLength(1)
    expect(filterNodesByQuery(nodes, 'styles')).toHaveLength(1)
  })

  test('searches across maps and preserves unlocked status on results', () => {
    const results = searchNodesAcrossMaps(allMaps, 'python', new Set<string>(['python']))

    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('python')
    expect(results[0]?.unlocked).toBe(true)
  })

  test('computes unlocked stats across all maps', () => {
    const stats = computeUnlockedStats(allMaps, unlockedNodes)

    expect(stats.total).toBeGreaterThan(stats.unlocked)
    expect(stats.unlocked).toBe(2)
  })

  test('builds breadcrumbs for root and nested maps', () => {
    expect(buildBreadcrumbs('root', allMaps.root)).toHaveLength(1)
    expect(buildBreadcrumbs('software', allMaps.software)).toHaveLength(2)
  })
})
