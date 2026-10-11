'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { Progress } from '@/components/ui/progress';
import { labelFor } from '@/contracts/enums';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { interviewKeys } from '@/lib/api/query-keys';
import { useReport } from '../hooks/use-report';
import { ReportView } from './report-view';

/** /interviews/[id]/report */
export function ReportPage() {
  const { id } = /** @type {{ id: string }} */ (useParams());

  const interview = useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn: () => interviewsApi.get(id),
    staleTime: 60_000,
  });
  const ended = interview.data?.status === 'ended' || interview.data?.status === 'abandoned';
  const report = useReport(id, { enabled: ended });

  // 409: the server says the interview is still running, so the cached status was stale.
  const router = useRouter();
  useEffect(() => {
    if (report.notEnded) router.replace(`/interviews/${id}/room`);
  }, [report.notEnded, id, router]);

  if (interview.isPending || report.notEnded) return <FullPageSpinner label="Loading report" />;

  if (interview.error) {
    const notFound =
      interview.error instanceof ApiError &&
      (interview.error.code === 'NOT_FOUND' || interview.error.code === 'VALIDATION_ERROR');
    return (
      <Alert
        tone="danger"
        title={notFound ? 'Interview not found' : 'Could not load this report'}
        action={
          notFound ? null : (
            <Button variant="secondary" onClick={() => interview.refetch()}>
              Try again
            </Button>
          )
        }
      >
        {notFound
          ? 'This interview does not exist or belongs to another account.'
          : errorMessage(interview.error)}
      </Alert>
    );
  }

  const iv = interview.data;
  const subtitle = `${labelFor('targetRole', iv.role)} · ${labelFor('level', iv.level)} · ${labelFor('companyType', iv.companyType)}${
    iv.endedAt
      ? ` · ${new Date(iv.endedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
      : ''
  }`;

  return (
    <div>
      <PageHeader
        title="Interview report"
        description={subtitle}
        actions={
          <Link href="/interviews/new" className={buttonClasses({ variant: 'secondary' })}>
            Practise again
          </Link>
        }
      />
      {!ended ? (
        <Alert
          tone="info"
          title="This interview has not ended yet"
          action={
            <Link href={`/interviews/${id}/room`} className={buttonClasses()}>
              Back to the interview
            </Link>
          }
        >
          The report is generated after the interview ends.
        </Alert>
      ) : report.gaveUp ? (
        <Alert
          tone="info"
          title="Your report is taking longer than usual"
          action={
            <Button
              variant="secondary"
              loading={report.isFetching}
              onClick={() => report.refetch()}
            >
              Check again
            </Button>
          }
        >
          Your answers are saved. Check back in a few minutes.
        </Alert>
      ) : report.isPending || report.generating ? (
        <Card className="flex flex-col gap-4" aria-live="polite">
          <div>
            <h2 className="font-semibold">Scoring your answers...</h2>
            <p className="text-sm text-fg-muted">
              {report.slow
                ? 'This is taking longer than usual. You can leave this page; the report will be here when it is ready.'
                : 'Each answer is scored against a rubric. This usually takes under a minute.'}
            </p>
          </div>
          <Progress label="Report generation" />
        </Card>
      ) : report.final ? (
        <Alert
          tone={report.final.status === 'failed' ? 'danger' : 'info'}
          title={
            report.final.status === 'failed'
              ? 'We could not generate this report'
              : 'Not enough answers to score'
          }
          action={
            <Link href="/interviews/new" className={buttonClasses()}>
              Start a new interview
            </Link>
          }
        >
          {report.final.message}
        </Alert>
      ) : report.unavailable ? (
        <Alert
          tone="info"
          title="Reports are not available yet"
          action={
            <Link href="/interviews/new" className={buttonClasses({ variant: 'secondary' })}>
              Practise again
            </Link>
          }
        >
          Scoring is not switched on for this server yet. Your answers are saved.
        </Alert>
      ) : report.error ? (
        <Alert
          tone="danger"
          title="Could not load the report"
          action={
            <Button variant="secondary" onClick={() => report.refetch()}>
              Try again
            </Button>
          }
        >
          {errorMessage(report.error)}
        </Alert>
      ) : (
        <ReportView report={report.data.report} interviewId={id} />
      )}
    </div>
  );
}
