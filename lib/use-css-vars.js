'use client';

import { useEffect, useState } from 'react';

/**
 * Resolves CSS custom properties to concrete values and re-resolves when the theme changes
 * (OS preference or the data-theme attribute). Needed for SVG chart libraries, whose
 * attributes cannot use var().
 * @template {string} T
 * @param {T[]} names e.g. ['--chart-1', '--fg-muted']
 * @returns {Record<T, string>}
 */
export function useCssVars(names) {
  const key = names.join(',');
  const [values, setValues] = useState(() => /** @type {Record<T, string>} */ ({}));

  useEffect(() => {
    const list = key.split(',');
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      setValues(Object.fromEntries(list.map((n) => [n, style.getPropertyValue(n).trim()])));
    };
    read();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', read);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      mq.removeEventListener('change', read);
      observer.disconnect();
    };
  }, [key]);

  return values;
}
