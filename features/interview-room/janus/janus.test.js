import { describe, expect, it } from 'vitest';
import { parseBotMessage } from './messages';
import { OPUS_MAX_AVERAGE_BITRATE, tuneOpus } from './sdp';

describe('parseBotMessage', () => {
  const wrap = (event) => ({ textroom: 'announcement', text: JSON.stringify(event) });

  it('maps the interviewer state, storing speaking as ai_speaking', () => {
    expect(parseBotMessage(wrap({ type: 'state', state: 'speaking' }))).toEqual({
      type: 'state',
      state: 'ai_speaking',
    });
    expect(parseBotMessage({ type: 'state', state: 'listening' })).toEqual({
      type: 'state',
      state: 'listening',
    });
    expect(parseBotMessage({ type: 'state', state: 'dancing' })).toBeNull();
  });

  it('reads interviewer sentences and candidate transcripts', () => {
    expect(parseBotMessage(wrap({ type: 'interviewer', seq: 3, text: 'Why Kafka?' }))).toEqual({
      type: 'interviewer',
      seq: 3,
      text: 'Why Kafka?',
    });
    expect(
      parseBotMessage(JSON.stringify({ type: 'candidate', seq: 3, text: 'we needed replay' })),
    ).toEqual({ type: 'candidate', seq: 3, text: 'we needed replay', final: false });
    expect(
      parseBotMessage(wrap({ type: 'candidate', seq: 3, text: 'Replay.', final: true })),
    ).toMatchObject({ final: true });
  });

  it('reads the ended event', () => {
    expect(parseBotMessage(wrap({ type: 'ended', reason: 'time_up' }))).toEqual({
      type: 'ended',
      reason: 'time_up',
    });
  });

  it('handles announcements only, not messages from room users', () => {
    const event = JSON.stringify({ type: 'ended', reason: 'completed' });
    expect(parseBotMessage({ textroom: 'message', from: 'interviewer', text: event })).toBeNull();
    expect(parseBotMessage({ textroom: 'join', username: 'x' })).toBeNull();
  });

  it('ignores junk', () => {
    expect(parseBotMessage('not json')).toBeNull();
    expect(parseBotMessage({ type: 'unknown' })).toBeNull();
    expect(parseBotMessage({ textroom: 'announcement', text: '{bad' })).toBeNull();
    expect(parseBotMessage({ type: 'interviewer', text: 'no seq' })).toBeNull();
    expect(parseBotMessage({ type: 'candidate', seq: 1 })).toBeNull();
  });
});

describe('tuneOpus', () => {
  const offer = [
    'v=0',
    'm=audio 9 UDP/TLS/RTP/SAVPF 111 0',
    'a=rtpmap:111 opus/48000/2',
    'a=fmtp:111 minptime=10;useinbandfec=0',
    'a=rtpmap:0 PCMU/8000',
    '',
  ].join('\r\n');

  it('caps Opus bitrate and enables FEC, keeping existing params', () => {
    const out = tuneOpus(offer);
    expect(out).toContain(
      `a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=${OPUS_MAX_AVERAGE_BITRATE}`,
    );
  });

  it('adds an fmtp line when there is none', () => {
    const out = tuneOpus(offer.replace('a=fmtp:111 minptime=10;useinbandfec=0\r\n', ''));
    expect(out).toContain(
      `a=rtpmap:111 opus/48000/2\r\na=fmtp:111 maxaveragebitrate=${OPUS_MAX_AVERAGE_BITRATE};useinbandfec=1`,
    );
  });

  it('leaves SDP without Opus untouched', () => {
    const noOpus = 'v=0\r\na=rtpmap:0 PCMU/8000\r\n';
    expect(tuneOpus(noOpus)).toBe(noOpus);
  });
});
