import { Spinner } from './spinner';

/** @param {{ label?: string }} props */
export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center text-fg-muted">
      <Spinner className="size-6" label={label} />
    </div>
  );
}
