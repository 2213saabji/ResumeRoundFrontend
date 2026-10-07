import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { buttonClasses } from '@/components/ui/button';

const STEPS = [
  {
    title: 'Upload your resume',
    body: 'We detect your languages, frameworks, databases and projects. You review and correct them before anything starts.',
  },
  {
    title: 'Pick the job you want',
    body: 'Backend, frontend or full stack; SDE-1 to Staff; startup, product or FAANG-style. The interview plan follows that choice.',
  },
  {
    title: 'Talk to the interviewer',
    body: 'A live voice call. Questions start from your own projects, and every follow-up depends on what you just said.',
  },
  {
    title: 'Get a scored report',
    body: 'Rubric scores per dimension, quotes from your answers as evidence, and a list of what to study next.',
  },
];

const DIFFERENCES = [
  {
    title: 'Your projects, not trivia',
    body: '"You used Redis in the payment service. What happens when it goes down?" beats "What is Redis?"',
  },
  {
    title: 'Follow-ups that dig',
    body: 'Vague answers get challenged, good ones get a harder question, and scenarios reveal details step by step.',
  },
  {
    title: 'Scores you can check',
    body: 'Every score comes from an explicit rubric with quoted evidence, not a single opinion.',
  },
  {
    title: 'It remembers',
    body: 'Your next interview spends more time on the areas you scored lowest in.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonClasses({ size: 'sm' })}>
            Get started
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 pt-14 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
          <p className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
            AI interview practice for software engineers
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Practice interviews based on your resume
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-fg-muted">
            An AI interviewer reads your resume, asks about the systems you actually built, pushes
            back on vague answers and raises the difficulty like a senior engineer would. Then it
            tells you exactly what to work on.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClasses({ size: 'lg' })}>
              Start practising
            </Link>
            <Link href="/login" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              I have an account
            </Link>
          </div>
        </section>

        <section aria-labelledby="how" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="how" className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-fg-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="why" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 id="why" className="text-2xl font-semibold tracking-tight">
            Built like a real interview loop
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {DIFFERENCES.map((d) => (
              <div key={d.title} className="rounded-xl border border-border bg-surface p-5">
                <h3 className="font-semibold">{d.title}</h3>
                <p className="mt-1.5 text-sm text-fg-muted">{d.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-fg-subtle sm:flex-row sm:justify-between sm:px-6">
          <p>ResumeRound</p>
          <p>
            Practice questions are generated for you; we never claim they are what a specific
            company asks.
          </p>
        </div>
      </footer>
    </div>
  );
}
