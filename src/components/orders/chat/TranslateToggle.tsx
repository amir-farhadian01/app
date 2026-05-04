type Props = {
  enabled: boolean;
  language: string;
  onToggle: (next: boolean) => void;
};

export function TranslateToggle({ enabled, language, onToggle }: Props) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-app-border bg-app-card px-3 py-2">
      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
        Auto-translate incoming to {language.toUpperCase()}
      </span>
      <button
        type="button"
        aria-label="Toggle auto translate"
        onClick={() => onToggle(!enabled)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

