import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Try to load .env.local (for local dev), falls back to env vars (Vercel/CI)
// dotenv.config() doesn't throw if file doesn't exist
config({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL'),
  },
});