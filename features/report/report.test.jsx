import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { ReportView } from './components/report-view';
import { REPORT_GIVE_UP_AFTER_MS, REPORT_POLL_MS, useReport } from './hooks/use-report';

let queryClient;
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useReport', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(['insufficient_answers', 'failed'])('treats %s as final and stops polling', async (s) => {
    const report = vi
      .spyOn(interviewsApi, 'report')
      .mockResolvedValueOnce({ status: 'generating' })
      .mockResolvedValue({ status: s, message: 'Message for users' });

    const { result } = renderHook(() => useReport('iv1', { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.generating).toBe(true));
    await act(() => vi.advanceTimersByTimeAsync(REPORT_POLL_MS));
    await waitFor(() =>
      expect(result.current.final).toEqual({ status: s, message: 'Message for users' }),
    );

    await act(() => vi.advanceTimersByTimeAsync(REPORT_POLL_MS * 3));
    expect(report).toHaveBeenCalledTimes(2);
    expect(result.current.unavailable).toBe(false);
  });

  it('stops polling at the safety cap', async () => {
    const report = vi.spyOn(interviewsApi, 'report').mockResolvedValue({ status: 'generating' });

    const { result } = renderHook(() => useReport('iv1', { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.generating).toBe(true));
    await act(() => vi.advanceTimersByTimeAsync(REPORT_GIVE_UP_AFTER_MS));
    expect(result.current.gaveUp).toBe(true);

    const calls = report.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(REPORT_POLL_MS * 3));
    expect(report.mock.calls.length).toBe(calls);
  });

  it('flags a 409 as "not ended"', async () => {
    vi.spyOn(interviewsApi, 'report').mockRejectedValue(
      new ApiError(409, { error: { code: 'CONFLICT' } }),
    );
    const { result } = renderHook(() => useReport('iv1', { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.notEnded).toBe(true));
  });
});

describe('ReportView', () => {
  const report = {
    id: 'r1',
    interviewId: 'iv1',
    overall: 6.4,
    dimensionScores: { communication: 7.5, system_design: 5.8 },
    questionsAnswered: 18,
    strengths: ['Clear structure'],
    weaknesses: ['Shallow on caching'],
    feedback: 'Line one.\nLine two.',
    recommendations: [
      { topic: 'Caching', reason: 'Gaps', resources: [{ title: 'Redis docs', url: null }] },
    ],
    createdAt: '2026-10-09T10:00:00.000Z',
  };

  it('renders only the dimensions present, the answer count and plain-text resources', () => {
    queryClient = new QueryClient();
    render(<ReportView report={report} interviewId="iv1" />, { wrapper });

    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('System design')).toBeInTheDocument();
    expect(screen.queryByText('Technical knowledge')).not.toBeInTheDocument();
    expect(screen.getByText('Based on 18 answers')).toBeInTheDocument();
    expect(screen.getByText('Redis docs').closest('a')).toBeNull();
  });
});
