import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateUsers() {
  const usersData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/user.json'), 'utf-8')
  );

  for (const user of usersData) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        username: user.username,
        passwordHash: user.password,
        createdAt: new Date(user.timeStamp)
      }
    });
  }
  console.log('✅ Users migrated');
}

async function migrateNodes() {
  const mapData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/map.default.json'), 'utf-8')
  );

  for (const node of mapData.nodes) {
    await prisma.node.upsert({
      where: { id: node.id },
      update: {},
      create: {
        id: node.id,
        label: node.label,
        description: node.description,
        category: node.category,
        weight: node.weight || 5,
        tier: node.tier || 1
      }
    });
  }
  console.log('✅ Nodes migrated');
}

async function migrateDependencies() {
  const mapData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/map.default.json'), 'utf-8')
  );

  for (const node of mapData.nodes) {
    for (const depId of node.dependencies) {
      await prisma.nodeDependency.upsert({
        where: {
          nodeId_dependsOnNodeId: {
            nodeId: node.id,
            dependsOnNodeId: depId
          }
        },
        update: {},
        create: {
          nodeId: node.id,
          dependsOnNodeId: depId
        }
      });
    }
  }
  console.log('✅ Dependencies migrated');
}

async function migrateProgress() {
  const progressData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/progress.json'), 'utf-8')
  );

  for (const [userId, progress] of Object.entries(progressData)) {
    const unlockedNodes = (progress as any).unlockedNodes;

    for (const [nodeId, data] of Object.entries(unlockedNodes)) {
      await prisma.userProgress.upsert({
        where: {
          uk_user_node: {
            userId: parseInt(userId),
            nodeId: parseInt(nodeId)
          }
        },
        update: {},
        create: {
          userId: parseInt(userId),
          nodeId: parseInt(nodeId),
          unlockedAt: new Date((data as any).unlockedAt)
        }
      });
    }
  }
  console.log('✅ Progress migrated');
}

async function main() {
  try {
    console.log('🚀 Starting data migration...');
    await migrateUsers();
    await migrateNodes();
    await migrateDependencies();
    await migrateProgress();
    console.log('🎉 All data migrated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

