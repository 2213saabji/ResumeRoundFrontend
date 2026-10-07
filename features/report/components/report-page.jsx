'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

  if (interview.isPending) return <FullPageSpinner label="Loading report" />;

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
