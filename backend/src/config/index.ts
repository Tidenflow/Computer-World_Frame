import { env } from './env';

export const config = {
  app: {
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },
  db: {
    databaseUrl: env.DATABASE_URL,
  },
} as const;
