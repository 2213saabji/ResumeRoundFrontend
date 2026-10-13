import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RECONNECT_ATTEMPTS, backoffDelay, createReconnector } from './use-reconnect';

describe('createReconnector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('backs off 1s, 2s, 4s', () => {
    expect([0, 1, 2, 5].map(backoffDelay)).toEqual([1000, 2000, 4000, 4000]);
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

  it('gives up after the third failed attempt', async () => {
    const reconnect = vi.fn().mockRejectedValue(new Error('down'));
    const onGiveUp = vi.fn();
    const r = createReconnector({ current: { reconnect, onGiveUp } });

    r.schedule();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reconnect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
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
