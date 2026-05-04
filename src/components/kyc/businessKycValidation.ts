import type { BusinessKycFormV1 } from '../../../lib/kycTypes';
import {
  validateBusinessKycAnswers as validateCore,
  type BusinessKycUploadRow,
} from '../../../lib/kycBusinessValidate';

/** Maps preview `File[]` to upload metadata for shared validation (browser). */
export function filesRecordToUploads(files: Record<string, File[]>): BusinessKycUploadRow[] {
  const out: BusinessKycUploadRow[] = [];
  for (const [fieldId, list] of Object.entries(files)) {
    for (const f of list ?? []) {
      out.push({
        fieldId,
        url: '',
        fileName: f.name,
        mimeType: f.type || 'application/octet-stream',
        sizeBytes: f.size,
      });
    }
  }
  return out;
}

/**
 * Validates business KYC using local `File` blobs (admin preview + client form).
 */
export function validateBusinessKycAnswers(
  schema: BusinessKycFormV1,
  answers: Record<string, unknown>,
  files: Record<string, File[]>,
  categories: string[],
): { valid: boolean; errors: Record<string, string> } {
  return validateCore(schema, answers, filesRecordToUploads(files), categories);
}
