/**
 * Build-time script: pre-compute node embeddings for all maps.
 *
 * Uses Transformers.js in Node.js to generate embedding vectors for
 * every node. The output JSON (~470 KB) is committed to git and bundled
 * with the frontend — every user gets instant semantic search.
 *
 * Usage: cd frontend && npx tsx scripts/precompute-embeddings.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Hash (mirrors frontend/src/app/services/embedding-cache.ts) ──

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function computeNodeDataHash(maps: Record<string, { nodes: Array<{ id: string; title: string; description?: string; tags?: string[] }> }>): string {
  const parts: string[] = []
  for (const map of Object.values(maps)) {
    for (const node of map.nodes) {
      parts.push([node.id, node.title, node.description ?? '', (node.tags ?? []).join(',')].join('|'))
    }
  }
  parts.sort()
  return fnv1aHash(parts.join('\n'))
}

function buildNodeText(node: { title: string; description?: string; tags?: string[] }): string {
  const parts = [node.title]
  if (node.description) { parts.push('. '); parts.push(node.description) }
  if (node.tags && node.tags.length > 0) { parts.push(' '); parts.push(node.tags.join(' ')) }
  return parts.join('')
}

// ── Main ──

async function main() {
  const dataDir = path.resolve(__dirname, '..', 'src', 'app', 'data')
  const publicDir = path.resolve(__dirname, '..', 'public')
  const outputPath = path.join(publicDir, 'embeddings.json')

  const mapFiles = ['root', 'fundamentals', 'hardware', 'software', 'programming', 'programmingLanguages', 'ai', 'network']
  const maps: Record<string, { nodes: any[] }> = {}
  for (const file of mapFiles) {
    maps[file] = JSON.parse(fs.readFileSync(path.join(dataDir, `${file}.json`), 'utf-8'))
  }

  const dataHash = computeNodeDataHash(maps)
  console.log(`Data hash: ${dataHash}`)

  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
    if (existing.hash === dataHash) {
      console.log('Embeddings already up-to-date. Skipping.')
      return
    }
    console.log('Data changed — recomputing...')
  }

  console.log('Loading embedding model (~120MB download on first run)...')
  const { pipeline, env } = await import('@xenova/transformers')
  // Use the locally cloned model instead of downloading from HuggingFace
  const modelPath = path.resolve(__dirname, '..', 'public', 'models')
  env.allowLocalModels = true
  env.localModelPath = modelPath
  const pipe = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small')
  console.log('Model loaded.')

  const allNodes: Array<{ id: string; text: string }> = []
  for (const map of Object.values(maps)) {
    for (const node of map.nodes) {
      allNodes.push({ id: node.id, text: buildNodeText(node) })
    }
  }

  console.log(`Computing embeddings for ${allNodes.length} nodes...`)
  const embeddings: number[][] = []
  const nodeIds: string[] = []
  const BATCH_SIZE = 32

  for (let i = 0; i < allNodes.length; i += BATCH_SIZE) {
    const batch = allNodes.slice(i, i + BATCH_SIZE)
    const output = await pipe(batch.map(n => n.text), { pooling: 'mean', normalize: true })
    const flat = Array.from(output.data) as number[]
    const dim = flat.length / batch.length

    for (let j = 0; j < batch.length; j += 1) {
      embeddings.push(flat.slice(j * dim, (j + 1) * dim))
      nodeIds.push(batch[j]!.id)
    }

    process.stdout.write(`\r  ${Math.min(100, Math.round((i + batch.length) / allNodes.length * 100))}%`)
  }

  console.log('\nDone. Writing output...')

  fs.writeFileSync(outputPath, JSON.stringify({
    hash: dataHash,
    embeddings,
    nodeIds,
    computedAt: new Date().toISOString(),
  }))

  console.log(`Wrote ${allNodes.length} embeddings (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`)
}

main().catch((err) => {
  console.error('Precompute failed:', err.message)
  process.exit(1)
})
