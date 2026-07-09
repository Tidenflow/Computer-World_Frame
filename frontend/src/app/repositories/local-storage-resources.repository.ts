import type { ResourceRepository, SavedResourceCollection } from '../contracts/resources'
import type { SavedResourceLink } from '../types'

const STORAGE_KEY = 'computer-world-saved-resources'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSavedResourceLink(value: unknown): value is SavedResourceLink {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.url === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.note === undefined || typeof value.note === 'string')
  )
}

function normalizeSavedResources(value: unknown): SavedResourceCollection {
  if (!isObject(value)) {
    return {}
  }

  return Object.entries(value).reduce<SavedResourceCollection>((collection, [nodeId, resources]) => {
    if (!Array.isArray(resources)) {
      return collection
    }

    const validResources = resources.filter(isSavedResourceLink)

    if (validResources.length > 0) {
      collection[nodeId] = validResources
    }

    return collection
  }, {})
}

export function createLocalStorageResourcesRepository(storage: Storage): ResourceRepository {
  return {
    loadSavedResources() {
      try {
        const stored = storage.getItem(STORAGE_KEY)

        if (stored) {
          return normalizeSavedResources(JSON.parse(stored))
        }
      } catch {
        // Fall back to an empty collection when persisted data is invalid.
      }

      return {}
    },

    saveSavedResources(resources) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(resources))
      } catch {
        // Ignore storage write errors so the UI keeps working.
      }
    },
  }
}

export const localStorageResourcesRepository =
  typeof window === 'undefined'
    ? null
    : createLocalStorageResourcesRepository(window.localStorage)
