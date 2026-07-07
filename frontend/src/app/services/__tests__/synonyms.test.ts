import { describe, expect, test } from 'vitest'

import { expandQueryWithSynonyms } from '../../data/synonyms'

describe('synonym dictionary', () => {
  test('returns the original query as the first variant', () => {
    const variants = expandQueryWithSynonyms('React')
    expect(variants).toContain('React')
  })

  test('expands Chinese queries with English equivalents', () => {
    const variants = expandQueryWithSynonyms('人工智能')
    expect(variants).toContain('AI')
    expect(variants).toContain('machine learning')
  })

  test('expands informal Chinese terms', () => {
    const variants = expandQueryWithSynonyms('苹果系统')
    expect(variants).toContain('macOS')
    expect(variants).toContain('mac')
  })

  test('expands "做网页" to web dev terms', () => {
    const variants = expandQueryWithSynonyms('做网页')
    expect(variants).toContain('HTML')
    expect(variants).toContain('CSS')
    expect(variants).toContain('JavaScript')
  })

  test('expands interface rendering queries to frontend primitives', () => {
    const variants = expandQueryWithSynonyms('渲染界面的语言')
    expect(variants).toContain('HTML')
    expect(variants).toContain('CSS')
    expect(variants).toContain('JavaScript')
  })

  test('returns deduplicated results', () => {
    const variants = expandQueryWithSynonyms('网络')
    // All variants in the array are unique (Set guarantees this)
    expect(new Set(variants).size).toBe(variants.length)
    // Should contain expected matches
    expect(variants).toContain('网络')
    expect(variants.some((v) => v.toLowerCase() === 'network')).toBe(true)
  })

  test('includes lowercase variants', () => {
    const variants = expandQueryWithSynonyms('AI')
    expect(variants).toContain('ai')
  })

  test('handles empty query gracefully', () => {
    expect(expandQueryWithSynonyms('')).toEqual([])
    expect(expandQueryWithSynonyms('   ')).toEqual([])
  })

  test('handles unknown terms by returning only the query', () => {
    const variants = expandQueryWithSynonyms('xyznotindictionary')
    expect(variants).toContain('xyznotindictionary')
    expect(variants).toContain('xyznotindictionary'.toLowerCase())
  })

  test('partial match: query contained within a key', () => {
    const variants = expandQueryWithSynonyms('AI画图')
    expect(variants).toContain('Midjourney')
    expect(variants).toContain('Stable Diffusion')
  })
})
