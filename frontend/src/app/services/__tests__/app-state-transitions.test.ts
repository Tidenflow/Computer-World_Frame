import { describe, expect, test } from 'vitest'

import type { Node, NodeCategory } from '../../types'
import {
  autoUnlockNodeOnSelect,
  closeSelectedNode,
  createAllCategorySelection,
  createEmptyCategorySelection,
  reconcileSelectedNodeWithCategories,
  toggleCategorySelection,
  toggleNodeLock,
  unlockNodes,
} from '../app-state-transitions'

describe('app state transitions', () => {
  test('creates a default selection that includes all categories', () => {
    expect(createAllCategorySelection()).toEqual(
      new Set(['fundamentals', 'language', 'technology', 'tooling', 'product', 'architecture', 'platform']),
    )
  })

  test('creates an empty category selection for clear filters', () => {
    expect(createEmptyCategorySelection()).toEqual(new Set())
  })

  test('toggles category selection without mutating the previous set', () => {
    const selectedCategories = new Set<NodeCategory>(['fundamentals'])

    const nextSelection = toggleCategorySelection(selectedCategories, 'product')

    expect(selectedCategories).toEqual(new Set(['fundamentals']))
    expect(nextSelection).toEqual(new Set(['fundamentals', 'product']))
    expect(toggleCategorySelection(nextSelection, 'fundamentals')).toEqual(new Set(['product']))
  })

  test('clears the selected node when its category is no longer visible', () => {
    const selectedNode = {
      id: 'react',
      title: 'React',
      domain: 'programming',
      category: 'tooling',
      parentId: 'frontend-frameworks',
    } as Node

    expect(reconcileSelectedNodeWithCategories(selectedNode, new Set<NodeCategory>(['tooling']))).toBe(
      selectedNode,
    )
    expect(
      reconcileSelectedNodeWithCategories(selectedNode, new Set<NodeCategory>(['language', 'technology'])),
    ).toBeNull()
  })

  test('keeps root nodes selected even when category filters are cleared', () => {
    const selectedRootNode = {
      id: 'programming-root',
      title: '程序开发',
      domain: 'programming',
    } as Node

    expect(reconcileSelectedNodeWithCategories(selectedRootNode, createEmptyCategorySelection())).toBe(
      selectedRootNode,
    )
  })

  test('auto unlocks a node when it is selected for the first time', () => {
    const unlockedNodes = new Set<string>(['fundamentals'])
    const node = {
      id: 'python',
      title: 'Python',
      domain: 'programming',
      parentId: 'backend-python-stack',
    } as Node

    const nextUnlockedNodes = autoUnlockNodeOnSelect(unlockedNodes, node)

    expect(nextUnlockedNodes).toEqual(new Set(['fundamentals', 'python']))
    expect(nextUnlockedNodes).not.toBe(unlockedNodes)
  })

  test('keeps the same set reference when the selected node is already unlocked', () => {
    const unlockedNodes = new Set<string>(['fundamentals'])
    const node = { id: 'fundamentals', title: 'Fundamentals', domain: 'theory' } as Node

    expect(autoUnlockNodeOnSelect(unlockedNodes, node)).toBe(unlockedNodes)
  })

  test('does not unlock root nodes when they are selected', () => {
    const unlockedNodes = new Set<string>(['fundamentals'])
    const node = { id: 'programming-root', title: '程序开发', domain: 'programming' } as Node

    expect(autoUnlockNodeOnSelect(unlockedNodes, node)).toBe(unlockedNodes)
  })

  test('toggles a node lock state', () => {
    expect(toggleNodeLock(new Set(['fundamentals']), 'python')).toEqual(
      new Set(['fundamentals', 'python']),
    )
    expect(toggleNodeLock(new Set(['fundamentals', 'python']), 'python')).toEqual(
      new Set(['fundamentals']),
    )
  })

  test('unlocks every matched non-root node from a search submission', () => {
    const unlockedNodes = new Set<string>(['fundamentals'])
    const matches = [
      { id: 'python', title: 'Python', domain: 'programming', parentId: 'backend-python-stack' },
      { id: 'javascript', title: 'JavaScript', domain: 'programming', parentId: 'frontend-languages' },
      { id: 'root', title: 'Root', domain: 'theory' },
    ] as Node[]

    expect(unlockNodes(unlockedNodes, matches)).toEqual(
      new Set(['fundamentals', 'python', 'javascript']),
    )
  })

  test('closes the current selection', () => {
    expect(closeSelectedNode()).toBeNull()
  })
})
