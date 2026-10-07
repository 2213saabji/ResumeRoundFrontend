import { z } from 'zod';

/** Build-time environment validation, run from next.config.js. */
export const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(
    'NEXT_PUBLIC_API_URL must be a full URL, e.g. http://localhost:4000/api/v1',
  ),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
});

/** Throws with a readable list of problems when the environment is invalid. */
export function assertValidEnv(source = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration (see .env.example):\n${issues}`);
  }
  return parsed.data;
}
