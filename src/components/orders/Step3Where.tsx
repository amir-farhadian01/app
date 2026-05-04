import Autocomplete from 'react-google-autocomplete';
import { MapPin } from 'lucide-react';

export type Step3WhereProps = {
  address: string;
  savedAddress?: string | null;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
};

export function Step3Where({ address, savedAddress, onChange }: Step3WhereProps) {
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  return (
    <div className="space-y-4">
      <p className="text-neutral-600 dark:text-neutral-400 text-[15px]">
        Where should the provider go? We’ll only share this with the provider you book.
      </p>
      {savedAddress ? (
        <button
          type="button"
          className="w-full min-h-[48px] text-left text-sm font-bold text-blue-600 dark:text-blue-400 py-2"
          onClick={() => onChange(savedAddress, null, null)}
        >
          Use my saved address
        </button>
      ) : null}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-app-text">
          <MapPin className="w-4 h-4 text-neutral-400" />
          Address
        </label>
        {mapsKey ? (
          <Autocomplete
            apiKey={mapsKey}
            value={address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value, null, null)}
            onPlaceSelected={(place) => {
              const formatted = place.formatted_address || '';
              const lat = place.geometry?.location?.lat();
              const lng = place.geometry?.location?.lng();
              onChange(
                formatted,
                typeof lat === 'number' ? lat : null,
                typeof lng === 'number' ? lng : null,
              );
            }}
            options={{ types: ['geocode'] }}
            className="w-full min-h-[48px] rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
          />
        ) : (
          <textarea
            value={address}
            onChange={(e) => onChange(e.target.value, null, null)}
            rows={4}
            className="w-full rounded-2xl border border-app-border bg-app-input px-4 py-3 text-[15px] text-app-text"
            placeholder="Street, city, postal code"
          />
        )}
      </div>
      {savedAddress ? (
        <p className="text-xs text-neutral-500">
          Need something else? Edit the field above —{' '}
          <span className="font-bold">use a different address</span> anytime.
        </p>
      ) : null}
    </div>
  );
}
