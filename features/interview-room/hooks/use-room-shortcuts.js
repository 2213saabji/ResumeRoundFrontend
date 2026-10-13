'use client';

import { useEffect, useRef } from 'react';

/** True when the key press belongs to a text field or an open dialog, not the room. */
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('dialog[open]')) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Room keyboard controls: Space = push-to-talk (hold), M = mute, Esc = end (with confirm).
 * @param {{
 *   enabled: boolean,
 *   pushToTalk?: boolean,
 *   onPttDown: () => void,
 *   onPttUp: () => void,
 *   onToggleMute: () => void,
 *   onRequestEnd: () => void,
 * }} handlers
 */
export function useRoomShortcuts(handlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  const enabled = handlers.enabled;

  useEffect(() => {
    if (!enabled) return;
    let spaceDown = false;

    const onKeyDown = (e) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space' && ref.current.pushToTalk) {
        e.preventDefault(); // no page scroll, no button "click" on focused buttons
        if (!spaceDown && !e.repeat) {
          spaceDown = true;
          ref.current.onPttDown();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (!e.repeat) ref.current.onToggleMute();
      } else if (e.key === 'Escape') {
        ref.current.onRequestEnd();
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space' && spaceDown) {
        spaceDown = false;
        e.preventDefault();
        ref.current.onPttUp();
      }
    };

    // Releasing Space in another window must not leave the mic open.
    const onBlur = () => {
      if (spaceDown) {
        spaceDown = false;
        ref.current.onPttUp();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);
}
