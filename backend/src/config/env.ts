import 'dotenv/config';

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  PORT: readNumber('PORT', 3000),
  DATABASE_URL: readString('DATABASE_URL', 'mysql://root:password@localhost:3306/cwframe'),
  JWT_SECRET: readString('JWT_SECRET', 'dev-secret-key'),
  JWT_EXPIRES_IN: readString('JWT_EXPIRES_IN', '7d'),
  CORS_ORIGIN: readString('CORS_ORIGIN', '*'),
} as const;
