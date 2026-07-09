import { beforeEach, describe, expect, test } from 'vitest'

import { createLocalStorageResourcesRepository } from '../local-storage-resources.repository'

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

describe('local storage resources repository', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  test('returns an empty collection when storage is empty', () => {
    const repository = createLocalStorageResourcesRepository(storage)

    expect(repository.loadSavedResources()).toEqual({})
  })

  test('loads persisted saved resources from storage', () => {
    const resources = {
      html: [
        {
          id: 'resource-1',
          title: 'MDN HTML',
          url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTML',
          createdAt: '2026-07-09T00:00:00.000Z',
        },
      ],
    }
    storage.setItem('computer-world-saved-resources', JSON.stringify(resources))
    const repository = createLocalStorageResourcesRepository(storage)

    expect(repository.loadSavedResources()).toEqual(resources)
  })

  test('filters malformed resource entries', () => {
    storage.setItem(
      'computer-world-saved-resources',
      JSON.stringify({
        html: [
          {
            id: 'resource-1',
            title: 'MDN HTML',
            url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTML',
            createdAt: '2026-07-09T00:00:00.000Z',
          },
          {
            title: 'Missing id',
            url: 'https://example.com',
            createdAt: '2026-07-09T00:00:00.000Z',
          },
        ],
        css: 'bad data',
      }),
    )
    const repository = createLocalStorageResourcesRepository(storage)

    expect(repository.loadSavedResources()).toEqual({
      html: [
        {
          id: 'resource-1',
          title: 'MDN HTML',
          url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTML',
          createdAt: '2026-07-09T00:00:00.000Z',
        },
      ],
    })
  })

  test('falls back to an empty collection on malformed persisted data', () => {
    storage.setItem('computer-world-saved-resources', '{bad json')
    const repository = createLocalStorageResourcesRepository(storage)

    expect(repository.loadSavedResources()).toEqual({})
  })

  test('saves resources back to storage', () => {
    const repository = createLocalStorageResourcesRepository(storage)
    const resources = {
      javascript: [
        {
          id: 'resource-1',
          title: 'JavaScript Guide',
          url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide',
          createdAt: '2026-07-09T00:00:00.000Z',
        },
      ],
    }

    repository.saveSavedResources(resources)

    expect(storage.getItem('computer-world-saved-resources')).toBe(JSON.stringify(resources))
  })
})
