import { logger } from '@/lib/logger';

/**
 * Checks a response against its zod contract in development and test; trusts it in production
 * to save CPU and bundle size (the schemas are imported dynamically inside a branch the
 * production build removes). Always returns the original data so behaviour is identical in
 * every environment; a mismatch is logged loudly instead of crashing the page.
 * @template T
 * @param {keyof typeof import('@/contracts/responses').responseSchemas} name
 * @param {T} data
 * @param {string} label
 * @returns {T}
 */
export function checkContract(name, data, label) {
  if (process.env.NODE_ENV !== 'production') {
    import('@/contracts/responses')
      .then(({ responseSchemas }) => {
        const result = responseSchemas[name].safeParse(data);
        if (!result.success) logger.warn(`Contract mismatch in ${label}`, result.error.issues);
      })
      .catch(() => {});
  }
  return data;
}
