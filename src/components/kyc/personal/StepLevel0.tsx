import React, { useCallback, useEffect, useState } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';
import { kycPersonalApi, type Level0Me } from './kycPersonalApi';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../lib/AuthContext';

type Props = {
  level0: Level0Me | null;
  onUpdated: (next: Level0Me) => void;
  onContinue: () => void;
  canContinue: boolean;
};

export function StepLevel0({ level0, onUpdated, onContinue, canContinue }: Props) {
  const { refreshUser } = useAuth();
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [address, setAddress] = useState(level0?.address ?? '');
  const [savingAddr, setSavingAddr] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);

  useEffect(() => {
    if (level0?.address != null) setAddress(level0.address);
  }, [level0?.address]);

  const persistAddress = useCallback(
    async (value: string) => {
      const t = value.trim();
      if (t.length < 5 || t.length > 300) return;
      setSavingAddr(true);
      try {
        await kycPersonalApi.postLevel0Address(t);
        const me = await kycPersonalApi.getLevel0Me();
        onUpdated(me);
      } finally {
        setSavingAddr(false);
      }
    },
    [onUpdated],
  );

  const onAddressBlur = () => {
    if (address.trim() && address !== level0?.address) void persistAddress(address);
  };

  const startEmail = async () => {
    setEmailBusy(true);
    try {
      const r = await kycPersonalApi.startEmailVerify();
      if (r.alreadyVerified) {
        const me = await kycPersonalApi.getLevel0Me();
        onUpdated(me);
        return;
      }
      setShowEmailInput(true);
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmail = async () => {
    if (!emailToken.trim()) return;
    setEmailBusy(true);
    try {
      await kycPersonalApi.confirmEmailVerify(emailToken.trim());
      const me = await kycPersonalApi.getLevel0Me();
      onUpdated(me);
      await refreshUser();
      setShowEmailInput(false);
      setEmailToken('');
    } finally {
      setEmailBusy(false);
    }
  };

  const startPhone = async () => {
    setPhoneBusy(true);
    setPhoneHint(null);
    try {
      const r = await kycPersonalApi.startPhoneVerify();
      if (import.meta.env.DEV && r.debugCode) setPhoneHint(`Dev code: ${r.debugCode}`);
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmPhone = async () => {
    if (!/^\d{6}$/.test(phoneCode)) return;
    setPhoneBusy(true);
    try {
      await kycPersonalApi.confirmPhoneVerify(phoneCode);
      const me = await kycPersonalApi.getLevel0Me();
      onUpdated(me);
      setPhoneCode('');
      setPhoneHint(null);
    } finally {
      setPhoneBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Step 1 · Contact & address</p>

      <div className="space-y-2">
        <label className="text-xs font-bold text-app-text flex items-center gap-2">
          <MapPin className="w-4 h-4 text-neutral-400" aria-hidden />
          Address
        </label>
        {mapsKey ? (
          <Autocomplete
            apiKey={mapsKey}
            value={address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
            onBlur={onAddressBlur}
            onPlaceSelected={(place) => {
              const v = place.formatted_address || '';
              setAddress(v);
              void persistAddress(v);
            }}
            options={{ types: ['geocode'] }}
            className="w-full rounded-xl border border-app-border bg-app-input px-3 py-3 text-sm text-app-text"
            aria-label="Street address"
          />
        ) : (
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={onAddressBlur}
            className="w-full rounded-xl border border-app-border bg-app-input px-3 py-3 text-sm text-app-text"
            placeholder="Full address"
            aria-label="Street address"
          />
        )}
        {mapsKey ? (
          <button
            type="button"
            onClick={() => void persistAddress(address)}
            disabled={savingAddr || address.trim().length < 5}
            className="text-xs font-bold text-blue-600 disabled:opacity-50"
            aria-label="Save address"
          >
            {savingAddr ? 'Saving…' : 'Save address'}
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-app-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-app-text flex items-center gap-2">
            <Mail className="w-4 h-4 text-neutral-400" aria-hidden />
            Email verified
          </span>
          {level0?.emailVerified ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-label="Email verified" />
          ) : (
            <button
              type="button"
              onClick={startEmail}
              disabled={emailBusy}
              className="text-xs font-bold text-blue-600 disabled:opacity-50"
              aria-label="Send verification email"
            >
              {emailBusy ? '…' : 'Send verification email'}
            </button>
          )}
        </div>
        {showEmailInput && !level0?.emailVerified ? (
          <div className="flex flex-col gap-2">
            <input
              value={emailToken}
              onChange={(e) => setEmailToken(e.target.value)}
              placeholder="Paste token from email (dev: any token)"
              className="w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm"
              aria-label="Email verification token"
            />
            <button
              type="button"
              onClick={confirmEmail}
              disabled={emailBusy || !emailToken.trim()}
              className="py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold disabled:opacity-50"
              aria-label="Confirm email verification"
            >
              Confirm email
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-app-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-app-text flex items-center gap-2">
            <Phone className="w-4 h-4 text-neutral-400" aria-hidden />
            Phone verified
          </span>
          {level0?.phoneVerified ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-label="Phone verified" />
          ) : (
            <button
              type="button"
              onClick={startPhone}
              disabled={phoneBusy}
              className="text-xs font-bold text-blue-600 disabled:opacity-50"
              aria-label="Send phone verification code"
            >
              Send code
            </button>
          )}
        </div>
        {phoneHint ? <p className="text-[10px] text-neutral-500">{phoneHint}</p> : null}
        {!level0?.phoneVerified ? (
          <div className="flex flex-col gap-2">
            <input
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              className="w-full rounded-xl border border-app-border bg-app-input px-3 py-2 text-sm tracking-widest"
              aria-label="Phone verification code"
            />
            <button
              type="button"
              onClick={confirmPhone}
              disabled={phoneBusy || phoneCode.length !== 6}
              className="py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold disabled:opacity-50"
              aria-label="Confirm phone code"
            >
              Confirm phone
            </button>
          </div>
        ) : null}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          title={
            !canContinue
              ? !level0?.emailVerified
                ? 'Verify your email first'
                : !level0?.phoneVerified
                  ? 'Verify your phone first'
                  : !level0?.address?.trim()
                    ? 'Add your address'
                    : 'Complete all checks'
              : undefined
          }
          className={cn(
            'w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2',
            canContinue
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed',
          )}
          aria-label="Continue to identity step"
        >
          Continue to Identity
        </button>
      </div>
    </div>
  );
}
