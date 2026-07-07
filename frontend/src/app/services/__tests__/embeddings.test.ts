import { describe, expect, test } from 'vitest'

import { computeNodeDataHash } from '../embedding-cache'
import { cosineSimilarity, searchByEmbeddings } from '../semantic-search'

describe('embedding cache', () => {
  test('produces deterministic hash for the same data', () => {
    const maps = {
      a: { nodes: [{ id: '1', title: 'React', description: 'A framework', tags: ['frontend'] }] },
    }

    const hash1 = computeNodeDataHash(maps)
    const hash2 = computeNodeDataHash(maps)
    expect(hash1).toBe(hash2)
  })

  test('produces different hash when node title changes', () => {
    const maps1 = {
      a: { nodes: [{ id: '1', title: 'React', description: 'A framework' }] },
    }
    const maps2 = {
      a: { nodes: [{ id: '1', title: 'React.js', description: 'A framework' }] },
    }

    expect(computeNodeDataHash(maps1)).not.toBe(computeNodeDataHash(maps2))
  })

  test('produces different hash when node is added', () => {
    const maps1 = {
      a: { nodes: [{ id: '1', title: 'React' }] },
    }
    const maps2 = {
      a: { nodes: [{ id: '1', title: 'React' }, { id: '2', title: 'Vue' }] },
    }

    expect(computeNodeDataHash(maps1)).not.toBe(computeNodeDataHash(maps2))
  })

  test('hash is stable across map key ordering', () => {
    const hash1 = computeNodeDataHash({
      b: { nodes: [{ id: '1', title: 'React' }] },
      a: { nodes: [{ id: '2', title: 'Vue' }] },
    })
    const hash2 = computeNodeDataHash({
      a: { nodes: [{ id: '2', title: 'Vue' }] },
      b: { nodes: [{ id: '1', title: 'React' }] },
    })

    expect(hash1).toBe(hash2)
  })
})

describe('cosine similarity', () => {
  test('returns 1 for identical vectors (normalized)', () => {
    const vec = new Array(384).fill(0).map(() => 1 / Math.sqrt(384)) // ~normalized
    const result = cosineSimilarity(vec, vec)
    expect(result).toBeCloseTo(1, 2)
  })

  test('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0]
    const b = [0, 1, 0]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  test('returns negative for opposite vectors', () => {
    const a = [1, 0, 0]
    const b = [-1, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(-1)
  })
})

describe('searchByEmbeddings', () => {
  test('returns top-K results sorted by score', () => {
    // Simulate 3 node embeddings (3D for simplicity)
    const query = new Float32Array([1, 0, 0]) // close to node 0
    const nodeEmbeddings = [
      [1, 0, 0], // identical to query → score 1
      [0.7, 0.7, 0], // partly similar → score ~0.7
      [0, 1, 0], // orthogonal → score 0
    ]
    const nodeIds = ['react', 'vue', 'angular']

    const results = searchByEmbeddings(query, nodeEmbeddings, nodeIds, 2)

    expect(results).toHaveLength(2)
    expect(results[0]!.nodeId).toBe('react')
    expect(results[0]!.score).toBeCloseTo(1, 3)
    expect(results[1]!.nodeId).toBe('vue')
    expect(results[1]!.score).toBeCloseTo(0.7, 1)
  })

  test('handles empty embeddings', () => {
    const results = searchByEmbeddings(new Float32Array([1, 0, 0]), [], [], 10)
    expect(results).toEqual([])
  })

  test('returns all results when topK exceeds available embeddings', () => {
    const query = new Float32Array([1, 0])
    const nodeEmbeddings = [[1, 0]]
    const nodeIds = ['node1']

    const results = searchByEmbeddings(query, nodeEmbeddings, nodeIds, 50)
    expect(results).toHaveLength(1)
  })
})
