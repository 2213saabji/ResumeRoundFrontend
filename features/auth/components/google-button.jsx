'use client';

import { useEffect, useRef, useState } from 'react';
import { authApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { env } from '@/lib/env';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** Loads Google Identity Services once, only on pages that show the button. */
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve(undefined), { once: true });
    script.addEventListener('error', () => reject(new Error('Could not load Google sign-in')), {
      once: true,
    });
    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * "Sign in with Google". Hidden when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
 * @param {{ onSuccess: (body: any) => void, text?: 'signin_with' | 'signup_with' | 'continue_with' }} props
 */
export function GoogleButton({ onSuccess, text = 'continue_with' }) {
  const container = useRef(/** @type {HTMLDivElement | null} */ (null));
  const onSuccessRef = useRef(onSuccess);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!env.googleClientId) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !container.current) return;
        const gid = window.google.accounts.id;
        gid.initialize({
          client_id: env.googleClientId,
          callback: async ({ credential }) => {
            setError(null);
            try {
              onSuccessRef.current(await authApi.google(credential));
            } catch (err) {
              setError(
                err instanceof ApiError && err.code === 'SERVICE_UNAVAILABLE'
                  ? 'Google sign-in is not available yet. Use email and password for now.'
                  : errorMessage(err),
              );
            }
          },
        });
        const dark =
          document.documentElement.dataset.theme === 'dark' ||
          (!document.documentElement.dataset.theme &&
            matchMedia('(prefers-color-scheme: dark)').matches);
        gid.renderButton(container.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width: container.current.clientWidth || 320,
        });
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!env.googleClientId) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={container} className="flex min-h-10 w-full justify-center" />
      {error ? (
        <p role="alert" className="text-center text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
