import { describe, expect, test } from 'vitest'

import { aiMap, allMaps, defaultMap, networkMap, programmingMap, softwareMap } from '..'

describe('map data entrypoint', () => {
  test('exports the expected top-level map ids', () => {
    expect(Object.keys(allMaps)).toEqual(['root', 'software', 'programming', 'ai', 'network'])
    expect(defaultMap.id).toBe('root')
    expect(softwareMap.id).toBe('software')
    expect(programmingMap.id).toBe('programming')
    expect(aiMap.id).toBe('ai')
    expect(networkMap.id).toBe('network')
  })

  test('preserves representative cross-map and dependency references', () => {
    expect(allMaps.root.nodes.find((node) => node.id === 'software')?.targetMap).toBe('software')
    expect(allMaps.root.nodes.find((node) => node.id === 'ai')?.deps).toEqual(['programming', 'data'])
    expect(allMaps.ai.nodes.find((node) => node.id === 'llm')?.deps).toEqual(['transformer'])
    expect(allMaps.network.nodes.find((node) => node.id === 'https')?.deps).toEqual(['http'])
  })
})
