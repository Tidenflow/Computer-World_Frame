import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalStorageProgressRepository } from '../local-storage-progress.repository'

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

describe('local storage progress repository', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  test('returns the default unlocked node when storage is empty', () => {
    const repository = createLocalStorageProgressRepository(storage)

    expect(repository.loadUnlockedNodes()).toEqual(new Set(['fundamentals']))
  })

  test('loads persisted unlocked nodes from storage', () => {
    storage.setItem('computer-world-unlocked-nodes', JSON.stringify(['fundamentals', 'python']))
    const repository = createLocalStorageProgressRepository(storage)

    expect(repository.loadUnlockedNodes()).toEqual(new Set(['fundamentals', 'python']))
  })

  test('falls back to the default unlocked node on malformed persisted data', () => {
    storage.setItem('computer-world-unlocked-nodes', '{bad json')
    const repository = createLocalStorageProgressRepository(storage)

    expect(repository.loadUnlockedNodes()).toEqual(new Set(['fundamentals']))
  })

  test('saves unlocked nodes back to storage', () => {
    const repository = createLocalStorageProgressRepository(storage)

    repository.saveUnlockedNodes(new Set(['fundamentals', 'react']))

    expect(storage.getItem('computer-world-unlocked-nodes')).toBe(JSON.stringify(['fundamentals', 'react']))
  })
})
