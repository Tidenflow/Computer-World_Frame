import { describe, expect, test } from 'vitest'

import type { Domain, Node } from '../../types'
import {
  autoUnlockNodeOnSelect,
  closeSelectedNode,
  toggleDomainSelection,
  toggleNodeLock,
} from '../app-state-transitions'

describe('app state transitions', () => {
  test('toggles domain selection without mutating the previous set', () => {
    const selectedDomains = new Set<Domain>(['hardware'])

    const nextSelection = toggleDomainSelection(selectedDomains, 'software')

    expect(selectedDomains).toEqual(new Set(['hardware']))
    expect(nextSelection).toEqual(new Set(['hardware', 'software']))
    expect(toggleDomainSelection(nextSelection, 'hardware')).toEqual(new Set(['software']))
  })

  test('auto unlocks a node when it is selected for the first time', () => {
    const unlockedNodes = new Set<string>(['fundamentals'])
    const node = { id: 'python', title: 'Python', domain: 'programming' } as Node

    const nextUnlockedNodes = autoUnlockNodeOnSelect(unlockedNodes, node)

    expect(nextUnlockedNodes).toEqual(new Set(['fundamentals', 'python']))
    expect(nextUnlockedNodes).not.toBe(unlockedNodes)
  })

  test('keeps the same set reference when the selected node is already unlocked', () => {
    const unlockedNodes = new Set<string>(['fundamentals'])
    const node = { id: 'fundamentals', title: 'Fundamentals', domain: 'theory' } as Node

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

  test('closes the current selection', () => {
    expect(closeSelectedNode()).toBeNull()
  })
})
