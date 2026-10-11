import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useTextInterview } from './hooks/use-text-interview';
import {
  initialTextInterviewState,
  remainingSeconds,
  textInterviewReducer,
} from './text-interview-machine';

const progress = (over = {}) => ({
  objectiveIdx: 0,
  objectiveCount: 6,
  objectiveKind: 'warmup',
  questionsAsked: 1,
  elapsedSec: 2,
  remainingSec: 1798,
  ...over,
});

const turn = (seq, over = {}) => ({
  seq,
  objectiveIdx: 0,
  objectiveKind: 'warmup',
  questionText: `Question ${seq}`,
  isFollowUp: seq > 1,
  askedAt: '2026-10-09T10:00:00.000Z',
  ...over,
});

const apiError = (status, code, details) =>
  new ApiError(status, { error: { code, message: `${code} message`, details } });

describe('textInterviewReducer', () => {
  const created = { status: 'created' };

  it('starts idle for a new interview and "starting" for one in progress', () => {
    expect(initialTextInterviewState(created).status).toBe('idle');
    expect(initialTextInterviewState({ status: 'in_progress' }).status).toBe('starting');
    expect(initialTextInterviewState({ status: 'ended' }).status).toBe('ended');
  });

  it('moves the answered question into history and opens the next one', () => {
    let s = initialTextInterviewState(created);
    s = textInterviewReducer(s, {
      type: 'synced',
      progress: progress(),
      currentTurn: turn(1),
      now: 1,
    });
    s = textInterviewReducer(s, { type: 'draft', value: 'My answer' });
    s = textInterviewReducer(s, { type: 'submit', seq: 1, answerText: 'My answer' });
    expect(s).toMatchObject({ status: 'submitting', draft: '', pending: { seq: 1 } });

    s = textInterviewReducer(s, {
      type: 'answered',
      response: {
        progress: progress({ questionsAsked: 2 }),
        currentTurn: turn(2),
        closingMessage: null,
      },
      now: 2,
    });
    expect(s.status).toBe('active');
    expect(s.currentTurn.seq).toBe(2);
    expect(s.history).toEqual([
      expect.objectContaining({ seq: 1, questionText: 'Question 1', answerText: 'My answer' }),
    ]);
    expect(s.pending).toBeNull();
  });

  it('ends with the closing message when there is no next question', () => {
    let s = textInterviewReducer(initialTextInterviewState(created), {
      type: 'synced',
      progress: progress(),
      currentTurn: turn(1),
      now: 1,
    });
    s = textInterviewReducer(s, { type: 'submit', seq: 1, answerText: 'Bye' });
    s = textInterviewReducer(s, {
      type: 'answered',
      response: { progress: progress(), currentTurn: null, closingMessage: 'Thanks!' },
      now: 2,
    });
    expect(s).toMatchObject({ status: 'ended', currentTurn: null, closingMessage: 'Thanks!' });
  });

  it('gives the text back when an answer is rejected, keeps it when stuck', () => {
    const active = textInterviewReducer(initialTextInterviewState(created), {
      type: 'synced',
      progress: progress(),
      currentTurn: turn(1),
      now: 1,
    });
    const sent = textInterviewReducer(active, { type: 'submit', seq: 1, answerText: 'Hello' });

    const rejected = textInterviewReducer(sent, { type: 'answerRejected', message: 'Too long' });
    expect(rejected).toMatchObject({ status: 'active', draft: 'Hello', pending: null });

    const stuck = textInterviewReducer(sent, { type: 'answerStuck', message: 'No reply' });
    expect(stuck).toMatchObject({
      status: 'active',
      pending: { answerText: 'Hello', failed: true },
    });
    expect(stuck.error.action).toBe('answer');
  });

  it('merges restored history by seq and ignores unanswered turns', () => {
    const s = textInterviewReducer(initialTextInterviewState({ status: 'in_progress' }), {
      type: 'synced',
      progress: progress(),
      currentTurn: turn(3),
      turns: [
        { seq: 2, questionText: 'Q2', answerText: 'A2' },
        { seq: 1, questionText: 'Q1', answerText: 'A1' },
        { seq: 3, questionText: 'Q3', answerText: null },
      ],
      now: 1,
    });
    expect(s.history.map((h) => h.seq)).toEqual([1, 2]);
    expect(s.currentTurn.seq).toBe(3);
  });

  it('counts down from the last sync and never below zero', () => {
    expect(remainingSeconds(progress({ remainingSec: 100 }), 1000, 31_000)).toBe(70);
    expect(remainingSeconds(progress({ remainingSec: 10 }), 0, 60_000)).toBe(0);
    expect(remainingSeconds(null, 0, 0)).toBeNull();
  });
});

describe('useTextInterview', () => {
  const interview = { id: 'iv1', status: 'created' };
  let queryClient;

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts, answers with the open seq, and shows the next question', async () => {
    vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: { status: 'in_progress' },
      progress: progress(),
      currentTurn: turn(1),
    });
    const answer = vi.spyOn(interviewsApi, 'answer').mockResolvedValue({
      interview: { status: 'in_progress' },
      progress: progress(),
      currentTurn: turn(2),
      closingMessage: null,
    });

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    expect(result.current.state.currentTurn.seq).toBe(1);

    act(() => result.current.setDraft('  It is a Node service  '));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state.currentTurn?.seq).toBe(2));
    expect(answer).toHaveBeenCalledWith('iv1', { seq: 1, answerText: 'It is a Node service' });
  });

  it('retries the exact same request on 503 until it succeeds', async () => {
    vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: {},
      progress: progress(),
      currentTurn: turn(1),
    });
    const answer = vi
      .spyOn(interviewsApi, 'answer')
      .mockRejectedValueOnce(apiError(503, 'SERVICE_UNAVAILABLE'))
      .mockRejectedValueOnce(apiError(503, 'SERVICE_UNAVAILABLE'))
      .mockResolvedValueOnce({
        interview: {},
        progress: progress(),
        currentTurn: turn(2),
        closingMessage: null,
      });

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    act(() => result.current.setDraft('Answer'));
    act(() => result.current.submit());
    await act(() => vi.advanceTimersByTimeAsync(3500));

    await waitFor(() => expect(result.current.state.currentTurn?.seq).toBe(2));
    expect(answer).toHaveBeenCalledTimes(3);
    for (const call of answer.mock.calls) expect(call[1]).toEqual({ seq: 1, answerText: 'Answer' });
  });

  it('re-reads GET /interviews/:id on a seq conflict and keeps the typed text', async () => {
    const start = vi
      .spyOn(interviewsApi, 'start')
      .mockResolvedValue({ interview: {}, progress: progress(), currentTurn: turn(1) });
    const getSession = vi.spyOn(interviewsApi, 'getSession').mockResolvedValue({
      interview: { status: 'in_progress' },
      progress: progress(),
      currentTurn: turn(3),
    });
    vi.spyOn(interviewsApi, 'answer').mockRejectedValue(
      apiError(409, 'CONFLICT', { currentSeq: 3 }),
    );

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    act(() => result.current.setDraft('Stale answer'));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.currentTurn?.seq).toBe(3));
    expect(getSession).toHaveBeenCalledWith('iv1');
    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBe('Stale answer');
    expect(result.current.state.notice).toMatch(/moved on/);
  });

  it('branches on the re-read status after a 409 without details', async () => {
    vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: {},
      progress: progress(),
      currentTurn: turn(1),
    });
    vi.spyOn(interviewsApi, 'getSession').mockResolvedValue({
      interview: { status: 'ended' },
      progress: null,
      currentTurn: null,
    });
    vi.spyOn(interviewsApi, 'answer').mockRejectedValue(apiError(409, 'CONFLICT'));

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    act(() => result.current.setDraft('Too late'));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.status).toBe('ended'));
  });

  it('waits out Retry-After on a 429 and resends the same request', async () => {
    vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: {},
      progress: progress(),
      currentTurn: turn(1),
    });
    const answer = vi
      .spyOn(interviewsApi, 'answer')
      .mockRejectedValueOnce(
        new ApiError(429, { error: { code: 'RATE_LIMITED' } }, { retryAfterSec: 10 }),
      )
      .mockResolvedValueOnce({
        interview: {},
        progress: progress(),
        currentTurn: turn(2),
        closingMessage: null,
      });

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    act(() => result.current.setDraft('Answer'));
    act(() => result.current.submit());
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(answer).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(6000));

    await waitFor(() => expect(result.current.state.currentTurn?.seq).toBe(2));
    expect(answer.mock.calls[1][1]).toEqual({ seq: 1, answerText: 'Answer' });
  });

  it('hands the text back on a validation error', async () => {
    vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: {},
      progress: progress(),
      currentTurn: turn(1),
    });
    vi.spyOn(interviewsApi, 'answer').mockRejectedValue(apiError(400, 'VALIDATION_ERROR'));

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    act(() => result.current.setDraft('x'));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.error).not.toBeNull());
    expect(result.current.state).toMatchObject({ status: 'active', draft: 'x', pending: null });
  });

  it('ends with the closing message', async () => {
    vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: {},
      progress: progress(),
      currentTurn: turn(1),
    });
    vi.spyOn(interviewsApi, 'answer').mockResolvedValue({
      interview: { status: 'ended' },
      progress: progress(),
      currentTurn: null,
      closingMessage: "That's all from my side.",
    });

    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    act(() => result.current.setDraft('Last answer'));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.status).toBe('ended'));
    expect(result.current.state.closingMessage).toBe("That's all from my side.");
  });

  it('restores from the GET /interviews/:id snapshot without calling start', async () => {
    const start = vi.spyOn(interviewsApi, 'start');
    vi.spyOn(interviewsApi, 'allTurns').mockResolvedValue([
      { seq: 1, questionText: 'Q1', answerText: 'A1' },
      { seq: 2, questionText: 'Question 2', answerText: null },
    ]);
    const session = { progress: progress(), currentTurn: turn(2), fetchedAt: Date.now() };

    const { result } = renderHook(
      () => useTextInterview({ id: 'iv1', status: 'in_progress' }, session),
      { wrapper },
    );
    expect(result.current.state).toMatchObject({ status: 'active', currentTurn: { seq: 2 } });
    await waitFor(() => expect(result.current.state.history).toHaveLength(1));
    expect(start).not.toHaveBeenCalled();
  });

  it('never starts a "created" interview automatically (start starts the clock)', async () => {
    const start = vi.spyOn(interviewsApi, 'start');
    const { result } = renderHook(
      () => useTextInterview(interview, { progress: null, currentTurn: null }),
      { wrapper },
    );
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(result.current.state.status).toBe('idle');
    expect(start).not.toHaveBeenCalled();
  });

  it('falls back to start when GET has no open question (older server)', async () => {
    const start = vi.spyOn(interviewsApi, 'start').mockResolvedValue({
      interview: {},
      progress: progress({ objectiveIdx: 2 }),
      currentTurn: turn(3),
    });
    vi.spyOn(interviewsApi, 'allTurns').mockResolvedValue([
      { seq: 1, questionText: 'Q1', answerText: 'A1' },
      { seq: 2, questionText: 'Q2', answerText: 'A2' },
      { seq: 3, questionText: 'Question 3', answerText: null },
    ]);

    const { result } = renderHook(() => useTextInterview({ id: 'iv1', status: 'in_progress' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.state.status).toBe('active'));
    expect(start).toHaveBeenCalled();
    expect(result.current.state.history).toHaveLength(2);
    expect(result.current.state.currentTurn.seq).toBe(3);
  });

  it('explains when the server does not have the interview loop yet', async () => {
    vi.spyOn(interviewsApi, 'start').mockRejectedValue(apiError(404, 'NOT_FOUND'));
    const { result } = renderHook(() => useTextInterview(interview), { wrapper });
    await act(() => result.current.start());
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.error.message).toMatch(/not live/);
  });
});
