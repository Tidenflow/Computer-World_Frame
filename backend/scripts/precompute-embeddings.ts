/**
 * Embedding 预计算脚本
 *
 * 使用 @xenova/transformers 在 Node.js 端预计算所有地图节点的向量，
 * 生成 .embeddings.json 文件供前端直接使用。
 *
 * 运行方式:
 *   npx tsx scripts/precompute-embeddings.ts
 *
 * 输出文件:
 *   src/data/embeddings/{mapId}.embeddings.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@xenova/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MAPS_DIR = path.join(ROOT, 'src/data/maps');
const OUTPUT_DIR = path.join(ROOT, 'src/data/embeddings');

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

env.allowLocalModels = true;
env.useBrowserCache = false;

async function computeEmbedding(text: string, extractor: any): Promise<Float32Array> {
  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });
  const arr = new Float32Array(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    arr[i] = output.data[i];
  }
  return arr;
}

function buildNodeText(node: any): string {
  const parts: string[] = [node.title];
  if (node.aliases?.length) parts.push(node.aliases.join(', '));
  if (node.type) parts.push(node.type);
  if (node.tags?.length) parts.push(node.tags.join(', '));
  if (node.description) parts.push(node.description);
  return parts.join(' — ');
}

async function processMap(mapFile: string): Promise<void> {
  const filePath = path.join(MAPS_DIR, mapFile);
  const raw = fs.readFileSync(filePath, 'utf8');
  const map = JSON.parse(raw);

  console.log(`[embedding] Processing "${map.mapId}" (${map.nodes.length} nodes)...`);

  const extractor = await pipeline('feature-extraction', MODEL_NAME, {
    device: 'cpu',
  });

  const embeddings: Record<string, number[]> = {};

  for (const node of map.nodes) {
    const text = buildNodeText(node);
    const vec = await computeEmbedding(text, extractor);
    embeddings[node.id] = Array.from(vec);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${map.mapId}.embeddings.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        mapId: map.mapId,
        version: map.version,
        model: MODEL_NAME,
        dimension: EMBEDDING_DIM,
        computedAt: new Date().toISOString(),
        embeddings,
      },
      null,
      2
    )
  );

  console.log(`[embedding] Written: ${outPath}`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(MAPS_DIR)) {
    console.error(`[embedding] Maps directory not found: ${MAPS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.map.json'));

  if (files.length === 0) {
    console.error('[embedding] No map files found');
    process.exit(1);
  }

  for (const file of files) {
    await processMap(file);
  }

  console.log(`[embedding] Done. Processed ${files.length} maps.`);
}

main().catch(err => {
  console.error('[embedding] Error:', err);
  process.exit(1);
});
