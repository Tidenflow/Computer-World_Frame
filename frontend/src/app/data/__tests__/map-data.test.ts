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
    expect(allMaps.software.nodes.find((node) => node.id === 'operating-systems')?.parentId).toBe('software-root')
    expect(allMaps.software.nodes.find((node) => node.id === 'application-software')?.parentId).toBe('software-root')
    expect(allMaps.software.nodes.find((node) => node.id === 'development-software')?.parentId).toBe('application-software')
    expect(allMaps.software.nodes.find((node) => node.id === 'vscode')?.parentId).toBe('development-software')
    expect(allMaps.software.nodes.find((node) => node.id === 'office-software')?.parentId).toBe('application-software')
    expect(allMaps.programming.nodes.find((node) => node.id === 'web-frontend')?.parentId).toBe('programming-root')
    expect(allMaps.programming.nodes.find((node) => node.id === 'frontend-frameworks')?.parentId).toBe('web-frontend')
    expect(allMaps.programming.nodes.find((node) => node.id === 'react')?.parentId).toBe('frontend-frameworks')
    expect(allMaps.programming.nodes.find((node) => node.id === 'nextjs')?.parentId).toBe('react')
    expect(allMaps.programming.nodes.find((node) => node.id === 'backend-python-stack')?.parentId).toBe('web-backend')
    expect(allMaps.programming.nodes.find((node) => node.id === 'django')?.parentId).toBe('python')
    expect(allMaps.programming.nodes.find((node) => node.id === 'qt')?.parentId).toBe('desktop-cpp-stack')
    expect(allMaps.programming.nodes.find((node) => node.id === 'github')?.parentId).toBe('git')
    expect(allMaps.programming.nodes.find((node) => node.id === 'restful-api')?.parentId).toBe('architecture-design')
    expect(allMaps.programming.nodes.find((node) => node.id === 'typescript')?.deps).toEqual(['javascript'])
    expect(allMaps.ai.nodes.find((node) => node.id === 'llm')?.deps).toEqual(['transformer'])
    expect(allMaps.network.nodes.find((node) => node.id === 'https')?.deps).toEqual(['http'])
  })
})
