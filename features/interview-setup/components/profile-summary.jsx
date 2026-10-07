import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { SKILL_BUCKETS } from '@/contracts/enums';

const MAX_SKILLS = 12;

/** Compact view of what the interviewer will ask about. */
export function ProfileSummary({ profile }) {
  const skills = SKILL_BUCKETS.flatMap((b) => profile.skills?.[b] ?? []).slice(0, MAX_SKILLS);
  const projects = profile.projects ?? [];

  return (
    <Card as="aside" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Interviewing you on</h2>
        <Link href="/profile" className="text-sm font-medium text-accent hover:underline">
          Edit
        </Link>
      </div>
      {projects.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium tracking-wide text-fg-subtle uppercase">Projects</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {projects.slice(0, 4).map((p) => (
              <li key={p.name} className="truncate">
                {p.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {skills.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium tracking-wide text-fg-subtle uppercase">Skills</h3>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li key={s} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs">
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
