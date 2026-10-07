'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState, useSyncExternalStore } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Progress } from '@/components/ui/progress';
import { validateResumeFile } from '@/contracts/limits';
import { newIdempotencyKey, profilesApi, resumesApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { profileKeys } from '@/lib/api/query-keys';
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage';
import { DropZone } from './drop-zone';
import { ParseStatus } from './parse-status';

const UPLOAD_ERRORS = {
  PAYLOAD_TOO_LARGE: 'The file is larger than 5 MB.',
  UNSUPPORTED_MEDIA_TYPE: 'This is not a valid PDF or DOCX file.',
  BAD_REQUEST: 'No file was received. Please choose the file again.',
};

const noopSubscribe = () => () => {};

export function ResumeUpload() {
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [fileError, setFileError] = useState(/** @type {string | null} */ (null));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState(/** @type {string | null} */ (null));
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Set after an upload from this page; the parse status then auto-continues to the profile.
  const [uploadedId, setUploadedId] = useState(/** @type {string | null} */ (null));
  // Same key on retries of the same file, so a dropped connection never creates a duplicate.
  const idempotencyKey = useRef(/** @type {string | null} */ (null));

  // The id of the last upload in this browser (there is no "list my resumes" endpoint).
  const storedId = useSyncExternalStore(
    noopSubscribe,
    () => readJson(STORAGE_KEYS.latestResumeId, null),
    () => null,
  );
  const [dismissedId, setDismissedId] = useState(/** @type {string | null} */ (null));
  const trackedId = uploadedId ?? (storedId !== dismissedId ? storedId : null);

  const { data: profile } = useQuery({
    queryKey: profileKeys.current,
    queryFn: profilesApi.getCurrent,
    staleTime: 60_000,
  });

  function chooseFile(f) {
    setUploadError(null);
    const problem = validateResumeFile(f);
    setFileError(problem);
    setFile(problem ? null : f);
    idempotencyKey.current = problem ? null : newIdempotencyKey();
  }

  function requestUpload() {
    if (!file) return;
    if (profile) setConfirmOpen(true);
    else startUpload();
  }

  async function startUpload() {
    setConfirmOpen(false);
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setProgress(0);
    try {
      const resume = await resumesApi.upload(file, {
        idempotencyKey: idempotencyKey.current ?? newIdempotencyKey(),
        onProgress: setProgress,
      });
      writeJson(STORAGE_KEYS.latestResumeId, resume.id);
      setUploadedId(resume.id);
      setFile(null);
      idempotencyKey.current = null;
    } catch (err) {
      const mapped = err instanceof ApiError ? UPLOAD_ERRORS[err.code] : null;
      setUploadError(mapped ?? errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function reupload() {
    setDismissedId(trackedId);
    setUploadedId(null);
    writeJson(STORAGE_KEYS.latestResumeId, null);
  }

  const showTracker = !!trackedId && !file && !uploading;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={profile ? undefined : 'Step 2 of 3'}
        title={profile ? 'Your resume' : 'Upload your resume'}
        description="We read your skills and projects so the interviewer can ask about the work you actually did. You can correct anything we get wrong on the next screen."
      />

      <div className="flex flex-col gap-6">
        {showTracker ? (
          <ParseStatus
            key={trackedId}
            resumeId={trackedId}
            autoContinue={trackedId === uploadedId}
            onReupload={reupload}
          />
        ) : null}

        {profile && !uploadedId ? (
          <Alert
            tone="info"
            title="You already have a profile"
            action={
              <Link href="/profile" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                View profile
              </Link>
            }
          >
            Uploading a new resume builds a fresh profile and replaces the current one, including
            your corrections.
          </Alert>
        ) : null}

        <Card className="flex flex-col gap-4">
          <DropZone onFile={chooseFile} disabled={uploading} file={file} />
          {fileError ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {fileError}
            </p>
          ) : null}
          {uploadError ? <Alert tone="danger">{uploadError}</Alert> : null}
          {uploading ? <Progress value={progress} label="Upload progress" /> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-fg-subtle">
              Your resume is stored encrypted and is never used to train models without your
              consent.
            </p>
            <Button onClick={requestUpload} disabled={!file} loading={uploading}>
              {uploading
                ? `Uploading ${Math.round(progress * 100)}%`
                : uploadError
                  ? 'Retry upload'
                  : 'Upload resume'}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={startUpload}
        title="Replace your current profile?"
        description="A new resume creates a new profile. Any corrections you made to skills and projects will be lost."
        confirmLabel="Upload and replace"
        destructive
      />
    </div>
  );
}
