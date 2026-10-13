import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_CAPTIONS, useCallStore } from './store';

const s = () => useCallStore.getState();

describe('call store', () => {
  beforeEach(() => s().reset());

  it('grows a partial caption in place, then finalises it', () => {
    s().upsertCaption({ speaker: 'ai', text: 'Tell me', isFinal: false });
    s().upsertCaption({ speaker: 'ai', text: 'Tell me about Redis', isFinal: false });
    s().upsertCaption({ speaker: 'ai', text: 'Tell me about Redis.', isFinal: true });
    expect(s().captions).toHaveLength(1);
    expect(s().captions[0]).toMatchObject({ text: 'Tell me about Redis.', isFinal: true });

    s().upsertCaption({ speaker: 'ai', text: 'Next', isFinal: false });
    expect(s().captions).toHaveLength(2);
  });

  it('keeps speakers apart and matches by id', () => {
    s().upsertCaption({ speaker: 'ai', text: 'Q', isFinal: true, id: 'q1' });
    s().upsertCaption({ speaker: 'candidate', text: 'A', isFinal: false });
    s().upsertCaption({ speaker: 'ai', text: 'Q edited', isFinal: true, id: 'q1' });
    expect(s().captions.map((c) => c.text)).toEqual(['Q edited', 'A']);
  });

  it('appends interviewer sentences into one bubble per seq and tracks the seq', () => {
    s().appendInterviewerLine({ seq: 3, text: 'Good.' });
    s().appendInterviewerLine({ seq: 3, text: 'Why Kafka over RabbitMQ?' });
    s().upsertCaption({ speaker: 'candidate', text: 'we needed', isFinal: false });
    s().upsertCaption({ speaker: 'candidate', text: 'We needed replay.', isFinal: true });
    s().appendInterviewerLine({ seq: 4, text: 'Next topic.' });
    expect(s().captions.map((c) => c.text)).toEqual([
      'Good. Why Kafka over RabbitMQ?',
      'We needed replay.',
      'Next topic.',
    ]);
    expect(s().currentSeq).toBe(4);
  });

  it('rebuilds captions from the stored turns, then replaces a repeated question', () => {
    s().upsertCaption({ speaker: 'candidate', text: 'lost interim', isFinal: false });
    s().loadHistory([
      { seq: 1, questionText: 'Walk me through it.', answerText: 'It is a gateway.' },
      { seq: 2, questionText: 'Why Redis?', answerText: null },
    ]);
    expect(s().captions.map((c) => c.text)).toEqual([
      'Walk me through it.',
      'It is a gateway.',
      'Why Redis?',
    ]);
    expect(s().currentSeq).toBe(2);

    s().appendInterviewerLine({ seq: 2, text: 'So,' });
    s().appendInterviewerLine({ seq: 2, text: 'why Redis?' });
    expect(s().captions.at(-1).text).toBe('So, why Redis?');
  });

  it('syncs the timer to the server clock', () => {
    s().syncClock(90);
    expect(Date.now() - s().startedAt).toBeGreaterThanOrEqual(90_000);
    expect(Date.now() - s().startedAt).toBeLessThan(91_000);
  });

  it('caps the caption history', () => {
    for (let i = 0; i < MAX_CAPTIONS + 5; i++)
      s().upsertCaption({ speaker: 'ai', text: `${i}`, isFinal: true });
    expect(s().captions).toHaveLength(MAX_CAPTIONS);
    expect(s().captions.at(-1).text).toBe(`${MAX_CAPTIONS + 4}`);
  });

  it('starts the timer on the first ai_speaking state only', () => {
    s().setTurnState('thinking');
    expect(s().startedAt).toBeNull();
    s().setTurnState('ai_speaking');
    const started = s().startedAt;
    expect(started).toBeTypeOf('number');
    s().setTurnState('listening');
    s().setTurnState('ai_speaking');
    expect(s().startedAt).toBe(started);
  });

  it('tracks when reconnecting started', () => {
    s().setTurnState('reconnecting');
    const since = s().reconnectingSince;
    expect(since).toBeTypeOf('number');
    s().setTurnState('reconnecting');
    expect(s().reconnectingSince).toBe(since);
    s().setTurnState('listening');
    expect(s().reconnectingSince).toBeNull();
  });
});
