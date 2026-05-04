import { useCallback, useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadBinary } from '../../lib/api';
import type { OrderPhotoRow } from '../../services/orders';
import { cn } from '../../lib/utils';

export type PhotoUploaderProps = {
  value: OrderPhotoRow[];
  onChange: (next: OrderPhotoRow[]) => void;
  maxFiles?: number;
  maxFileSizeMb?: number;
  accept?: string[];
  fieldId?: string;
  disabled?: boolean;
};

export function PhotoUploader({
  value,
  onChange,
  maxFiles = 6,
  maxFileSizeMb = 10,
  accept = ['image/*'],
  fieldId,
  disabled,
}: PhotoUploaderProps) {
  const inputId = useId();
  const [progressByName, setProgressByName] = useState<Record<string, number>>({});

  const maxBytes = maxFileSizeMb * 1024 * 1024;

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled) return;
      const next = [...value];
      for (const file of Array.from(files)) {
        if (next.length >= maxFiles) break;
        if (file.size > maxBytes) continue;
        const key = `${file.name}-${file.size}-${Date.now()}`;
        setProgressByName((p) => ({ ...p, [key]: 10 }));
        try {
          const url = await uploadBinary(file, file.name);
          setProgressByName((p) => ({ ...p, [key]: 100 }));
          next.push({
            url,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            ...(fieldId ? { fieldId } : {}),
          });
          onChange(next);
        } catch (e) {
          console.error(e);
        } finally {
          setProgressByName((p) => {
            const { [key]: _, ...rest } = p;
            return rest;
          });
        }
      }
    },
    [value, onChange, maxFiles, maxBytes, disabled, fieldId],
  );

  const busy = Object.keys(progressByName).length > 0;

  const removeAt = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className={cn(
          'flex flex-col items-center justify-center min-h-[48px] rounded-2xl border-2 border-dashed border-app-border bg-app-bg px-4 py-6 cursor-pointer transition-colors',
          disabled || busy ? 'opacity-50 pointer-events-none' : 'hover:border-neutral-400',
        )}
      >
        <Upload className="w-8 h-8 text-neutral-400 mb-2" aria-hidden />
        <span className="text-[15px] font-bold text-app-text">Add photos</span>
        <span className="text-xs text-neutral-500 mt-1">
          Up to {maxFiles} files · max {maxFileSizeMb} MB each
        </span>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept={accept.join(',')}
          multiple
          disabled={disabled || busy || value.length >= maxFiles}
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <AnimatePresence>
          {value.map((p, idx) => (
            <motion.div
              key={`${p.url}-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative aspect-square rounded-xl overflow-hidden border border-app-border bg-app-card group"
            >
              <img
                src={p.url}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {Object.keys(progressByName).length > 0 && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading…
        </div>
      )}
    </div>
  );
}
