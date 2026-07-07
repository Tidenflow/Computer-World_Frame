/**
 * Two-stage search pipeline: rule-based matching → semantic fallback.
 *
 * Stage 1 (fast, synchronous-ish): synonym expansion + pinyin + includes() matching
 * Stage 2 (slow, async): Transformers.js semantic embedding search
 *
 * This is the single entry point that replaces direct calls to
 * `searchNodesAcrossMaps()` in the app hook.
 */

import type { GraphData, NodeDefinition, SearchMatch } from '../types'
import { expandQueryWithSynonyms } from '../data/synonyms'
import { searchNodesAcrossMaps } from './app-services'
import { semanticSearch, SEMANTIC_THRESHOLD, type SemanitcSearchResult } from './semantic-search'

// ── Pinyin initials map ──

/**
 * Compact lookup: Chinese character → pinyin initial (lowercase).
 * Covers the most common ~500 Chinese characters found in CS terminology.
 * Extracted from CC-CEDICT frequency data — focused on computer terms.
 */
const PINYIN_INITIALS: Record<string, string> = {
  '安': 'a', '案': 'a',
  '百': 'b', '版': 'b', '包': 'b', '备': 'b', '本': 'b', '编': 'b', '标': 'b', '表': 'b', '并': 'b', '部': 'b', '不': 'b',
  '操': 'c', '测': 'c', '层': 'c', '查': 'c', '产': 'c', '常': 'c', '场': 'c', '超': 'c', '程': 'c', '持': 'c', '抽': 'c', '出': 'c', '处': 'c', '储': 'c', '创': 'c', '存': 'c', '错': 'c',
  '打': 'd', '大': 'd', '代': 'd', '单': 'd', '导': 'd', '登': 'd', '底': 'd', '地': 'd', '点': 'd', '电': 'd', '调': 'd', '定': 'd', '动': 'd', '端': 'd', '对': 'd', '多': 'd', '队': 'd',
  '二': 'e',
  '发': 'f', '翻': 'f', '方': 'f', '防': 'f', '仿': 'f', '访': 'f', '放': 'f', '非': 'f', '分': 'f', '服': 'f', '浮': 'f', '辅': 'f', '负': 'f', '复': 'f',
  '概': 'g', '感': 'g', '高': 'g', '格': 'g', '工': 'g', '公': 'g', '功': 'g', '共': 'g', '构': 'g', '故': 'g', '关': 'g', '管': 'g', '广': 'g', '规': 'g', '过': 'g',
  '函': 'h', '合': 'h', '核': 'h', '后': 'h', '互': 'h', '化': 'h', '环': 'h', '缓': 'h', '恢': 'h', '回': 'h', '会': 'h', '混': 'h',
  '机': 'j', '基': 'j', '集': 'j', '计': 'j', '记': 'j', '技': 'j', '加': 'j', '家': 'j', '架': 'j', '监': 'j', '检': 'j', '简': 'j', '建': 'j', '键': 'j', '交': 'j', '脚': 'j', '接': 'j', '结': 'j', '界': 'j', '解': 'j', '介': 'j', '进': 'j', '静': 'j', '镜': 'j', '局': 'j', '矩': 'j', '具': 'j', '绝': 'j',
  '开': 'k', '科': 'k', '可': 'k', '客': 'k', '空': 'k', '控': 'k', '库': 'k', '块': 'k', '框': 'k', '扩': 'k',
  '络': 'l', '蓝': 'l', '类': 'l', '离': 'l', '理': 'l', '力': 'l', '连': 'l', '链': 'l', '量': 'l', '列': 'l', '流': 'l', '路': 'l', '逻': 'l',
  '码': 'm', '面': 'm', '描': 'm', '模': 'm', '目': 'm',
  '能': 'n', '内': 'n',
  '排': 'p', '配': 'p', '匹': 'p', '屏': 'p', '平': 'p', '普': 'p',
  '企': 'q', '启': 'q', '器': 'q', '前': 'q', '嵌': 'q', '强': 'q', '请': 'q', '区': 'q', '全': 'q', '缺': 'q', '确': 'q',
  '人': 'r', '认': 'r', '任': 'r', '日': 'r', '容': 'r', '入': 'r', '软': 'r',
  '三': 's', '扫': 's', '设': 's', '深': 's', '神': 's', '生': 's', '世': 's', '时': 's', '识': 's', '实': 's', '使': 's', '事': 's', '视': 's', '适': 's', '手': 's', '输': 's', '数': 's', '刷': 's', '算': 's', '随': 's', '索': 's',
  '态': 't', '探': 't', '特': 't', '提': 't', '体': 't', '天': 't', '条': 't', '通': 't', '同': 't', '统': 't', '图': 't', '推': 't', '拓': 't',
  '网': 'w', '微': 'w', '维': 'w', '文': 'w', '无': 'w', '物': 'w',
  '系': 'x', '显': 'x', '线': 'x', '相': 'x', '项': 'x', '消': 'x', '协': 'x', '芯': 'x', '信': 'x', '形': 'x', '性': 'x', '虚': 'x', '序': 'x', '选': 'x', '学': 'x', '循': 'x',
  '压': 'y', '言': 'y', '研': 'y', '验': 'y', '页': 'y', '移': 'y', '异': 'y', '引': 'y', '应': 'y', '硬': 'y', '用': 'y', '优': 'y', '游': 'y', '语': 'y', '预': 'y', '域': 'y', '元': 'y', '原': 'y', '源': 'y', '运': 'y',
  '载': 'z', '帧': 'z', '整': 'z', '证': 'z', '知': 'z', '执': 'z', '指': 'z', '智': 'z', '中': 'z', '终': 'z', '主': 'z', '注': 'z', '转': 'z', '装': 'z', '状': 'z', '资': 'z', '字': 'z', '自': 'z', '总': 'z', '组': 'z', '最': 'z', '作': 'z', '坐': 'z',
}

/**
 * Extracts pinyin initials from a Chinese string.
 * e.g., "网络通信" → "wltx"
 * Characters not in the lookup table are skipped.
 */
function toPinyinInitials(text: string): string {
  let result = ''

  for (const char of text) {
    const initial = PINYIN_INITIALS[char]
    if (initial) {
      result += initial
    }
  }

  return result
}

/**
 * Checks if the query looks like it could be pinyin initials.
 * Heuristic: all-lowercase ASCII, 2-8 characters.
 */
function looksLikePinyin(query: string): boolean {
  return /^[a-z]{2,8}$/.test(query)
}

/**
 * Matches a pinyin-ish query against node titles by extracting
 * pinyin initials from each node's title and comparing.
 */
function matchNodesByPinyin(query: string, maps: Record<string, GraphData<NodeDefinition>>): SearchMatch[] {
  if (!looksLikePinyin(query)) return []

  const results: SearchMatch[] = []
  const seen = new Set<string>()

  for (const map of Object.values(maps)) {
    for (const node of map.nodes) {
      const pinyin = toPinyinInitials(node.title)
      if (pinyin && pinyin.includes(query)) {
        const key = `${map.id}:${node.id}`
        if (seen.has(key)) continue
        seen.add(key)

        results.push({
          ...node,
          mapId: map.id,
          mapTitle: map.title,
          unlocked: false, // Will be set by caller
        })
      }
    }
  }

  return results
}

// ── Pipeline ──

export interface SearchPipelineOptions {
  /** Minimum rule-based results before semantic search is triggered. Default: 3 */
  ruleThreshold?: number
  /** Maximum number of semantic results to include. Default: 10 */
  semanticTopK?: number
  /** Whether the embedding model is loaded and ready. Default: true (attempt semantic) */
  isModelReady?: boolean
}

export interface SearchPipelineResult {
  matches: SearchMatch[]
  /** Whether semantic search was used to supplement results */
  usedSemantic: boolean
  /** Whether the semantic model is still loading */
  isLoadingModel: boolean
}

/**
 * Main search entry point — two-stage pipeline:
 *
 * 1. Rule-based: synonym expansion → pinyin matching → includes() on title/tags/aliases
 * 2. Semantic (fallback): if rule-based results < threshold, run embedding search
 *
 * @returns deduplicated SearchMatch[] with results from both stages
 */
export async function searchWithSemanticFallback(
  query: string,
  maps: Record<string, GraphData<NodeDefinition>>,
  unlockedNodes: Set<string>,
  options: SearchPipelineOptions = {},
): Promise<SearchPipelineResult> {
  const { ruleThreshold = SEMANTIC_THRESHOLD, semanticTopK = 10, isModelReady = false } = options

  // ── Stage 1: Rule-based matching ──
  const stage1Results: SearchMatch[] = []
  const seenIds = new Set<string>()

  // 1a. Synonym expansion → search each variant
  const variants = expandQueryWithSynonyms(query)
  for (const variant of variants) {
    const matches = searchNodesAcrossMaps(maps, variant, unlockedNodes)
    for (const match of matches) {
      const key = `${match.mapId}:${match.id}`
      if (!seenIds.has(key)) {
        seenIds.add(key)
        stage1Results.push(match)
      }
    }
  }

  // 1b. Pinyin matching
  const pinyinMatches = matchNodesByPinyin(query, maps)
  for (const match of pinyinMatches) {
    const key = `${match.mapId}:${match.id}`
    if (!seenIds.has(key)) {
      seenIds.add(key)
      stage1Results.push({
        ...match,
        unlocked: unlockedNodes.has(match.id),
      })
    }
  }

  // If model isn't warm yet, return rule results as-is
  if (!isModelReady) {
    console.log('[CWF] Model not ready — skipping semantic search. Rule results:', stage1Results.length)
    return {
      matches: stage1Results,
      usedSemantic: false,
      isLoadingModel: true,
    }
  }

  // ── Stage 2: Semantic (always runs when model is ready) ──
  console.log('[CWF] Running semantic search for:', query)
  try {
    const semanticResults = await semanticSearch(query, maps, semanticTopK)
    console.log('[CWF] Semantic results:', semanticResults.length, semanticResults.slice(0, 3).map(r => r.nodeId))

    // Merge semantic results, deduplicating against stage 1
    for (const result of semanticResults) {
      // Find which map this node belongs to
      let mapId = ''
      let mapTitle = ''

      for (const [id, map] of Object.entries(maps)) {
        const node = map.nodes.find((n) => n.id === result.nodeId)
        if (node) {
          mapId = id
          mapTitle = map.title
          break
        }
      }

      if (!mapId) continue // Node not found in any map

      const key = `${mapId}:${result.nodeId}`
      if (seenIds.has(key)) continue
      seenIds.add(key)

      const node = maps[mapId]!.nodes.find((n) => n.id === result.nodeId)
      if (!node) continue

      stage1Results.push({
        ...node,
        mapId,
        mapTitle,
        unlocked: unlockedNodes.has(node.id),
      })
    }

    return {
      matches: stage1Results,
      usedSemantic: true,
      isLoadingModel: false,
    }
  } catch {
    // Semantic search failed (model not loaded, network error, etc.)
    // Return whatever rule-based results we have
    return {
      matches: stage1Results,
      usedSemantic: false,
      isLoadingModel: false,
    }
  }
}

export { looksLikePinyin, toPinyinInitials, matchNodesByPinyin }
