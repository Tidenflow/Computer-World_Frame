import { describe, expect, test } from 'vitest'

import { looksLikePinyin, toPinyinInitials, matchNodesByPinyin } from '../search-pipeline'
import type { GraphData, NodeDefinition } from '../../types'

describe('pinyin matching', () => {
  test('extracts pinyin initials from Chinese text', () => {
    expect(toPinyinInitials('网络')).toBe('wl')
    expect(toPinyinInitials('计算机世界')).toBe('jsjsj')
    expect(toPinyinInitials('人工智能')).toBe('rgzn')
  })

  test('returns empty string for English text', () => {
    expect(toPinyinInitials('React')).toBe('')
    expect(toPinyinInitials('hello world')).toBe('')
  })

  test('detects pingyin-looking queries', () => {
    expect(looksLikePinyin('wl')).toBe(true)
    expect(looksLikePinyin('jsjsj')).toBe(true)
    expect(looksLikePinyin('react')).toBe(true) // 5 lowercase chars, plausible pinyin
    expect(looksLikePinyin('w')).toBe(false) // too short
    expect(looksLikePinyin('wangluo123')).toBe(false) // has numbers
  })

  test('matches nodes by pinyin initials', () => {
    const maps: Record<string, GraphData<NodeDefinition>> = {
      root: {
        id: 'root',
        title: 'Root',
        nodes: [
          { id: 'n1', title: '网络通信', domain: 'network', tags: [] },
          { id: 'n2', title: '人工智能', domain: 'ai', tags: [] },
          { id: 'n3', title: '硬件设备', domain: 'hardware', tags: [] },
        ],
      },
    }

    const results = matchNodesByPinyin('wl', maps)
    expect(results).toHaveLength(1)
    expect(results[0]!.title).toBe('网络通信')
  })

  test('matches substring of pinyin initials', () => {
    const maps: Record<string, GraphData<NodeDefinition>> = {
      root: {
        id: 'root',
        title: 'Root',
        nodes: [
          { id: 'n1', title: '网络通信', domain: 'network', tags: [] },
        ],
      },
    }

    // 'wltx' contains 'wl'
    const results = matchNodesByPinyin('wl', maps)
    expect(results).toHaveLength(1)
    expect(results[0]!.title).toBe('网络通信')
  })

  test('handles non-pinyin queries gracefully', () => {
    const maps: Record<string, GraphData<NodeDefinition>> = {
      root: {
        id: 'root',
        title: 'Root',
        nodes: [
          { id: 'n1', title: '网络通信', domain: 'network', tags: [] },
        ],
      },
    }

    expect(matchNodesByPinyin('React', maps)).toEqual([])
    expect(matchNodesByPinyin('中文', maps)).toEqual([])
  })
})
