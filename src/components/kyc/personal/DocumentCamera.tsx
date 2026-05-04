import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, ImagePlus, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type DocumentCameraVariant = 'id' | 'selfie';

type Props = {
  variant: DocumentCameraVariant;
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
  className?: string;
};

export function DocumentCamera({ variant, onCapture, disabled, className }: Props) {
  const camRef = useRef<Webcam>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [camError, setCamError] = useState(false);

  const capture = useCallback(() => {
    const shot = camRef.current?.getScreenshot();
    if (!shot) return;
    fetch(shot)
      .then((r) => r.blob())
      .then((b) => onCapture(b))
      .catch(() => {});
  }, [onCapture]);

  const videoConstraints: MediaTrackConstraints = {
    facingMode: variant === 'selfie' ? 'user' : 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  if (camError || !cameraOn) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-app-border bg-app-bg p-4 space-y-2', className)}>
        {variant === 'selfie' ? (
          <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
            Camera unavailable — upload is allowed here only as a fallback (live capture is preferred for selfies).
          </p>
        ) : null}
        <label className="flex flex-col items-center gap-2 cursor-pointer">
          <ImagePlus className="w-8 h-8 text-neutral-400" aria-hidden />
          <span className="text-xs font-bold text-app-text">
            {variant === 'selfie' ? 'Upload selfie' : 'Upload photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            capture={variant === 'selfie' ? undefined : 'environment'}
            aria-label={variant === 'selfie' ? 'Upload selfie image' : 'Upload document image'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCapture(f);
              e.target.value = '';
            }}
          />
        </label>
        {!camError ? (
          <button
            type="button"
            className="text-[10px] font-bold text-blue-600 uppercase tracking-wide"
            onClick={() => {
              setCamError(false);
              setCameraOn(true);
            }}
            aria-label="Try camera again"
          >
            Try camera again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-app-border bg-black aspect-[4/3] max-h-64 mx-auto',
          variant === 'selfie' && 'rounded-full aspect-square max-w-64 max-h-64 border-2 border-emerald-500/50',
        )}
      >
        <Webcam
          ref={camRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={videoConstraints}
          onUserMediaError={() => {
            setCamError(true);
            setCameraOn(false);
          }}
          className="h-full w-full object-cover"
          aria-label={variant === 'selfie' ? 'Selfie camera preview' : 'Document camera preview'}
        />
        {variant === 'selfie' ? (
          <div
            className="pointer-events-none absolute inset-8 rounded-full border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={capture}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-bold disabled:opacity-50"
          aria-label={variant === 'selfie' ? 'Capture selfie' : 'Capture document photo'}
        >
          <Camera className="w-4 h-4" aria-hidden />
          Capture
        </button>
        {variant === 'id' ? (
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border text-sm font-bold cursor-pointer">
            <RefreshCw className="w-4 h-4" aria-hidden />
            Upload file
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              capture="environment"
              aria-label="Upload document from files"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCapture(f);
                e.target.value = '';
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
