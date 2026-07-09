import { useEffect, useState } from 'react'

import type { ResourceRepository, SavedResourceCollection } from '../contracts/resources'
import type { SavedResourceLink } from '../types'

type SavedResourceDraft = Pick<SavedResourceLink, 'title' | 'url'> &
  Partial<Pick<SavedResourceLink, 'note'>>

function createResourceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeDraft(draft: SavedResourceDraft): SavedResourceDraft | null {
  const title = draft.title.trim()
  const url = draft.url.trim()
  const note = draft.note?.trim()

  if (!title || !url) {
    return null
  }

  try {
    const parsedUrl = new URL(url)

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null
    }
  } catch {
    return null
  }

  return {
    title,
    url,
    ...(note ? { note } : {}),
  }
}

export function useSavedResourcesState(repository: ResourceRepository | null) {
  const [savedResources, setSavedResources] = useState<SavedResourceCollection>({})

  useEffect(() => {
    setSavedResources(repository?.loadSavedResources() ?? {})
  }, [repository])

  const persistSavedResources = (nextResources: SavedResourceCollection) => {
    setSavedResources(nextResources)
    repository?.saveSavedResources(nextResources)
  }

  const addSavedResource = (nodeId: string, draft: SavedResourceDraft) => {
    const normalizedDraft = normalizeDraft(draft)

    if (!normalizedDraft) {
      return false
    }

    const resource: SavedResourceLink = {
      id: createResourceId(),
      ...normalizedDraft,
      source: 'Other',
      createdAt: new Date().toISOString(),
    }

    persistSavedResources({
      ...savedResources,
      [nodeId]: [...(savedResources[nodeId] ?? []), resource],
    })

    return true
  }

  const removeSavedResource = (nodeId: string, resourceId: string) => {
    const nextNodeResources = (savedResources[nodeId] ?? []).filter(
      (resource) => resource.id !== resourceId,
    )
    const nextResources = { ...savedResources }

    if (nextNodeResources.length === 0) {
      delete nextResources[nodeId]
    } else {
      nextResources[nodeId] = nextNodeResources
    }

    persistSavedResources(nextResources)
  }

  return {
    savedResources,
    addSavedResource,
    removeSavedResource,
  }
}
