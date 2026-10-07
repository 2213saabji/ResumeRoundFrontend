/**
 * Environment for browser code. The full zod validation runs at build time in next.config.js
 * (lib/env.schema.js), so a bad value fails the build; at runtime this only reads the values
 * and keeps zod out of every page bundle.
 */

// Next.js inlines NEXT_PUBLIC_* only when referenced literally, so list each one here.
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

if (!apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not set (see .env.example)');
}

/** Validated environment. Import this instead of reading process.env directly. */
export const env = {
  apiUrl,
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null,
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
};
