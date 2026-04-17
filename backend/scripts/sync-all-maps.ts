/**
 * 地图数据同步脚本
 *
 * 将 src/data/maps/*.json 中的最新地图数据写入数据库，
 * 作为 published 记录替换旧数据。
 *
 * 运行方式:
 *   npx tsx scripts/sync-all-maps.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildValidatedProjection } from '../src/scripts/build-map-projection';
import type { MapDocument } from '../../../shared/map-document';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.join(__dirname, '../src/data/maps');
const prisma = new PrismaClient();

interface MapEntry {
  file: string;
  title: string;
}

const MAP_REGISTRY: Record<string, MapEntry> = {
  'computer-world': { file: 'default.map.json', title: '计算机世界总图' },
  'frontend': { file: 'frontend.map.json', title: '前端生态图' },
  'backend': { file: 'backend.map.json', title: '后端生态图' },
  'devops': { file: 'devops.map.json', title: 'DevOps 图' },
  'ai': { file: 'ai.map.json', title: 'AI/ML 图' },
};

async function upsertMapRecord(mapId: string, file: string): Promise<void> {
  const filePath = path.join(MAPS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`  [skip] "${file}" not found`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const document = JSON.parse(raw) as MapDocument;
  const projection = buildValidatedProjection(document);

  // 将旧 published 记录改为 draft
  await prisma.mapDocumentRecord.updateMany({
    where: { mapId, status: 'published' },
    data: { status: 'archived' },
  });

  // 写入新 published 记录
  const record = await prisma.mapDocumentRecord.upsert({
    where: {
      uk_map_version: { mapId, version: document.version },
    },
    update: {
      status: 'published',
      documentJson: document,
      publishedAt: new Date(),
    },
    create: {
      mapId,
      version: document.version,
      status: 'published',
      documentJson: document,
      publishedAt: new Date(),
    },
  });

  // 更新或创建 projection
  await prisma.mapProjectionRecord.upsert({
    where: { mapDocumentId: record.id },
    update: {
      projectionJson: projection,
      generatedAt: new Date(),
    },
    create: {
      mapDocumentId: record.id,
      projectionJson: projection,
      generatedAt: new Date(),
    },
  });

  console.log(`  [ok] "${mapId}" v${document.version} — ${document.nodes.length} nodes, ${document.domains.length} domains`);
}

async function main(): Promise<void> {
  console.log('Map sync: starting...\n');

  for (const [mapId, entry] of Object.entries(MAP_REGISTRY)) {
    try {
      await upsertMapRecord(mapId, entry.file);
    } catch (err) {
      console.error(`  [fail] "${mapId}":`, err);
    }
  }

  console.log('\nMap sync: done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
