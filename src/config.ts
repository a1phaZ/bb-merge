import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().default(3000),
  BITBUCKET_URL: z.string().url().optional(),
  BITBUCKET_USERNAME: z.string().optional(),
  BITBUCKET_PASSWORD: z.string().optional(),
  STORAGE_TYPE: z.enum(['file', 'sqlite']).default('file'),
  DATA_DIR: z.string().default('./data'),
  ENCRYPTION_KEY: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
