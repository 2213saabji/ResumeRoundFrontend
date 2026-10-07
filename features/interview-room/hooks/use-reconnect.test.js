import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECONNECT_WINDOW_MS, backoffDelay, createReconnector } from './use-reconnect';

describe('createReconnector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('backs off 1s, 2s, 4s, 8s, 8s...', () => {
    expect([0, 1, 2, 3, 4, 9].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000, 8000, 8000]);
  });

  it('stops after the first successful attempt', async () => {
    const reconnect = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(undefined);
    const onGiveUp = vi.fn();
    const r = createReconnector({ current: { reconnect, onGiveUp } });

    r.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(reconnect).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(reconnect).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reconnect).toHaveBeenCalledTimes(2);
    expect(onGiveUp).not.toHaveBeenCalled();
  });

  it('gives up once the 60 s window would be exceeded', async () => {
    const reconnect = vi.fn().mockRejectedValue(new Error('down'));
    const onGiveUp = vi.fn();
    const r = createReconnector({ current: { reconnect, onGiveUp } });

    r.schedule();
    await vi.advanceTimersByTimeAsync(RECONNECT_WINDOW_MS + 10_000);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    // attempts at 1, 3, 7, 15, 23, 31, 39, 47, 55 s; the next 8 s step would pass 60 s
    expect(reconnect).toHaveBeenCalledTimes(9);
  });

  it('ignores schedule() while an attempt is queued, and cancel() stops everything', async () => {
    const reconnect = vi.fn().mockRejectedValue(new Error('down'));
    const r = createReconnector({ current: { reconnect, onGiveUp: vi.fn() } });
    r.schedule();
    r.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(reconnect).toHaveBeenCalledTimes(1);
    r.cancel();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });
});
