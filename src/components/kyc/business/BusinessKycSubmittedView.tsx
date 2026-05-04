import React from 'react';
import { BusinessKycFormRenderer, type RemoteFileEntry } from '../BusinessKycFormRenderer';
import type { BusinessKycFormV1 } from '../../../../lib/kycTypes';
import type { BusinessSubmissionDto } from './kycBusinessApi';
import { cn } from '../../../lib/utils';

const focusRing = 'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

function parseRecord(x: unknown): Record<string, unknown> {
  if (x && typeof x === 'object' && !Array.isArray(x)) return x as Record<string, unknown>;
  return {};
}

function uploadsToRemote(uploads: unknown): Record<string, RemoteFileEntry[]> {
  if (!Array.isArray(uploads)) return {};
  const m: Record<string, RemoteFileEntry[]> = {};
  for (const u of uploads) {
    if (!u || typeof u !== 'object') continue;
    const r = u as Record<string, unknown>;
    const fid = typeof r.fieldId === 'string' ? r.fieldId : '';
    if (!fid) continue;
    if (!m[fid]) m[fid] = [];
    m[fid].push({
      url: String(r.url ?? ''),
      fileName: String(r.fileName ?? 'file'),
      mimeType: typeof r.mimeType === 'string' ? r.mimeType : undefined,
      sizeBytes: typeof r.sizeBytes === 'number' ? r.sizeBytes : undefined,
    });
  }
  return m;
}

type Props = {
  mode: 'pending' | 'approved' | 'rejected';
  schema: BusinessKycFormV1;
  submission: BusinessSubmissionDto;
  fakeCategories: string[];
  onUpdateResubmit?: () => void;
  updateBusy?: boolean;
};

export function BusinessKycSubmittedView({
  mode,
  schema,
  submission,
  fakeCategories,
  onUpdateResubmit,
  updateBusy,
}: Props) {
  const values = parseRecord(submission.answers);
  const remoteFiles = uploadsToRemote(submission.uploads);

  return (
    <div className="space-y-4">
      {mode === 'pending' ? (
        <div
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-app-text"
          role="status"
          aria-label="Under review"
        >
          Under review. We typically respond within a few business days.
        </div>
      ) : null}
      {mode === 'approved' ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 space-y-3">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100" role="status">
            Business KYC approved for this schema version.
          </p>
          {onUpdateResubmit ? (
            <button
              type="button"
              disabled={updateBusy}
              onClick={onUpdateResubmit}
              className={cn(
                'px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50',
                focusRing,
              )}
              aria-label="Update and resubmit business KYC"
            >
              {updateBusy ? 'Preparing…' : 'Update & resubmit'}
            </button>
          ) : null}
        </div>
      ) : null}
      {mode === 'rejected' ? (
        <div
          className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-app-text"
          role="alert"
        >
          This submission was not accepted. Use the form below after you start a new draft from the status card.
        </div>
      ) : null}

      <BusinessKycFormRenderer
        schema={schema}
        values={values}
        files={{}}
        remoteFiles={remoteFiles}
        onChange={() => {}}
        onFileChange={() => {}}
        errors={{}}
        readOnly
        fakeCategories={fakeCategories}
      />
    </div>
  );
}
