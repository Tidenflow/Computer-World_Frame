import type { ProgressRepository } from '../contracts/progress'

const STORAGE_KEY = 'computer-world-unlocked-nodes'
const DEFAULT_UNLOCKED_NODE_IDS = ['fundamentals']

export function createLocalStorageProgressRepository(storage: Storage): ProgressRepository {
  return {
    loadUnlockedNodes() {
      try {
        const stored = storage.getItem(STORAGE_KEY)
        if (stored) {
          return new Set(JSON.parse(stored) as string[])
        }
      } catch {
        // Fall back to the default unlocked state when persisted data is invalid.
      }

      return new Set(DEFAULT_UNLOCKED_NODE_IDS)
    },

    saveUnlockedNodes(nodes) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(Array.from(nodes)))
      } catch {
        // Ignore storage write errors so the UI keeps working.
      }
    },
  }
}

export const localStorageProgressRepository =
  typeof window === 'undefined'
    ? null
    : createLocalStorageProgressRepository(window.localStorage)
