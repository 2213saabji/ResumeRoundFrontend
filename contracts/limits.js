/**
 * Plain limits and checks shared by forms and UI. No zod here, so pages that only need a
 * number (e.g. the interview room) do not pull the schema library into their bundle.
 */

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const RESUME_EXTENSIONS = ['.pdf', '.docx'];

export const SKILL_TAG_MAX = 60;
export const SKILL_TAGS_MAX = 50;
export const PROJECTS_MAX = 15;
export const SCALE_SIGNALS_MAX = 20;

export const ANSWER_MAX_CHARS = 5000;

/**
 * Client-side check before upload. The server re-checks by file content.
 * @param {File} file
 * @returns {string | null} a user-facing error, or null when the file is acceptable
 */
export function validateResumeFile(file) {
  if (!file) return 'Choose a file to upload.';
  const name = file.name.toLowerCase();
  const extOk = RESUME_EXTENSIONS.some((ext) => name.endsWith(ext));
  const typeOk = !file.type || RESUME_MIME_TYPES.includes(file.type);
  if (!extOk || !typeOk) return 'Upload a PDF or DOCX file.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > RESUME_MAX_BYTES) return 'The file is larger than 5 MB.';
  return null;
}
