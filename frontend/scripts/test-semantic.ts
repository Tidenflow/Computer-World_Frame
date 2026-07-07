import { pipeline, env } from '@xenova/transformers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelPath = path.resolve(__dirname, '..', 'public', 'models')

async function main() {
  env.allowLocalModels = true
  env.localModelPath = modelPath

  console.log('Model path:', modelPath)

  try {
    console.log('Loading pipeline...')
    const pipe = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small')
    console.log('✅ Pipeline loaded!')

    const queries = ['渲染界面的语言', '前端框架', '那个用网页技术做桌面软件的框架']
    for (const query of queries) {
      const output = await pipe(query, { pooling: 'mean', normalize: true })
      console.log(`  "${query}" → dim=${output.data.length}, first=`, Array.from(output.data as Float32Array).slice(0, 3))
    }

    // Now test the full semantic search with embeddings.json
    console.log('\n=== Full semantic search test ===')
    const { computeQueryEmbedding, getOrComputeNodeEmbeddings, searchByEmbeddings } = await import('../src/app/services/semantic-search.ts')
    const { allMaps } = await import('../src/app/data/index.ts')

    const { embeddings, nodeIds } = await getOrComputeNodeEmbeddings(allMaps)
    console.log(`Loaded ${nodeIds.length} embeddings`)

    const queryEmbedding = await computeQueryEmbedding('渲染界面的语言')
    const results = searchByEmbeddings(queryEmbedding, embeddings, nodeIds, 10)
    console.log('Top 10 results:')
    for (const r of results) {
      const node = findNode(r.nodeId, allMaps)
      console.log(`  ${r.score.toFixed(4)} | ${r.nodeId} | ${node?.title ?? '???'}`)
    }
  } catch (err: any) {
    console.error('❌ Failed:', err.message)
  }
}

function findNode(id: string, maps: any): any {
  for (const map of Object.values(maps) as any[]) {
    const node = map.nodes.find((n: any) => n.id === id)
    if (node) return node
  }
  return null
}

main()
