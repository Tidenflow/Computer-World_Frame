import type { SavedResourceLink } from '../types'

export type SavedResourceCollection = Record<string, SavedResourceLink[]>

export interface ResourceRepository {
  loadSavedResources(): SavedResourceCollection
  saveSavedResources(resources: SavedResourceCollection): void
}
