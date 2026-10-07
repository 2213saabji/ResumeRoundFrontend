import { describe, expect, it } from 'vitest';
import { parseBotMessage } from './messages';
import { OPUS_MAX_AVERAGE_BITRATE, tuneOpus } from './sdp';

describe('parseBotMessage', () => {
  it('reads bare and TextRoom-wrapped captions', () => {
    const caption = { type: 'caption', speaker: 'ai', text: 'Hello', isFinal: false, id: 7 };
    expect(parseBotMessage(JSON.stringify(caption))).toEqual({
      type: 'caption',
      speaker: 'ai',
      text: 'Hello',
      isFinal: false,
      id: '7',
    });
    const wrapped = { textroom: 'message', from: 'bot', text: JSON.stringify(caption) };
    expect(parseBotMessage(wrapped)).toMatchObject({ type: 'caption', text: 'Hello' });
  });

  it('accepts known turn states only', () => {
    expect(parseBotMessage({ type: 'turn_state', state: 'listening' })).toEqual({
      type: 'turn_state',
      state: 'listening',
    });
    expect(parseBotMessage({ type: 'turn_state', state: 'dancing' })).toBeNull();
  });

  it('passes interview events through', () => {
    expect(parseBotMessage({ type: 'interview_event', event: 'ended', reason: 'time' })).toEqual({
      type: 'interview_event',
      event: 'ended',
      reason: 'time',
    });
  });

  it('ignores junk', () => {
    expect(parseBotMessage('not json')).toBeNull();
    expect(parseBotMessage({ type: 'unknown' })).toBeNull();
    expect(parseBotMessage({ textroom: 'message', text: '{bad' })).toBeNull();
    expect(parseBotMessage({ type: 'caption' })).toBeNull();
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
