import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useCallStore } from '../store';
import { TextAnswer } from './text-answer';

const turn = (seq) => ({
  seq,
  objectiveIdx: 0,
  objectiveKind: 'warmup',
  questionText: `Question ${seq}`,
  isFollowUp: false,
  askedAt: '2026-10-09T10:00:00.000Z',
});

function setup() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <TextAnswer interviewId="iv1" />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  return {
    user,
    async send(text) {
      await user.clear(screen.getByLabelText('Your answer'));
      await user.type(screen.getByLabelText('Your answer'), text);
      await user.click(screen.getByRole('button', { name: 'Send answer' }));
    },
  };
}

describe('TextAnswer (voice call)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useCallStore.getState().reset();
  });

  it('uses the seq from the interviewer captions without a GET', async () => {
    const getSession = vi.spyOn(interviewsApi, 'getSession');
    const answer = vi
      .spyOn(interviewsApi, 'answer')
      .mockResolvedValueOnce({ interview: {}, progress: {}, currentTurn: turn(8) });
    useCallStore.getState().appendInterviewerLine({ seq: 7, text: 'Why Kafka?' });

    const { user, send } = setup();
    await user.click(screen.getByRole('button', { name: /type your answer instead/i }));
    await send('Replay');
    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));

    expect(answer.mock.calls[0][1].seq).toBe(7);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('looks the seq up with GET once, then keeps it from answers; never calls start', async () => {
    const start = vi.spyOn(interviewsApi, 'start');
    const getSession = vi.spyOn(interviewsApi, 'getSession').mockResolvedValue({
      interview: { status: 'in_progress' },
      progress: null,
      currentTurn: turn(4),
    });
    const answer = vi
      .spyOn(interviewsApi, 'answer')
      .mockResolvedValueOnce({ interview: {}, progress: {}, currentTurn: turn(5) })
      .mockResolvedValueOnce({ interview: {}, progress: {}, currentTurn: turn(6) });

    const { user, send } = setup();
    await user.click(screen.getByRole('button', { name: /type your answer instead/i }));
    await send('First');
    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
    await send('Second');
    await waitFor(() => expect(answer).toHaveBeenCalledTimes(2));

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(answer.mock.calls.map((c) => c[1].seq)).toEqual([4, 5]);
    expect(start).not.toHaveBeenCalled();
  });

  it('does not start a created interview when there is no open question', async () => {
    const start = vi.spyOn(interviewsApi, 'start');
    vi.spyOn(interviewsApi, 'getSession').mockResolvedValue({
      interview: { status: 'created' },
      progress: null,
      currentTurn: null,
    });
    const answer = vi.spyOn(interviewsApi, 'answer');

    const { user, send } = setup();
    await user.click(screen.getByRole('button', { name: /type your answer instead/i }));
    await send('Hello');

    expect(await screen.findByRole('alert')).toHaveTextContent(/no open question/i);
    expect(start).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
  });

  it('re-reads the seq after a conflict', async () => {
    const getSession = vi
      .spyOn(interviewsApi, 'getSession')
      .mockResolvedValueOnce({ interview: {}, progress: null, currentTurn: turn(2) })
      .mockResolvedValueOnce({ interview: {}, progress: null, currentTurn: turn(3) });
    const answer = vi
      .spyOn(interviewsApi, 'answer')
      .mockRejectedValueOnce(
        new ApiError(409, { error: { code: 'CONFLICT', details: { currentSeq: 3 } } }),
      )
      .mockResolvedValueOnce({ interview: {}, progress: {}, currentTurn: turn(4) });

    const { user, send } = setup();
    await user.click(screen.getByRole('button', { name: /type your answer instead/i }));
    await send('Stale');
    expect(await screen.findByRole('alert')).toHaveTextContent(/moved on/i);
    await send('Fresh');
    await waitFor(() => expect(answer).toHaveBeenCalledTimes(2));

    expect(getSession).toHaveBeenCalledTimes(2);
    expect(answer.mock.calls.map((c) => c[1].seq)).toEqual([2, 3]);
  });
});
