/**
 * State for the text interview loop (backend guide section 7.4). Pure, so it is unit tested
 * without React or the network.
 *
 * status:
 *   idle        interview created, not started (show agenda + Start)
 *   starting    POST /start in flight ("preparing your first question")
 *   active      a question is open; the candidate is typing
 *   submitting  POST /answers in flight ("interviewer is thinking")
 *   ended       finished (closing message) or ended elsewhere
 */

/**
 * @typedef {{ seq: number, questionText: string, answerText: string | null, objectiveKind?: string, isFollowUp?: boolean }} HistoryItem
 * @typedef {{ objectiveIdx: number, objectiveCount: number, objectiveKind: string, questionsAsked: number, elapsedSec: number, remainingSec: number }} Progress
 * @typedef {{ seq: number, objectiveIdx: number, objectiveKind: string, questionText: string, isFollowUp: boolean, askedAt: string }} CurrentTurn
 * @typedef {{
 *   status: 'idle' | 'starting' | 'active' | 'submitting' | 'ended',
 *   progress: Progress | null,
 *   progressSyncedAt: number,
 *   currentTurn: CurrentTurn | null,
 *   history: HistoryItem[],
 *   draft: string,
 *   pending: null | { seq: number, answerText: string, attempt: number, failed: boolean },
 *   closingMessage: string | null,
 *   error: null | { message: string, action: 'start' | 'answer' | null },
 *   notice: string | null,
 * }} TextInterviewState
 */

/** @param {{ status: string }} interview @returns {TextInterviewState} */
export function initialTextInterviewState(interview) {
  const ended = interview.status === 'ended' || interview.status === 'abandoned';
  return {
    status: ended ? 'ended' : interview.status === 'in_progress' ? 'starting' : 'idle',
    progress: null,
    progressSyncedAt: 0,
    currentTurn: null,
    history: [],
    draft: '',
    pending: null,
    closingMessage: null,
    error: null,
    notice: null,
  };
}

/** Merge turns by seq; later entries win. Keeps the list ordered. */
function mergeHistory(history, items) {
  const bySeq = new Map(history.map((h) => [h.seq, h]));
  for (const item of items) bySeq.set(item.seq, { ...bySeq.get(item.seq), ...item });
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

/** Answered turns from GET /turns, trimmed to what the conversation shows. */
function answeredTurns(turns = []) {
  return turns
    .filter((t) => t.answerText)
    .map(({ seq, questionText, answerText, objectiveKind, isFollowUp }) => ({
      seq,
      questionText,
      answerText,
      objectiveKind,
      isFollowUp,
    }));
}

/**
 * @param {TextInterviewState} state
 * @param {any} action
 * @returns {TextInterviewState}
 */
export function textInterviewReducer(state, action) {
  switch (action.type) {
    case 'draft':
      return { ...state, draft: action.value };

    case 'start':
      return { ...state, status: 'starting', error: null, notice: null };

    /** A start/resync response, optionally with answered turns from GET /turns. */
    case 'synced': {
      const { interview, progress, currentTurn, turns = [], notice = null, now } = action;
      const answered = answeredTurns(turns);
      const ended = !currentTurn || interview?.status === 'ended';
      return {
        ...state,
        status: ended ? 'ended' : 'active',
        progress: progress ?? state.progress,
        progressSyncedAt: progress ? now : state.progressSyncedAt,
        currentTurn: currentTurn ?? null,
        history: mergeHistory(state.history, answered),
        pending: null,
        error: null,
        notice,
      };
    }

    /** Past turns from GET /turns, merged in after a restore from the GET snapshot. */
    case 'historyLoaded':
      return { ...state, history: mergeHistory(state.history, answeredTurns(action.turns)) };

    case 'submit':
      return {
        ...state,
        status: 'submitting',
        pending: { seq: action.seq, answerText: action.answerText, attempt: 0, failed: false },
        draft: '',
        error: null,
        notice: null,
      };

    case 'retrying':
      return state.pending
        ? { ...state, pending: { ...state.pending, attempt: action.attempt, failed: false } }
        : state;

    case 'answered': {
      const { response, now } = action;
      const asked = state.currentTurn;
      const answered = asked
        ? [
            {
              seq: asked.seq,
              questionText: asked.questionText,
              answerText: state.pending?.answerText ?? null,
              objectiveKind: asked.objectiveKind,
              isFollowUp: asked.isFollowUp,
            },
          ]
        : [];
      const next = response.currentTurn ?? null;
      return {
        ...state,
        status: next ? 'active' : 'ended',
        progress: response.progress ?? state.progress,
        progressSyncedAt: response.progress ? now : state.progressSyncedAt,
        currentTurn: next,
        history: mergeHistory(state.history, answered),
        pending: null,
        closingMessage: next ? null : (response.closingMessage ?? null),
      };
    }

    /** Transient failure after retries: keep the answer so "Retry" resends the same seq + text. */
    case 'answerStuck':
      return {
        ...state,
        status: 'active',
        pending: state.pending ? { ...state.pending, failed: true } : null,
        error: { message: action.message, action: 'answer' },
      };

    /** The request itself must change (400, 429...): give the text back to the candidate. */
    case 'answerRejected':
      return {
        ...state,
        status: 'active',
        draft: state.pending?.answerText ?? state.draft,
        pending: null,
        error: { message: action.message, action: null },
      };

    case 'startFailed':
      return {
        ...state,
        status: state.currentTurn ? 'active' : 'idle',
        error: { message: action.message, action: 'start' },
      };

    /** Seq conflict: the question moved on. Resync and hand the text back. */
    case 'resynced': {
      const synced = textInterviewReducer(state, { ...action, type: 'synced' });
      return { ...synced, draft: state.pending?.answerText ?? state.draft };
    }

    case 'ended':
      return { ...state, status: 'ended', pending: null, currentTurn: null };

    /** The server says the interview was never started: back to the agenda and Start button. */
    case 'notStarted':
      return {
        ...state,
        status: 'idle',
        currentTurn: null,
        progress: null,
        pending: null,
        draft: state.pending?.answerText ?? state.draft,
      };

    case 'dismissError':
      return { ...state, error: null, notice: null };

    default:
      return state;
  }
}

/**
 * Seconds left on the interview clock, run locally from the last server sync.
 * @param {Progress | null} progress
 * @param {number} syncedAt epoch ms of the response that carried `progress`
 * @param {number} now epoch ms
 */
export function remainingSeconds(progress, syncedAt, now) {
  if (!progress) return null;
  return Math.max(0, Math.round(progress.remainingSec - (now - syncedAt) / 1000));
}
