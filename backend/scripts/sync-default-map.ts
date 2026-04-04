import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

type MapNode = {
  id: number;
  label: string;
  description?: string;
  category?: string;
  dependencies: number[];
  weight?: number;
  tier?: number;
};

type DefaultMap = {
  name: string;
  slug: string;
  version: string;
  nodes: MapNode[];
};

const prisma = new PrismaClient();

function readDefaultMap(): DefaultMap {
  const filePath = path.join(__dirname, '../src/data/map.default.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const map = JSON.parse(raw) as DefaultMap;

  if (!Array.isArray(map.nodes) || map.nodes.length === 0) {
    throw new Error('Default map is empty or invalid.');
  }

  if (typeof map.name !== 'string' || map.name.trim().length === 0) {
    throw new Error('Default map name is required.');
  }

  if (typeof map.slug !== 'string' || map.slug.trim().length === 0) {
    throw new Error('Default map slug is required.');
  }

  const ids = new Set<number>();
  for (const node of map.nodes) {
    if (ids.has(node.id)) {
      throw new Error(`Duplicate node id found: ${node.id}`);
    }
    ids.add(node.id);

    for (const dependencyId of node.dependencies) {
      if (!ids.has(dependencyId) && !map.nodes.some((candidate) => candidate.id === dependencyId)) {
        throw new Error(`Node ${node.id} depends on missing node ${dependencyId}`);
      }
    }
  }

  return map;
}

async function syncDefaultMap(): Promise<void> {
  const map = readDefaultMap();
  const nodeIds = map.nodes.map((node) => node.id);

  await prisma.$transaction(async (tx) => {
    for (const node of map.nodes) {
      await tx.node.upsert({
        where: { id: node.id },
        update: {
          mapSlug: map.slug,
          label: node.label,
          description: node.description ?? null,
          category: node.category ?? null,
          weight: node.weight ?? 5,
          tier: node.tier ?? 1,
        },
        create: {
          id: node.id,
          mapSlug: map.slug,
          label: node.label,
          description: node.description ?? null,
          category: node.category ?? null,
          weight: node.weight ?? 5,
          tier: node.tier ?? 1,
        },
      });
    }

    await tx.nodeDependency.deleteMany({
      where: {
        OR: [
          { nodeId: { in: nodeIds } },
          { dependsOnNodeId: { in: nodeIds } },
        ],
      },
    });

    const dependencies = map.nodes.flatMap((node) =>
      node.dependencies.map((dependencyId) => ({
        nodeId: node.id,
        dependsOnNodeId: dependencyId,
      }))
    );

    if (dependencies.length > 0) {
      await tx.nodeDependency.createMany({
        data: dependencies,
      });
    }
  });

  console.log(
    `Default map synced successfully. slug=${map.slug}, version=${map.version}, nodes=${map.nodes.length}`
  );
}

async function main(): Promise<void> {
  try {
    await syncDefaultMap();
  } catch (error) {
    console.error('Failed to sync default map:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
