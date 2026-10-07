import { env } from '@/lib/env';

/**
 * Thin logging facade. In production only warnings and errors are emitted; error tracking
 * (Sentry free tier) plugs in at reportError() without touching call sites.
 */
export const logger = {
  debug: (...args) => {
    if (env.isDev) console.debug('[rr]', ...args);
  },
  info: (...args) => {
    if (!env.isProd) console.info('[rr]', ...args);
  },
  warn: (...args) => console.warn('[rr]', ...args),
  error: (...args) => console.error('[rr]', ...args),
};

/**
 * Report an unexpected error (client errors, WebRTC failures).
 * @param {unknown} error
 * @param {Record<string, unknown>} [context]
 */
export function reportError(error, context = {}) {
  logger.error(error, context);
  // Hook for Sentry: window.Sentry?.captureException(error, { extra: context });
  if (typeof window !== 'undefined' && window.Sentry?.captureException) {
    window.Sentry.captureException(error, { extra: context });
  }
}
