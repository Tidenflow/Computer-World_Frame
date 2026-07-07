/**
 * Semantic search powered by Transformers.js.
 *
 * Runs entirely in the browser — no server required.
 * Model is loaded lazily on first use (~32-120 MB download, cached by browser).
 * Node embeddings are computed once and cached in IndexedDB.
 */

import type { NodeDefinition } from '../types'
import { getCachedEmbeddings, saveEmbeddings, computeNodeDataHash } from './embedding-cache'

// ── Model config ──

/** Model for text embedding. Must support Chinese and English. */
const MODEL_NAME = 'Xenova/multilingual-e5-small'

/** Local model path — served from public/models/ at build time. */
const LOCAL_MODEL_URL = '/models/'

/** Dimension of the embedding vectors produced by this model. */
const EMBEDDING_DIM = 384

/** Minimum number of rule-based results before semantic search kicks in. */
export const SEMANTIC_THRESHOLD = 3

/** Maximum number of semantic results to return. */
const SEMANTIC_TOP_K = 10

// ── Pipeline singleton ──

let pipelinePromise: Promise<any> | null = null
let pipelineInstance: any = null
let cachePurgePromise: Promise<void> | null = null

function purgeTransformersBrowserCache(): Promise<void> {
  if (cachePurgePromise) {
    return cachePurgePromise
  }

  if (typeof caches === 'undefined') {
    cachePurgePromise = Promise.resolve()
    return cachePurgePromise
  }

  cachePurgePromise = caches
    .delete('transformers-cache')
    .then(() => undefined)
    .catch((error) => {
      console.warn('[CWF] Failed to clear Transformers.js browser cache:', error)
    })

  return cachePurgePromise
}

function getPipeline(): Promise<any> {
  if (pipelineInstance) {
    return Promise.resolve(pipelineInstance)
  }

  if (!pipelinePromise) {
    pipelinePromise = import('@xenova/transformers')
      .then(async ({ pipeline, env }) => {
        // Use locally bundled model + WASM — no external CDN dependencies
        env.allowLocalModels = true
        env.allowRemoteModels = false
        env.localModelPath = LOCAL_MODEL_URL
        // Avoid reusing stale Cache API entries created while model files were Git LFS pointers.
        env.useBrowserCache = false
        await purgeTransformersBrowserCache()
        // Point ONNX runtime to local WASM files (avoid jsDelivr CDN)
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.wasmPaths = '/wasm/'
        }
        return pipeline('feature-extraction', MODEL_NAME)
      })
      .then((pipe) => {
        pipelineInstance = pipe
        return pipe
      })
      .catch((error) => {
        console.warn('Failed to load Transformers.js model:', error)
        pipelinePromise = null // Allow retry on next call
        throw error
      })
  }

  return pipelinePromise
}

// ── Text construction ──

/**
 * Builds the text to embed for a single node.
 * Format: "title. description tags"
 */
function buildNodeText(node: NodeDefinition): string {
  const parts = [node.title]

  if (node.description) {
    parts.push('. ')
    parts.push(node.description)
  }

  if (node.tags && node.tags.length > 0) {
    parts.push(' ')
    parts.push(node.tags.join(' '))
  }

  return parts.join('')
}

// ── Embedding computation ──

/**
 * Computes an embedding vector for a single query string.
 * Returns a Float32Array of EMBEDDING_DIM elements.
 */
export async function computeQueryEmbedding(query: string): Promise<Float32Array> {
  const pipe = await getPipeline()
  const output = await pipe(query, { pooling: 'mean', normalize: true })
  // output is a Tensor-like object with `.data` as Float32Array
  return new Float32Array(output.data)
}

/**
 * Computes embedding vectors for all nodes across all maps.
 * Returns parallel arrays: embeddings[i] ↔ nodeIds[i].
 */
export async function computeNodeEmbeddings(
  maps: Record<string, { nodes: NodeDefinition[] }>,
): Promise<{ embeddings: number[][]; nodeIds: string[] }> {
  const pipe = await getPipeline()
  const allNodes: Array<{ id: string; text: string }> = []

  for (const map of Object.values(maps)) {
    for (const node of map.nodes) {
      allNodes.push({ id: node.id, text: buildNodeText(node) })
    }
  }

  const embeddings: number[][] = []
  const nodeIds: string[] = []

  // Process in batches to avoid memory pressure
  const BATCH_SIZE = 32
  for (let i = 0; i < allNodes.length; i += BATCH_SIZE) {
    const batch = allNodes.slice(i, i + BATCH_SIZE)
    const texts = batch.map((n) => n.text)

    const output = await pipe(texts, { pooling: 'mean', normalize: true })

    // For batch output, data is a flat Float32Array of shape [batchSize, dim]
    const flat = new Float32Array(output.data)
    for (let j = 0; j < batch.length; j += 1) {
      const start = j * EMBEDDING_DIM
      const vec = Array.from(flat.slice(start, start + EMBEDDING_DIM))
      embeddings.push(vec)
      nodeIds.push(batch[j]!.id)
    }
  }

  return { embeddings, nodeIds }
}

// ── Similarity ──

/**
 * Cosine similarity between two vectors (assumes they are L2-normalized).
 * With normalized vectors, this is equivalent to dot product.
 */
export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let dotProduct = 0

  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dotProduct += a[i]! * b[i]!
  }

  return dotProduct // Vectors are already normalized by the model
}

// ── Search ──

export interface SemanitcSearchResult {
  nodeId: string
  score: number
}

/**
 * Performs semantic search: embeds the query and finds the top-K
 * most similar node embeddings via cosine similarity.
 */
export function searchByEmbeddings(
  queryEmbedding: Float32Array,
  nodeEmbeddings: number[][],
  nodeIds: string[],
  topK: number = SEMANTIC_TOP_K,
): SemanitcSearchResult[] {
  if (nodeEmbeddings.length === 0) return []

  const scored: SemanitcSearchResult[] = []

  for (let i = 0; i < nodeEmbeddings.length; i += 1) {
    const score = cosineSimilarity(queryEmbedding, nodeEmbeddings[i]!)
    scored.push({ nodeId: nodeIds[i]!, score })
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK)
}

// ── Public API ──

/**
 * Ensures node embeddings are cached and returns them.
 *
 * Priority:
 * 1. Precomputed embeddings bundled at build time (embeddings.json) — instant, 0ms
 * 2. IndexedDB cache from a previous runtime computation
 * 3. Runtime computation via Transformers.js (~15s first time)
 */
export async function getOrComputeNodeEmbeddings(
  maps: Record<string, { nodes: NodeDefinition[] }>,
): Promise<{ embeddings: number[][]; nodeIds: string[] }> {
  const dataHash = computeNodeDataHash(maps)

  // 1. Try precomputed embeddings (bundled at build time, served from public/)
  try {
    const response = await fetch('/embeddings.json')
    if (response.ok) {
      const precomputed = await response.json() as {
        hash: string
        embeddings: number[][]
        nodeIds: string[]
      }
      if (precomputed.hash === dataHash && precomputed.embeddings.length > 0) {
        return { embeddings: precomputed.embeddings, nodeIds: precomputed.nodeIds }
      }
    }
  } catch {
    // embeddings.json not found — fall through to cache/runtime
  }

  // 2. Try IndexedDB cache
  const cached = await getCachedEmbeddings(dataHash)
  if (cached) {
    return cached
  }

  // Compute fresh
  const { embeddings, nodeIds } = await computeNodeEmbeddings(maps)

  // Save to cache (fire-and-forget — don't block on cache write)
  saveEmbeddings(dataHash, embeddings, nodeIds)

  return { embeddings, nodeIds }
}

/**
 * Full semantic search pipeline:
 * 1. Get/load cached node embeddings
 * 2. Embed the query
 * 3. Find top-K matching node IDs
 */
export async function semanticSearch(
  query: string,
  maps: Record<string, { nodes: NodeDefinition[] }>,
  topK: number = SEMANTIC_TOP_K,
): Promise<SemanitcSearchResult[]> {
  const [{ embeddings, nodeIds }, queryEmbedding] = await Promise.all([
    getOrComputeNodeEmbeddings(maps),
    computeQueryEmbedding(query),
  ])

  return searchByEmbeddings(queryEmbedding, embeddings, nodeIds, topK)
}

// ── Status ──

/**
 * Checks whether the embedding model is ready to use.
 * Returns false if the model hasn't been loaded yet or failed to load.
 */
export async function isModelReady(): Promise<boolean> {
  try {
    await getPipeline()
    return true
  } catch {
    return false
  }
}

/**
 * Pre-warms the entire semantic search pipeline:
 * 1. If precomputed embeddings are bundled → instant (no-op)
 * 2. Otherwise: downloads model + computes embeddings → caches in IndexedDB
 *
 * Safe to call multiple times. Call on app startup.
 *
 * @param maps — all map data, used to precompute node embeddings
 */
export function preloadModel(
  maps?: Record<string, { nodes: NodeDefinition[] }>,
): Promise<void> {
  if (!maps) return Promise.resolve()

  const dataHash = computeNodeDataHash(maps)

  return fetch('/embeddings.json')
    .then((response) => {
      if (!response.ok) throw new Error(`embeddings.json: HTTP ${response.status}`)
      return response.json()
    })
    .then((precomputed: any) => {
      console.log('[CWF] embeddings.json loaded, hash:', precomputed.hash, 'expected:', dataHash)
      if (precomputed.hash === dataHash && precomputed.embeddings.length > 0) {
        console.log('[CWF] Precomputed embeddings match — loading model pipeline...')
        return getPipeline().then(() => {
          console.log('[CWF] Model pipeline loaded — semantic search ready.')
        })
      }
      console.log('[CWF] Embeddings mismatch, computing at runtime...')
      return getPipeline().then(() => getOrComputeNodeEmbeddings(maps))
    })
    .catch((error) => {
      console.warn('[CWF] Precomputed path failed:', error.message, '— trying runtime...')
      return getPipeline()
        .then(() => {
          if (maps) return getOrComputeNodeEmbeddings(maps)
        })
        .catch((err) => {
          console.warn('[CWF] Runtime model loading also failed:', err.message)
          // Always resolve — semantic search is optional, app works without it
        })
    })
}
