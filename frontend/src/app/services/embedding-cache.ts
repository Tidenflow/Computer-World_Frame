/**
 * IndexedDB-backed cache for pre-computed node embeddings.
 *
 * Uses a SHA-256 hash of all node (id + title + description + tags) data
 * as the cache key. When the hash changes (data updated), embeddings are
 * automatically recomputed.
 *
 * Raw IndexedDB API — no extra dependency.
 */

const DB_NAME = 'cwf-embeddings'
const DB_VERSION = 1
const STORE_NAME = 'cache'

interface CacheEntry {
  hash: string
  embeddings: number[][] // each entry is a 384-dim vector
  nodeIds: string[] // parallel array: embeddings[i] ↔ nodeIds[i]
  computedAt: string // ISO timestamp
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getCachedEmbeddings(
  dataHash: string,
): Promise<{ embeddings: number[][]; nodeIds: string[] } | null> {
  try {
    const db = await openDB()
    const entry = await new Promise<CacheEntry | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('embeddings')
      request.onsuccess = () => resolve(request.result as CacheEntry | undefined)
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })

    if (entry && entry.hash === dataHash) {
      return { embeddings: entry.embeddings, nodeIds: entry.nodeIds }
    }

    return null
  } catch {
    // IndexedDB unavailable (private browsing, etc.) — return null gracefully
    return null
  }
}

export async function saveEmbeddings(
  dataHash: string,
  embeddings: number[][],
  nodeIds: string[],
): Promise<void> {
  try {
    const db = await openDB()
    const entry: CacheEntry = {
      hash: dataHash,
      embeddings,
      nodeIds,
      computedAt: new Date().toISOString(),
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(entry, 'embeddings')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    // Silently fail — cache is optional, search still works without it
  }
}

export async function clearEmbeddingsCache(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete('embeddings')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    // Silently fail
  }
}

/**
 * Computes a stable hash of node data to detect when embeddings
 * need to be recomputed. Uses a simple FNV-1a 32-bit hash converted
 * to hex — stable across sessions, deterministic.
 */
export function computeNodeDataHash(
  maps: Record<string, { nodes: Array<{ id: string; title: string; description?: string; tags?: string[] }> }>,
): string {
  const parts: string[] = []

  for (const map of Object.values(maps)) {
    for (const node of map.nodes) {
      const text = [node.id, node.title, node.description ?? '', (node.tags ?? []).join(',')].join('|')
      parts.push(text)
    }
  }

  // Sort for deterministic ordering regardless of map iteration order
  parts.sort()

  const combined = parts.join('\n')
  return fnv1aHash(combined)
}

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5 // FNV-1a 32-bit offset basis

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) // FNV prime
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}
