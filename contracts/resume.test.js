import { describe, expect, it } from 'vitest';
import { RESUME_MAX_BYTES, validateResumeFile } from './limits';

const file = (name, type, size) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('validateResumeFile', () => {
  it('accepts PDF and DOCX up to 5 MB', () => {
    expect(validateResumeFile(file('cv.pdf', 'application/pdf', 1000))).toBeNull();
    expect(
      validateResumeFile(
        file(
          'cv.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          RESUME_MAX_BYTES,
        ),
      ),
    ).toBeNull();
  });

  it('accepts a correct extension when the browser reports no type', () => {
    expect(validateResumeFile(file('CV.PDF', '', 1000))).toBeNull();
  });

  it('rejects other types, empty and oversized files', () => {
    expect(validateResumeFile(file('cv.doc', 'application/msword', 1000))).toMatch(/PDF or DOCX/);
    expect(validateResumeFile(file('cv.pdf', 'image/png', 1000))).toMatch(/PDF or DOCX/);
    expect(validateResumeFile(file('cv.pdf', 'application/pdf', 0))).toMatch(/empty/);
    expect(validateResumeFile(file('cv.pdf', 'application/pdf', RESUME_MAX_BYTES + 1))).toMatch(
      /5 MB/,
    );
  });
});
