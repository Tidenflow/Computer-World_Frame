import { PrismaClient } from '@prisma/client';
import { config } from '../config';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasourceUrl: config.db.databaseUrl,
});
