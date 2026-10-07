/**
 * Query-key factories, one per resource. Shared here because several features read the same
 * resource (e.g. the interview is used by setup, room and report).
 */

export const meKeys = {
  all: ['me'],
};

export const resumeKeys = {
  all: ['resumes'],
  detail: (/** @type {string} */ id) => ['resumes', id],
};

export const profileKeys = {
  current: ['profiles', 'current'],
};

export const interviewKeys = {
  all: ['interviews'],
  detail: (/** @type {string} */ id) => ['interviews', id],
  turns: (/** @type {string} */ id) => ['interviews', id, 'turns'],
  report: (/** @type {string} */ id) => ['interviews', id, 'report'],
};

export const progressKeys = {
  all: ['progress'],
};
