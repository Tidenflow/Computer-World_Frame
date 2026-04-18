import { describe, expect, test } from 'vitest'

import { allMaps } from '../../data'
import type { Node } from '../../types'
import {
  buildBreadcrumbs,
  buildNodesWithUnlockedStatus,
  buildVisibleGraphNodes,
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
    const results = searchNodesAcrossMaps(allMaps, 'frontend', new Set<string>(['web-frontend']))

    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('web-frontend')
    expect(results[0]?.unlocked).toBe(true)
  })

  test('shows only the root level before a tree branch is expanded', () => {
    const visibleNodes = buildVisibleGraphNodes(
      buildNodesWithUnlockedStatus(allMaps.programming, new Set<string>()),
      null,
    )

    expect(visibleNodes.map((node) => node.id)).toEqual([
      'programming-root',
      'web-frontend',
      'web-backend',
      'desktop-development',
      'development-tools',
      'architecture-design',
    ])
  })

  test('shows only the selected branch and its next level in tree mode', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.programming, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, 'web-frontend').map((node) => node.id)).toEqual([
      'programming-root',
      'web-frontend',
      'frontend-languages',
      'frontend-frameworks',
      'web-backend',
      'desktop-development',
      'development-tools',
      'architecture-design',
    ])

    expect(buildVisibleGraphNodes(nodes, 'frontend-frameworks').map((node) => node.id)).toEqual([
      'programming-root',
      'web-frontend',
      'frontend-languages',
      'frontend-frameworks',
      'react',
      'vue',
      'web-backend',
      'desktop-development',
      'development-tools',
      'architecture-design',
    ])

    expect(buildVisibleGraphNodes(nodes, 'web-backend').map((node) => node.id)).toEqual([
      'programming-root',
      'web-frontend',
      'web-backend',
      'backend-python-stack',
      'backend-js-stack',
      'backend-data-storage',
      'desktop-development',
      'development-tools',
      'architecture-design',
    ])
  })

  test('supports the same progressive tree expansion for the software map', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.software, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, null).map((node) => node.id)).toEqual([
      'software-root',
      'operating-systems',
      'application-software',
    ])

    expect(buildVisibleGraphNodes(nodes, 'application-software').map((node) => node.id)).toEqual([
      'software-root',
      'operating-systems',
      'application-software',
      'office-software',
      'development-software',
      'industrial-software',
      'communication-software',
      'entertainment-software',
    ])
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
