import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import { buildValidatedProjection } from './build-map-projection';
import type { MapDocument } from '../../../shared/map-document';

async function main() {
  const filePath = path.resolve(process.cwd(), 'src/data/maps/default.map.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const document = JSON.parse(raw) as MapDocument;
  const projection = buildValidatedProjection(document);

  const saved = await prisma.mapDocumentRecord.create({
    data: {
      mapId: document.mapId,
      version: document.version,
      status: 'published',
      documentJson: document as unknown as object,
      publishedAt: new Date()
    }
  });

  await prisma.mapProjectionRecord.create({
    data: {
      mapDocumentId: saved.id,
      projectionJson: projection as unknown as object
    }
  });
}

void main();
