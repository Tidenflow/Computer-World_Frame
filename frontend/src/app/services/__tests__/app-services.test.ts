import { describe, expect, test } from 'vitest'

import { allMaps } from '../../data'
import { getNodeCategory, type Node } from '../../types'
import {
  buildBreadcrumbs,
  buildNodesWithUnlockedStatus,
  buildVisibleGraphNodes,
  computeMapUnlockedStats,
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

  test('enriches loaded map nodes with semantic categories', () => {
    expect(getNodeCategory(allMaps.programming.nodes.find((node) => node.id === 'javascript')!)).toBe(
      'language',
    )
    expect(getNodeCategory(allMaps.programming.nodes.find((node) => node.id === 'react')!)).toBe(
      'tooling',
    )
    expect(getNodeCategory(allMaps.network.nodes.find((node) => node.id === 'dns')!)).toBe(
      'platform',
    )
    expect(getNodeCategory(allMaps.ai.nodes.find((node) => node.id === 'rag')!)).toBe(
      'technology',
    )
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
      'frontend-styling',
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
      'frontend-styling',
      'react',
      'vue',
      'angular',
      'svelte',
      'astro',
      'remix',
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
      'backend-java-stack',
      'backend-data-storage',
      'backend-middleware',
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
      'database-software',
      'browser-software',
    ])
  })

  test('supports the same progressive tree expansion for the network map', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.network, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, null).map((node) => node.id)).toEqual([
      'network-root',
      'network-access',
      'core-protocols',
      'web-communication',
      'network-services',
      'network-security',
    ])

    expect(buildVisibleGraphNodes(nodes, 'web-communication').map((node) => node.id)).toEqual([
      'network-root',
      'network-access',
      'core-protocols',
      'web-communication',
      'network-services',
      'network-security',
      'http',
      'https',
      'websocket',
      'sse',
      'rpc',
      'mqtt',
    ])

    expect(buildVisibleGraphNodes(nodes, 'network-services').map((node) => node.id)).toEqual([
      'network-root',
      'network-access',
      'core-protocols',
      'web-communication',
      'network-services',
      'network-security',
      'dns',
      'cdn',
      'rest-api',
      'graphql',
      'proxy-service',
      'load-balancer',
      'service-mesh',
      'observability',
    ])
  })

  test('supports the same progressive tree expansion for the ai map', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.ai, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, null).map((node) => node.id)).toEqual([
      'ai-root',
      'ai-applications',
      'ai-foundations',
      'ai-domains',
      'ai-frameworks',
      'llm-applications',
    ])

    expect(buildVisibleGraphNodes(nodes, 'ai-foundations').map((node) => node.id)).toEqual([
      'ai-root',
      'ai-applications',
      'ai-foundations',
      'ai-domains',
      'ai-frameworks',
      'llm-applications',
      'machine-learning',
      'optimization-theory',
    ])

    expect(buildVisibleGraphNodes(nodes, 'llm-applications').map((node) => node.id)).toEqual([
      'ai-root',
      'ai-applications',
      'ai-foundations',
      'ai-domains',
      'ai-frameworks',
      'llm-applications',
      'langchain',
      'llm',
      'ai-agent',
    ])
  })

  test('supports the same progressive tree expansion for the root map', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.root, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, null).map((node) => node.id)).toEqual([
      'cw-root',
      'fundamentals',
      'hardware',
      'software',
      'programming-languages',
      'programming',
      'network',
      'ai',
    ])
  })

  test('supports the same progressive tree expansion for the fundamentals map', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.fundamentals, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, null).map((node) => node.id)).toEqual([
      'fundamentals-root',
      'computer-organization',
      'operating-systems-fundamentals',
      'data-structures',
      'algorithms',
    ])
  })

  test('supports the same progressive tree expansion for the hardware map', () => {
    const nodes = buildNodesWithUnlockedStatus(allMaps.hardware, new Set<string>())

    expect(buildVisibleGraphNodes(nodes, null).map((node) => node.id)).toEqual([
      'hardware-root',
      'cpu',
      'memory',
      'storage-devices',
      'input-output-devices',
    ])
  })

  test('computes unlocked stats across all maps', () => {
    const stats = computeUnlockedStats(allMaps, unlockedNodes)

    expect(stats.total).toBeGreaterThan(stats.unlocked)
    expect(stats.unlocked).toBe(2)
    expect(stats.total).toBe(
      Object.values(allMaps).reduce((sum, map) => sum + map.nodes.filter((node) => node.parentId).length, 0),
    )
  })

  test('computes current map progress without counting the root node', () => {
    const stats = computeMapUnlockedStats(allMaps.root, unlockedNodes)

    expect(stats).toEqual({
      total: 7,
      unlocked: 2,
    })
  })

  test('builds breadcrumbs for root and nested maps', () => {
    expect(buildBreadcrumbs('root', allMaps.root)).toHaveLength(1)
    expect(buildBreadcrumbs('software', allMaps.software)).toHaveLength(2)
  })
})
