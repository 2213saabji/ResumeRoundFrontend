import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Data and privacy. Account deletion waits for its backend endpoint. */
export function PrivacySection() {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Data and privacy</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-fg-muted">
          <li>Your resume and any recordings are encrypted at rest.</li>
          <li>Audio is only recorded if you opt in.</li>
          <li>Your data is not used to train models without your consent.</li>
        </ul>
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Delete account and all data</p>
          <p className="text-sm text-fg-muted">
            Self-service deletion is coming soon. Until then, contact support to delete your data.
          </p>
        </div>
        <Button variant="danger" disabled aria-describedby="delete-soon">
          Delete account
        </Button>
        <span id="delete-soon" className="sr-only">
          Not available yet
        </span>
      </div>
    </Card>
  );
}
